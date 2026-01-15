import { log, error } from "../lib/logger.js";
import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { authMiddleware } from '../middleware/auth.js';
import { query, queryOne, queryAll, execute } from '../lib/db.js';
import {
  calculateHealthLabel,
  calculateNextBestAction,
  calculateLeadScore,
  HEALTH_LABEL_CONFIG,
  ACTION_TYPE_CONFIG
} from '../lib/leadScoring.js';

const router = express.Router();

// Initialiser le client Anthropic
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || 'sk-ant-dummy-key',
});

/**
 * Actions que l'IA peut exécuter
 */
const AVAILABLE_ACTIONS = {
  UPDATE_STATUS: 'update_status',
  CREATE_TASK: 'create_task',
  COMPLETE_TASK: 'complete_task',
  SEND_EMAIL: 'send_email',
  ADD_NOTE: 'add_note',
  ASSIGN_LEAD: 'assign_lead',
  GET_LEAD_INFO: 'get_lead_info',
  GET_LEAD_HISTORY: 'get_lead_history',
  GENERATE_EMAIL: 'generate_email',
  GENERATE_MESSAGE: 'generate_message',
  UPDATE_FIELD: 'update_field'
};

// ========== FONCTIONS D'ACCÈS AUX DONNÉES UTILISATEUR ==========

/**
 * Récupère les tâches/follow-ups de l'utilisateur
 */
async function getUserTasks(userId, tenantId, filter = 'all') {
  try {
    let whereClause = 'WHERE f.tenant_id = $1';
    const params = [tenantId];
    let paramIndex = 2;

    // Filtrer par assignation ou création
    whereClause += ` AND (f.assigned_to = $${paramIndex} OR f.created_by = $${paramIndex})`;
    params.push(userId);
    paramIndex++;

    // Filtres additionnels
    if (filter === 'pending' || filter === 'all') {
      whereClause += ` AND f.status IN ('pending', 'in_progress')`;
    } else if (filter === 'today') {
      whereClause += ` AND f.due_date::date = CURRENT_DATE AND f.status != 'completed'`;
    } else if (filter === 'overdue') {
      whereClause += ` AND f.due_date < NOW() AND f.status != 'completed'`;
    } else if (filter === 'completed') {
      whereClause += ` AND f.status = 'completed'`;
    }

    const { rows } = await query(
      `SELECT f.*,
        l.company_name as lead_name,
        l.email as lead_email,
        l.phone as lead_phone,
        u.first_name || ' ' || u.last_name as assigned_to_name
       FROM follow_ups f
       LEFT JOIN leads l ON f.lead_id = l.id
       LEFT JOIN users u ON f.assigned_to = u.id
       ${whereClause}
       ORDER BY
         CASE WHEN f.due_date < NOW() THEN 0 ELSE 1 END,
         f.due_date ASC NULLS LAST,
         f.priority DESC NULLS LAST
       LIMIT 50`,
      params
    );

    return rows || [];
  } catch (e) {
    log('⚠️ Erreur récupération tâches:', e.message);
    return [];
  }
}

/**
 * Récupère les statistiques du jour pour l'utilisateur
 */
async function getUserDailyStats(userId, tenantId) {
  const stats = {
    leads_today: 0,
    leads_total: 0,
    tasks_pending: 0,
    tasks_overdue: 0,
    tasks_completed_today: 0,
    emails_sent_today: 0,
    calls_today: 0,
    hot_leads: 0,
    warm_leads: 0,
    cold_leads: 0
  };

  try {
    // Leads créés aujourd'hui
    const leadsToday = await queryOne(
      `SELECT COUNT(*) as count FROM leads WHERE tenant_id = $1 AND created_at::date = CURRENT_DATE`,
      [tenantId]
    );
    stats.leads_today = parseInt(leadsToday?.count) || 0;

    // Total leads
    const leadsTotal = await queryOne(
      `SELECT COUNT(*) as count FROM leads WHERE tenant_id = $1`,
      [tenantId]
    );
    stats.leads_total = parseInt(leadsTotal?.count) || 0;

    // Tâches en attente
    const tasksPending = await queryOne(
      `SELECT COUNT(*) as count FROM follow_ups
       WHERE tenant_id = $1 AND status IN ('pending', 'in_progress')
       AND (assigned_to = $2 OR created_by = $2)`,
      [tenantId, userId]
    );
    stats.tasks_pending = parseInt(tasksPending?.count) || 0;

    // Tâches en retard
    const tasksOverdue = await queryOne(
      `SELECT COUNT(*) as count FROM follow_ups
       WHERE tenant_id = $1 AND status != 'completed' AND due_date < NOW()
       AND (assigned_to = $2 OR created_by = $2)`,
      [tenantId, userId]
    );
    stats.tasks_overdue = parseInt(tasksOverdue?.count) || 0;

    // Tâches complétées aujourd'hui
    const tasksCompleted = await queryOne(
      `SELECT COUNT(*) as count FROM follow_ups
       WHERE tenant_id = $1 AND status = 'completed' AND completed_at::date = CURRENT_DATE
       AND (assigned_to = $2 OR created_by = $2)`,
      [tenantId, userId]
    );
    stats.tasks_completed_today = parseInt(tasksCompleted?.count) || 0;

    // Leads par health label
    const healthStats = await query(
      `SELECT health_label, COUNT(*) as count FROM leads
       WHERE tenant_id = $1 AND status NOT IN ('gagne', 'perdu')
       GROUP BY health_label`,
      [tenantId]
    );
    for (const row of healthStats.rows || []) {
      if (row.health_label === 'hot') stats.hot_leads = parseInt(row.count) || 0;
      if (row.health_label === 'warm') stats.warm_leads = parseInt(row.count) || 0;
      if (row.health_label === 'cold') stats.cold_leads = parseInt(row.count) || 0;
    }

  } catch (e) {
    log('⚠️ Erreur récupération stats:', e.message);
  }

  return stats;
}

/**
 * Récupère les leads chauds (hot) de l'utilisateur
 */
async function getHotLeads(tenantId, limit = 10) {
  try {
    const { rows } = await query(
      `SELECT id, company_name, contact_name, email, phone, sector, city,
              score, health_label, status, next_best_action, created_at
       FROM leads
       WHERE tenant_id = $1
         AND (health_label = 'hot' OR score >= 70)
         AND status NOT IN ('gagne', 'perdu')
       ORDER BY score DESC, last_activity_at DESC NULLS LAST
       LIMIT $2`,
      [tenantId, limit]
    );
    return rows || [];
  } catch (e) {
    log('⚠️ Erreur récupération hot leads:', e.message);
    return [];
  }
}

/**
 * Recherche des leads par critères
 */
async function searchLeads(tenantId, searchTerm, limit = 20) {
  try {
    const { rows } = await query(
      `SELECT id, company_name, contact_name, email, phone, sector, city, score, health_label, status
       FROM leads
       WHERE tenant_id = $1
         AND (company_name ILIKE $2 OR contact_name ILIKE $2 OR email ILIKE $2 OR phone ILIKE $2)
       ORDER BY score DESC
       LIMIT $3`,
      [tenantId, `%${searchTerm}%`, limit]
    );
    return rows || [];
  } catch (e) {
    log('⚠️ Erreur recherche leads:', e.message);
    return [];
  }
}

/**
 * Récupère les informations détaillées d'un lead
 * @param {string} leadId - ID du lead
 * @param {string} tenantId - ID du tenant
 */
async function getLeadDetails(leadId, tenantId) {
  // Requête simplifiée - sans les sous-requêtes qui peuvent échouer si tables manquantes
  const lead = await queryOne(
    `SELECT l.*,
      ld.name as database_name,
      u.first_name || ' ' || u.last_name as assigned_to_name
     FROM leads l
     LEFT JOIN lead_databases ld ON l.database_id = ld.id
     LEFT JOIN users u ON l.assigned_to = u.id
     WHERE l.id = $1 AND l.tenant_id = $2`,
    [leadId, tenantId]
  );

  if (!lead) return null;

  // Essayer de récupérer les stats d'interaction (optionnel)
  let emailOpens = 0, emailClicks = 0, emailsSent = 0, totalCalls = 0;
  let lastEmailInteraction = null, lastCall = null;

  try {
    // Stats email
    const emailStats = await queryOne(
      `SELECT
        COALESCE(SUM(CASE WHEN event_type = 'open' THEN 1 ELSE 0 END), 0) as opens,
        COALESCE(SUM(CASE WHEN event_type = 'click' THEN 1 ELSE 0 END), 0) as clicks,
        MAX(created_at) as last_interaction
       FROM email_events WHERE lead_id = $1`,
      [leadId]
    );
    if (emailStats) {
      emailOpens = parseInt(emailStats.opens) || 0;
      emailClicks = parseInt(emailStats.clicks) || 0;
      lastEmailInteraction = emailStats.last_interaction;
    }
  } catch (e) { /* Table email_events n'existe peut-être pas */ }

  try {
    // Emails envoyés
    const sentStats = await queryOne(
      `SELECT COUNT(*) as count FROM email_queue WHERE lead_id = $1 AND status = 'sent'`,
      [leadId]
    );
    if (sentStats) {
      emailsSent = parseInt(sentStats.count) || 0;
    }
  } catch (e) { /* Table email_queue n'existe peut-être pas */ }

  try {
    // Stats appels
    const callStats = await queryOne(
      `SELECT COUNT(*) as count, MAX(created_at) as last_call FROM call_logs WHERE lead_id = $1`,
      [leadId]
    );
    if (callStats) {
      totalCalls = parseInt(callStats.count) || 0;
      lastCall = callStats.last_call;
    }
  } catch (e) { /* Table call_logs n'existe peut-être pas */ }

  // Calculer le score et le health label
  const interactions = {
    opens: emailOpens,
    clicks: emailClicks,
    emails_sent: emailsSent
  };

  const callHistory = {
    total_calls: totalCalls
  };

  // Utiliser le score existant si disponible, sinon calculer
  let score = lead.score || 0;
  let grade = lead.score_grade || 'F';
  let breakdown = {};
  let healthLabel = lead.health_label || 'new';
  let nextAction = null;

  try {
    const result = calculateLeadScore(lead, interactions);
    score = result.score;
    grade = result.grade;
    breakdown = result.breakdown;
    healthLabel = calculateHealthLabel(lead, interactions);
    nextAction = calculateNextBestAction(lead, interactions, callHistory);
  } catch (e) {
    log('⚠️ Erreur calcul score (utilise valeurs existantes):', e.message);
  }

  return {
    ...lead,
    email_opens: emailOpens,
    email_clicks: emailClicks,
    emails_sent: emailsSent,
    total_calls: totalCalls,
    last_email_interaction: lastEmailInteraction,
    last_call: lastCall,
    score,
    grade,
    healthLabel,
    healthLabelConfig: HEALTH_LABEL_CONFIG[healthLabel],
    nextAction,
    breakdown
  };
}

/**
 * Récupère l'historique d'un lead
 * @param {string} leadId - ID du lead
 * @param {string} tenantId - ID du tenant
 */
async function getLeadHistory(leadId, tenantId) {
  let emails = [], calls = [], notes = [];

  // Emails envoyés (optionnel)
  try {
    const { rows } = await query(
      `SELECT 'email' as type, subject, created_at, status
       FROM email_queue
       WHERE lead_id = $1 AND tenant_id = $2
       ORDER BY created_at DESC
       LIMIT 10`,
      [leadId, tenantId]
    );
    emails = rows || [];
  } catch (e) { /* Table email_queue n'existe peut-être pas */ }

  // Appels (optionnel)
  try {
    const { rows } = await query(
      `SELECT 'call' as type, outcome, notes, duration_seconds, created_at
       FROM call_logs
       WHERE lead_id = $1
       ORDER BY created_at DESC
       LIMIT 10`,
      [leadId]
    );
    calls = rows || [];
  } catch (e) { /* Table call_logs n'existe peut-être pas */ }

  // Notes (optionnel)
  try {
    const { rows } = await query(
      `SELECT 'note' as type, content, created_at,
         u.first_name || ' ' || u.last_name as author
       FROM lead_notes ln
       LEFT JOIN users u ON ln.created_by = u.id
       WHERE ln.lead_id = $1
       ORDER BY ln.created_at DESC
       LIMIT 10`,
      [leadId]
    );
    notes = rows || [];
  } catch (e) { /* Table lead_notes n'existe peut-être pas */ }

  // Fusionner et trier par date
  const history = [...emails, ...calls, ...notes]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 20);

  return history;
}

/**
 * Exécute une action sur un lead
 * @param {string} action - Type d'action
 * @param {object} params - Paramètres de l'action
 * @param {string} userId - ID de l'utilisateur
 * @param {string} tenantId - ID du tenant
 */
async function executeAction(action, params, userId, tenantId) {
  log(`🤖 ASEFI exécute action: ${action}`, params);

  switch (action) {
    case AVAILABLE_ACTIONS.UPDATE_STATUS: {
      const { leadId, status } = params;
      await execute(
        `UPDATE leads SET status = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3`,
        [status, leadId, tenantId]
      );
      return { success: true, message: `Statut mis à jour: ${status}` };
    }

    case AVAILABLE_ACTIONS.ADD_NOTE: {
      const { leadId, content } = params;
      await execute(
        `INSERT INTO lead_notes (lead_id, content, created_by, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [leadId, content, userId]
      );
      return { success: true, message: 'Note ajoutée' };
    }

    case AVAILABLE_ACTIONS.CREATE_TASK: {
      const { leadId, title, description, dueDate } = params;
      await execute(
        `INSERT INTO follow_ups (tenant_id, lead_id, title, description, due_date, status, created_by, created_at)
         VALUES ($1, $2, $3, $4, $5, 'pending', $6, NOW())`,
        [tenantId, leadId, title, description || '', dueDate || new Date(Date.now() + 24*60*60*1000), userId]
      );
      return { success: true, message: `Tâche créée: ${title}` };
    }

    case AVAILABLE_ACTIONS.ASSIGN_LEAD: {
      const { leadId, assignToUserId } = params;
      await execute(
        `UPDATE leads SET assigned_to = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3`,
        [assignToUserId, leadId, tenantId]
      );
      return { success: true, message: 'Lead assigné' };
    }

    case AVAILABLE_ACTIONS.UPDATE_FIELD: {
      const { leadId, field, value } = params;
      // Champs autorisés à modifier
      const allowedFields = ['phone', 'email', 'sector', 'city', 'notes', 'contact_name'];
      if (!allowedFields.includes(field)) {
        return { success: false, message: `Champ non autorisé: ${field}` };
      }
      await execute(
        `UPDATE leads SET ${field} = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3`,
        [value, leadId, tenantId]
      );
      return { success: true, message: `Champ ${field} mis à jour` };
    }

    case AVAILABLE_ACTIONS.SEND_EMAIL: {
      const { leadId, subject, body, templateId } = params;
      // Ajouter à la queue d'envoi
      await execute(
        `INSERT INTO email_queue (tenant_id, lead_id, subject, body, template_id, status, created_at)
         VALUES ($1, $2, $3, $4, $5, 'pending', NOW())`,
        [tenantId, leadId, subject, body, templateId || null]
      );
      return { success: true, message: 'Email ajouté à la queue d\'envoi' };
    }

    case AVAILABLE_ACTIONS.COMPLETE_TASK:
    case 'complete_task': {
      const { taskId } = params;
      if (!taskId) {
        return { success: false, message: 'ID de tâche requis' };
      }
      await execute(
        `UPDATE follow_ups SET status = 'completed', completed_at = NOW()
         WHERE id = $1 AND tenant_id = $2`,
        [taskId, tenantId]
      );
      return { success: true, message: 'Tâche marquée comme terminée ✅' };
    }

    default:
      return { success: false, message: `Action inconnue: ${action}` };
  }
}

/**
 * Construit le prompt système avec le contexte du lead
 */
function buildSystemPrompt(user, fullContext) {
  const { lead, history, tasks, stats, hotLeads } = fullContext;

  let context = `Tu es ASEFI, l'assistant IA ULTRA-INTELLIGENT de LeadSynch. Tu as un accès COMPLET à toutes les données du CRM.

🧠 TU ES CAPABLE DE:
1. Voir et analyser TOUTES les tâches de l'utilisateur
2. Voir et analyser TOUS les leads et leur statut
3. Voir les statistiques en temps réel
4. EXÉCUTER des actions concrètes (créer tâches, envoyer emails, compléter tâches, etc.)
5. Générer du contenu personnalisé (emails, messages WhatsApp)

═══════════════════════════════════════════
👤 UTILISATEUR CONNECTÉ
═══════════════════════════════════════════
- Nom: ${user.first_name} ${user.last_name}
- Email: ${user.email}
- Rôle: ${user.role}
- Permissions: FULL ACCESS

═══════════════════════════════════════════
📊 STATISTIQUES EN TEMPS RÉEL
═══════════════════════════════════════════
- Leads total: ${stats?.leads_total || 0}
- Leads créés aujourd'hui: ${stats?.leads_today || 0}
- 🔥 Leads chauds (hot): ${stats?.hot_leads || 0}
- 🟡 Leads tièdes (warm): ${stats?.warm_leads || 0}
- ❄️ Leads froids (cold): ${stats?.cold_leads || 0}
- ✅ Tâches complétées aujourd'hui: ${stats?.tasks_completed_today || 0}
- ⏳ Tâches en attente: ${stats?.tasks_pending || 0}
- ⚠️ Tâches en retard: ${stats?.tasks_overdue || 0}

`;

  // Ajouter les tâches
  if (tasks && tasks.length > 0) {
    context += `═══════════════════════════════════════════
📋 TÂCHES DE L'UTILISATEUR (${tasks.length})
═══════════════════════════════════════════
`;
    tasks.forEach((task, i) => {
      const dueDate = task.due_date ? new Date(task.due_date).toLocaleDateString('fr-FR') : 'Sans échéance';
      const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';
      const overdueFlag = isOverdue ? '⚠️ EN RETARD' : '';
      context += `${i + 1}. [ID:${task.id}] ${task.title || task.description?.substring(0, 50) || 'Tâche sans titre'}
   - Lead: ${task.lead_name || 'Aucun lead'}
   - Échéance: ${dueDate} ${overdueFlag}
   - Statut: ${task.status}
   - Priorité: ${task.priority || 'normale'}
`;
    });
    context += '\n';
  } else {
    context += `═══════════════════════════════════════════
📋 TÂCHES DE L'UTILISATEUR
═══════════════════════════════════════════
✨ Aucune tâche en attente. Bravo !

`;
  }

  // Ajouter les hot leads
  if (hotLeads && hotLeads.length > 0) {
    context += `═══════════════════════════════════════════
🔥 LEADS CHAUDS À TRAITER EN PRIORITÉ (${hotLeads.length})
═══════════════════════════════════════════
`;
    hotLeads.forEach((l, i) => {
      context += `${i + 1}. [ID:${l.id}] ${l.company_name} - Score: ${l.score}/100
   - Contact: ${l.contact_name || 'N/A'} | Email: ${l.email || 'N/A'} | Tel: ${l.phone || 'N/A'}
   - Secteur: ${l.sector || 'N/A'} | Ville: ${l.city || 'N/A'}
   - Action suggérée: ${l.next_best_action || 'Appeler'}
`;
    });
    context += '\n';
  }

  // Ajouter le contexte du lead actuel si présent
  if (lead) {
    context += `═══════════════════════════════════════════
🎯 LEAD ACTUELLEMENT CONSULTÉ
═══════════════════════════════════════════
- ID: ${lead.id}
- Entreprise: ${lead.company_name}
- Contact: ${lead.contact_name || 'Non renseigné'}
- Email: ${lead.email || 'Non renseigné'}
- Téléphone: ${lead.phone || 'Non renseigné'}
- Secteur: ${lead.sector || 'Non renseigné'}
- Ville: ${lead.city || 'Non renseignée'}
- Site web: ${lead.website || 'Non renseigné'}
- SIRET: ${lead.siret || 'Non renseigné'}
- Statut: ${lead.status}
- Score: ${lead.score}/100 (Grade ${lead.grade})
- Health Label: ${lead.healthLabel} - ${lead.healthLabelConfig?.description || ''}
- Prochaine action suggérée: ${lead.nextAction?.reason || 'Aucune'}
- Emails envoyés: ${lead.emails_sent || 0}
- Emails ouverts: ${lead.email_opens || 0}
- Appels: ${lead.total_calls || 0}
- Assigné à: ${lead.assigned_to_name || 'Non assigné'}
- Créé le: ${lead.created_at}
`;

    if (history && history.length > 0) {
      context += `
HISTORIQUE RÉCENT (${history.length} événements):
`;
      history.forEach((h, i) => {
        if (h.type === 'email') {
          context += `${i + 1}. [Email] ${h.subject} - ${h.status} (${new Date(h.created_at).toLocaleDateString('fr-FR')})\n`;
        } else if (h.type === 'call') {
          context += `${i + 1}. [Appel] ${h.outcome} - ${h.notes || 'Pas de notes'} (${new Date(h.created_at).toLocaleDateString('fr-FR')})\n`;
        } else if (h.type === 'note') {
          context += `${i + 1}. [Note] ${h.content?.substring(0, 100) || ''}... par ${h.author} (${new Date(h.created_at).toLocaleDateString('fr-FR')})\n`;
        }
      });
    }
    context += '\n';
  }

  context += `═══════════════════════════════════════════
⚡ ACTIONS QUE TU PEUX EXÉCUTER
═══════════════════════════════════════════
Tu peux DIRECTEMENT exécuter ces actions quand l'utilisateur te le demande:

1. complete_task - Marquer une tâche comme terminée
   Exemple: [ACTION:complete_task]{"taskId":"uuid-de-la-tache"}[/ACTION]

2. create_task - Créer une nouvelle tâche
   Exemple: [ACTION:create_task]{"leadId":"uuid","title":"Rappeler client","dueDate":"2024-01-20"}[/ACTION]

3. update_status - Changer le statut d'un lead
   Exemple: [ACTION:update_status]{"leadId":"uuid","status":"qualifie"}[/ACTION]

4. add_note - Ajouter une note à un lead
   Exemple: [ACTION:add_note]{"leadId":"uuid","content":"Client intéressé par..."}[/ACTION]

5. send_email - Mettre un email en queue d'envoi
   Exemple: [ACTION:send_email]{"leadId":"uuid","subject":"Objet","body":"Contenu"}[/ACTION]

═══════════════════════════════════════════
📝 RÈGLES D'INTERACTION
═══════════════════════════════════════════
1. UTILISE LES VRAIES DONNÉES ci-dessus - ne jamais inventer
2. Quand on te demande "mes tâches", LISTE-LES directement depuis les données
3. Quand on te demande d'exécuter une action, FAIS-LE avec le format [ACTION:xxx]{...}[/ACTION]
4. Sois PROACTIF: suggère des actions pertinentes
5. Pour les emails/messages, GÉNÈRE un contenu personnalisé basé sur les infos du lead
6. Réponds en français, de manière concise et professionnelle
7. N'hésite pas à utiliser des emojis pour la clarté

IMPORTANT: Tu as VRAIMENT accès aux données. Utilise-les !
`;

  return context;
}

/**
 * Parse les actions dans la réponse de l'IA
 */
function parseActions(response) {
  const actionRegex = /\[ACTION:(\w+)\]({.*?})\[\/ACTION\]/g;
  const actions = [];
  let match;

  while ((match = actionRegex.exec(response)) !== null) {
    try {
      actions.push({
        type: match[1],
        params: JSON.parse(match[2])
      });
    } catch (e) {
      log('Erreur parsing action:', e);
    }
  }

  // Nettoyer la réponse des balises d'action
  const cleanResponse = response.replace(actionRegex, '').trim();

  return { actions, cleanResponse };
}

// ========== ROUTES ==========

/**
 * POST /chat
 * Chat contextuel avec ASEFI
 */
router.post('/chat', authMiddleware, async (req, res) => {
  log('💬 ASEFI Chat - Message reçu');

  try {
    if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'sk-ant-dummy-key') {
      return res.status(503).json({
        error: 'Service IA temporairement indisponible',
        message: 'L\'intelligence artificielle ASEFI n\'est pas configurée.'
      });
    }

    const { message, leadId, conversationId, executeActions } = req.body;
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message requis' });
    }

    // ========== RÉCUPÉRER TOUTES LES DONNÉES UTILISATEUR ==========
    log('📊 Chargement du contexte complet pour ASEFI...');

    // Récupérer les infos du lead si spécifié
    let lead = null;
    let history = null;

    if (leadId) {
      try {
        lead = await getLeadDetails(leadId, tenantId);
        if (lead) {
          history = await getLeadHistory(leadId, tenantId);
        }
      } catch (leadErr) {
        log('⚠️ Erreur récupération lead (continue sans contexte):', leadErr.message);
      }
    }

    // Récupérer les tâches de l'utilisateur
    const tasks = await getUserTasks(userId, tenantId, 'pending');
    log(`📋 ${tasks.length} tâches chargées`);

    // Récupérer les stats du jour
    const stats = await getUserDailyStats(userId, tenantId);
    log(`📊 Stats: ${stats.leads_total} leads, ${stats.tasks_pending} tâches en attente`);

    // Récupérer les leads chauds
    const hotLeads = await getHotLeads(tenantId, 10);
    log(`🔥 ${hotLeads.length} leads chauds chargés`);

    // Construire le contexte complet
    const fullContext = {
      lead,
      history,
      tasks,
      stats,
      hotLeads
    };

    // Construire le prompt système avec TOUTES les données
    const systemPrompt = buildSystemPrompt(req.user, fullContext);

    // Récupérer l'historique de conversation si existant (optionnel)
    let messages = [];
    if (conversationId) {
      try {
        const { rows } = await query(
          `SELECT role, content FROM asefi_messages
           WHERE conversation_id = $1
           ORDER BY created_at ASC
           LIMIT 20`,
          [conversationId]
        );
        messages = rows.map(m => ({ role: m.role, content: m.content }));
      } catch (historyErr) {
        log('⚠️ Erreur récupération historique (continue sans):', historyErr.message);
      }
    }

    // Ajouter le nouveau message
    messages.push({ role: 'user', content: message });

    // Appeler Claude
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      temperature: 0.7,
      system: systemPrompt,
      messages: messages
    });

    const aiResponse = response.content[0].text.trim();

    // Parser les actions dans la réponse
    const { actions, cleanResponse } = parseActions(aiResponse);

    // Exécuter les actions si demandé
    const executedActions = [];
    if (executeActions && actions.length > 0) {
      for (const action of actions) {
        try {
          const result = await executeAction(action.type, action.params, userId, tenantId);
          executedActions.push({ ...action, result });
        } catch (actionErr) {
          log('⚠️ Erreur exécution action:', actionErr.message);
          executedActions.push({ ...action, result: { success: false, message: actionErr.message } });
        }
      }
    }

    // Sauvegarder la conversation (optionnel - ne bloque pas si tables manquantes)
    let currentConversationId = conversationId;
    try {
      if (!currentConversationId) {
        const { rows } = await query(
          `INSERT INTO asefi_conversations (tenant_id, user_id, lead_id, title, created_at, updated_at)
           VALUES ($1, $2, $3, $4, NOW(), NOW())
           RETURNING id`,
          [tenantId, userId, leadId, message.substring(0, 100)]
        );
        currentConversationId = rows[0].id;
      }

      // Sauvegarder les messages
      await execute(
        `INSERT INTO asefi_messages (conversation_id, role, content, tokens_used, action_executed, created_at)
         VALUES ($1, 'user', $2, 0, NULL, NOW())`,
        [currentConversationId, message]
      );

      await execute(
        `INSERT INTO asefi_messages (conversation_id, role, content, tokens_used, action_executed, created_at)
         VALUES ($1, 'assistant', $2, $3, $4, NOW())`,
        [
          currentConversationId,
          cleanResponse,
          response.usage.input_tokens + response.usage.output_tokens,
          executedActions.length > 0 ? JSON.stringify(executedActions) : null
        ]
      );
    } catch (saveErr) {
      // Tables de conversation probablement manquantes - continue sans sauvegarder
      log('⚠️ Impossible de sauvegarder la conversation (tables manquantes?):', saveErr.message);
      currentConversationId = null;
    }

    res.json({
      success: true,
      response: cleanResponse,
      conversation_id: currentConversationId,
      actions_detected: actions,
      actions_executed: executedActions,
      lead_context: lead ? {
        id: lead.id,
        company_name: lead.company_name,
        health_label: lead.healthLabel,
        score: lead.score
      } : null,
      tokens_used: response.usage.input_tokens + response.usage.output_tokens
    });

  } catch (err) {
    error('❌ Erreur ASEFI Chat:', err);
    res.status(500).json({
      error: 'Erreur lors de la génération de la réponse',
      details: err.message
    });
  }
});

/**
 * GET /conversations
 * Liste les conversations récentes
 */
router.get('/conversations', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 20;

    const { rows } = await query(
      `SELECT c.*, l.company_name as lead_name,
        (SELECT content FROM asefi_messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message
       FROM asefi_conversations c
       LEFT JOIN leads l ON c.lead_id = l.id
       WHERE c.user_id = $1
       ORDER BY c.updated_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    res.json({ success: true, conversations: rows });
  } catch (err) {
    error('Erreur récupération conversations:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /conversations/:id
 * Récupère une conversation avec ses messages
 */
router.get('/conversations/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const conversation = await queryOne(
      `SELECT c.*, l.company_name as lead_name
       FROM asefi_conversations c
       LEFT JOIN leads l ON c.lead_id = l.id
       WHERE c.id = $1 AND c.user_id = $2`,
      [id, userId]
    );

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation non trouvée' });
    }

    const { rows: messages } = await query(
      `SELECT * FROM asefi_messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC`,
      [id]
    );

    res.json({
      success: true,
      conversation,
      messages
    });
  } catch (err) {
    error('Erreur récupération conversation:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /generate-email
 * Génère un email personnalisé pour un lead
 */
router.post('/generate-email', authMiddleware, async (req, res) => {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(503).json({ error: 'Service IA non configuré' });
    }

    const { leadId, type, tone, objective, additionalContext } = req.body;
    const tenantId = req.user.tenant_id;

    if (!leadId) {
      return res.status(400).json({ error: 'leadId requis' });
    }

    const lead = await getLeadDetails(leadId, tenantId);
    if (!lead) {
      return res.status(404).json({ error: 'Lead non trouvé' });
    }

    const history = await getLeadHistory(leadId, tenantId);

    const prompt = `Génère un email professionnel pour ce prospect:

DESTINATAIRE:
- Entreprise: ${lead.company_name}
- Contact: ${lead.contact_name || 'Responsable'}
- Secteur: ${lead.sector || 'Non spécifié'}
- Ville: ${lead.city || 'Non spécifiée'}

TYPE D'EMAIL: ${type || 'prospection'}
TON: ${tone || 'professionnel'}
OBJECTIF: ${objective || 'Prise de contact initiale'}

HISTORIQUE:
${history.length > 0 ? history.map(h => {
  if (h.type === 'email') return `- Email envoyé: ${h.subject}`;
  if (h.type === 'call') return `- Appel: ${h.outcome}`;
  return '';
}).filter(Boolean).join('\n') : 'Aucun historique'}

${additionalContext ? `CONTEXTE ADDITIONNEL: ${additionalContext}` : ''}

SCORE DU LEAD: ${lead.score}/100 (${lead.healthLabel})

Génère un email avec:
1. Un objet accrocheur
2. Une introduction personnalisée
3. Une proposition de valeur claire
4. Un call-to-action
5. Une signature professionnelle

Format de réponse:
OBJET: [objet de l'email]
---
[corps de l'email]`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }]
    });

    const emailContent = response.content[0].text.trim();

    // Parser l'objet et le corps
    const subjectMatch = emailContent.match(/OBJET:\s*(.+?)(?:\n|---)/);
    const subject = subjectMatch ? subjectMatch[1].trim() : 'Proposition de collaboration';
    const body = emailContent.replace(/OBJET:\s*.+?\n---\n?/, '').trim();

    res.json({
      success: true,
      email: {
        subject,
        body,
        lead_id: leadId,
        lead_name: lead.company_name
      },
      tokens_used: response.usage.input_tokens + response.usage.output_tokens
    });

  } catch (err) {
    error('Erreur génération email:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /generate-message
 * Génère un message court (SMS, WhatsApp, LinkedIn)
 */
router.post('/generate-message', authMiddleware, async (req, res) => {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(503).json({ error: 'Service IA non configuré' });
    }

    const { leadId, channel, objective } = req.body;
    const tenantId = req.user.tenant_id;

    if (!leadId || !channel) {
      return res.status(400).json({ error: 'leadId et channel requis' });
    }

    const lead = await getLeadDetails(leadId, tenantId);
    if (!lead) {
      return res.status(404).json({ error: 'Lead non trouvé' });
    }

    const maxLength = {
      sms: 160,
      whatsapp: 500,
      linkedin: 300
    }[channel] || 300;

    const prompt = `Génère un message ${channel.toUpperCase()} court pour ce prospect:

DESTINATAIRE:
- Entreprise: ${lead.company_name}
- Contact: ${lead.contact_name || 'Responsable'}
- Secteur: ${lead.sector || 'Non spécifié'}

OBJECTIF: ${objective || 'Prise de contact'}

CONTRAINTES:
- Maximum ${maxLength} caractères
- Ton professionnel mais friendly
- Inclure un call-to-action clair
- Personnaliser avec le nom de l'entreprise

Génère UNIQUEMENT le message, sans explication.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }]
    });

    const message = response.content[0].text.trim();

    res.json({
      success: true,
      message: {
        content: message,
        channel,
        lead_id: leadId,
        lead_name: lead.company_name,
        character_count: message.length
      }
    });

  } catch (err) {
    error('Erreur génération message:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /execute-action
 * Exécute une action suggérée par ASEFI
 */
router.post('/execute-action', authMiddleware, async (req, res) => {
  try {
    const { action, params } = req.body;
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;

    if (!action || !params) {
      return res.status(400).json({ error: 'action et params requis' });
    }

    // Vérifier que le lead appartient au tenant
    if (params.leadId) {
      const lead = await queryOne(
        'SELECT id FROM leads WHERE id = $1 AND tenant_id = $2',
        [params.leadId, tenantId]
      );
      if (!lead) {
        return res.status(404).json({ error: 'Lead non trouvé' });
      }
    }

    const result = await executeAction(action, params, userId, tenantId);

    res.json({
      success: result.success,
      message: result.message,
      action,
      params
    });

  } catch (err) {
    error('Erreur exécution action:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
