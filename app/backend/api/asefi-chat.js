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

    // Filtrer par utilisateur assigné
    whereClause += ` AND f.user_id = $${paramIndex}`;
    params.push(userId);
    paramIndex++;

    // Filtres additionnels (utilise completed BOOLEAN au lieu de status)
    if (filter === 'pending' || filter === 'all') {
      whereClause += ` AND f.completed = FALSE`;
    } else if (filter === 'today') {
      whereClause += ` AND f.scheduled_date::date = CURRENT_DATE AND f.completed = FALSE`;
    } else if (filter === 'overdue') {
      whereClause += ` AND f.scheduled_date < NOW() AND f.completed = FALSE`;
    } else if (filter === 'completed') {
      whereClause += ` AND f.completed = TRUE`;
    }

    const { rows } = await query(
      `SELECT f.*,
        l.company_name as lead_name,
        l.email as lead_email,
        l.phone as lead_phone,
        u.first_name || ' ' || u.last_name as assigned_to_name
       FROM follow_ups f
       LEFT JOIN leads l ON f.lead_id = l.id
       LEFT JOIN users u ON f.user_id = u.id
       ${whereClause}
       ORDER BY
         CASE WHEN f.scheduled_date < NOW() THEN 0 ELSE 1 END,
         f.scheduled_date ASC NULLS LAST,
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
       WHERE tenant_id = $1 AND completed = FALSE
       AND user_id = $2`,
      [tenantId, userId]
    );
    stats.tasks_pending = parseInt(tasksPending?.count) || 0;

    // Tâches en retard
    const tasksOverdue = await queryOne(
      `SELECT COUNT(*) as count FROM follow_ups
       WHERE tenant_id = $1 AND completed = FALSE AND scheduled_date < NOW()
       AND user_id = $2`,
      [tenantId, userId]
    );
    stats.tasks_overdue = parseInt(tasksOverdue?.count) || 0;

    // Tâches complétées aujourd'hui
    const tasksCompleted = await queryOne(
      `SELECT COUNT(*) as count FROM follow_ups
       WHERE tenant_id = $1 AND completed = TRUE AND completed_at::date = CURRENT_DATE
       AND user_id = $2`,
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
 * Trouve UN lead par son nom (fuzzy search) - retourne le meilleur match
 */
async function findLeadByName(tenantId, companyName) {
  log(`🔍 findLeadByName: recherche "${companyName}" pour tenant ${tenantId}`);

  try {
    // 1. Recherche exacte d'abord
    let lead = await queryOne(
      `SELECT * FROM leads WHERE tenant_id = $1 AND LOWER(company_name) = LOWER($2)`,
      [tenantId, companyName]
    );

    if (lead) {
      log(`✅ Trouvé par recherche exacte: ${lead.company_name}`);
      return lead;
    }

    // 2. Recherche ILIKE (contient)
    const { rows: iLikeRows } = await query(
      `SELECT * FROM leads
       WHERE tenant_id = $1
         AND company_name ILIKE $2
       ORDER BY score DESC NULLS LAST
       LIMIT 1`,
      [tenantId, `%${companyName}%`]
    );

    if (iLikeRows && iLikeRows.length > 0) {
      log(`✅ Trouvé par ILIKE: ${iLikeRows[0].company_name}`);
      return iLikeRows[0];
    }

    // 3. Recherche par mots-clés (si le nom contient plusieurs mots)
    const words = companyName.split(/\s+/).filter(w => w.length > 2);
    if (words.length > 1) {
      // Construire une requête qui cherche tous les mots
      const conditions = words.map((_, i) => `company_name ILIKE $${i + 2}`).join(' AND ');
      const params = [tenantId, ...words.map(w => `%${w}%`)];

      const { rows: multiWordRows } = await query(
        `SELECT * FROM leads
         WHERE tenant_id = $1
           AND (${conditions})
         ORDER BY score DESC NULLS LAST
         LIMIT 1`,
        params
      );

      if (multiWordRows && multiWordRows.length > 0) {
        log(`✅ Trouvé par mots-clés (${words.join(', ')}): ${multiWordRows[0].company_name}`);
        return multiWordRows[0];
      }
    }

    // 4. Recherche par le premier mot significatif
    const firstWord = words.find(w => w.length > 3);
    if (firstWord) {
      const { rows: firstWordRows } = await query(
        `SELECT * FROM leads
         WHERE tenant_id = $1
           AND company_name ILIKE $2
         ORDER BY
           CASE WHEN company_name ILIKE $3 THEN 0 ELSE 1 END,
           score DESC NULLS LAST
         LIMIT 1`,
        [tenantId, `%${firstWord}%`, `${firstWord}%`]
      );

      if (firstWordRows && firstWordRows.length > 0) {
        log(`✅ Trouvé par premier mot (${firstWord}): ${firstWordRows[0].company_name}`);
        return firstWordRows[0];
      }
    }

    log(`❌ Aucun lead trouvé pour "${companyName}"`);
    return null;
  } catch (e) {
    log('⚠️ Erreur recherche lead par nom:', e.message);
    // Fallback simple
    try {
      const { rows } = await query(
        `SELECT * FROM leads
         WHERE tenant_id = $1
           AND company_name ILIKE $2
         ORDER BY score DESC
         LIMIT 1`,
        [tenantId, `%${companyName}%`]
      );
      return rows && rows.length > 0 ? rows[0] : null;
    } catch (e2) {
      log('⚠️ Erreur fallback:', e2.message);
      return null;
    }
  }
}

/**
 * Détecte les noms d'entreprises mentionnés dans un message
 */
function extractCompanyNames(message) {
  const names = new Set();
  let match;

  // Pattern 0: Format réponse IA "Lead trouvé : [NOM]" ou "Lead : [NOM]"
  const aiResponsePattern = /(?:lead\s*(?:trouvé|found)?)\s*[:\-]\s*["']?([A-Za-z][A-Za-z0-9\s&''\-\.\&]+?)["']?\s*(?:$|\n|[!?])/gi;
  while ((match = aiResponsePattern.exec(message)) !== null) {
    const name = match[1].trim();
    if (name.length > 2 && name.length < 80) {
      names.add(name);
    }
  }

  // Pattern 0b: Noms en gras **Nom Entreprise** (format markdown des réponses IA)
  const boldPattern = /\*\*([A-Za-z][A-Za-z0-9\s&''\-\.\&]{2,60})\*\*/g;
  while ((match = boldPattern.exec(message)) !== null) {
    const name = match[1].trim();
    // Filtrer les mots communs en gras
    if (name.length > 2 && !/^(action|email|note|tâche|statut|lead|contact|score|secteur|ville)/i.test(name)) {
      names.add(name);
    }
  }

  // Pattern 1: "trouve/cherche/ouvre le lead [NOM]" - capture jusqu'à la fin ou ponctuation
  const directLeadPattern = /(?:trouve|cherche|ouvre|affiche|montre)\s+(?:le\s+)?(?:lead\s+)?[:\s]*["']?([A-Za-z][A-Za-z0-9\s&''\-\.\&]+?)["']?\s*(?:$|[?!,;:\n])/gi;
  while ((match = directLeadPattern.exec(message)) !== null) {
    const name = match[1].trim();
    if (name.length > 2 && name.length < 80) {
      names.add(name);
    }
  }

  // Pattern 2: "lead [NOM COMPLET]" ou "lead: [NOM]" - capture tout après "lead" jusqu'à la fin
  const leadPattern = /\blead\s*[:\s]+["']?([A-Za-z][A-Za-z0-9\s&''\-\.\&]+?)["']?\s*(?:$|[?!,;:\n])/gi;
  while ((match = leadPattern.exec(message)) !== null) {
    const name = match[1].trim();
    if (name.length > 2 && name.length < 80 && !/^(trouvé|found|non trouvé|not found)/i.test(name)) {
      names.add(name);
    }
  }

  // Pattern 3: Noms entre guillemets
  const quotedPattern = /["']([^"']{3,60})["']/g;
  while ((match = quotedPattern.exec(message)) !== null) {
    const name = match[1].trim();
    if (name.length > 2) {
      names.add(name);
    }
  }

  // Pattern 4: "email/note/tâche pour/à [NOM]"
  const actionPattern = /(?:mail|email|appel|note|tâche|rdv)\s+(?:à|pour|sur|avec|chez)?\s*["']?([A-Z][A-Za-z0-9\s&''\-\.\&]{2,50})/gi;
  while ((match = actionPattern.exec(message)) !== null) {
    const name = match[1].trim();
    if (name.length > 2 && !/^(le|la|les|un|une|des|ce|cette|mon|ma|mes)$/i.test(name)) {
      names.add(name);
    }
  }

  // Pattern 5: Nom après ID/Email/Contact dans format structuré
  const structuredPattern = /(?:🆔|ID|Entreprise|Company)[:\s]+["']?([A-Za-z][A-Za-z0-9\s&''\-\.\&]{2,60})["']?/gi;
  while ((match = structuredPattern.exec(message)) !== null) {
    const name = match[1].trim();
    if (name.length > 2 && !/^[a-f0-9\-]{36}$/i.test(name)) { // Exclure les UUIDs
      names.add(name);
    }
  }

  // Filtrer les mots communs et nettoyer
  const filtered = Array.from(names).filter(name => {
    const lower = name.toLowerCase();
    return ![
      'le lead', 'ce lead', 'un lead', 'mon lead', 'la fiche', 'cette fiche',
      'action détectée', 'lead trouvé', 'lead non trouvé', 'n/a', 'non renseigné'
    ].includes(lower) && name.length > 2;
  });

  return filtered;
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

      // Fonction pour créer une date en heure de Paris
      const createParisDateForTask = (year, month, day, hours = 9, minutes = 0) => {
        const date = new Date(Date.UTC(year, month, day, hours, minutes, 0, 0));
        // Paris: UTC+1 (hiver) ou UTC+2 (été) - en janvier c'est UTC+1
        const month0Based = date.getUTCMonth();
        const isDST = month0Based >= 3 && month0Based <= 9; // Approximation: avril-octobre
        const parisOffset = isDST ? 2 : 1;
        date.setUTCHours(hours - parisOffset, minutes, 0, 0);
        return date;
      };

      let scheduledDate;
      if (dueDate) {
        // Si c'est une date ISO, la parser et ajuster pour Paris
        const parsed = new Date(dueDate);
        if (!isNaN(parsed.getTime())) {
          // Extraire heure demandée et recréer en heure Paris
          const hours = parsed.getHours() || parsed.getUTCHours() || 9;
          const minutes = parsed.getMinutes() || parsed.getUTCMinutes() || 0;
          scheduledDate = createParisDateForTask(
            parsed.getFullYear(), parsed.getMonth(), parsed.getDate(),
            hours, minutes
          );
        } else {
          // Fallback: demain 9h Paris
          const now = new Date();
          scheduledDate = createParisDateForTask(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 0);
        }
      } else {
        // Par défaut: demain 9h Paris
        const now = new Date();
        scheduledDate = createParisDateForTask(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 0);
      }

      await execute(
        `INSERT INTO follow_ups (tenant_id, lead_id, user_id, title, notes, scheduled_date, completed, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, FALSE, NOW())`,
        [tenantId, leadId, userId, title, description || '', scheduledDate]
      );

      const dateStr = scheduledDate.toLocaleString('fr-FR', {
        timeZone: 'Europe/Paris',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit'
      });
      return { success: true, message: `✅ Tâche créée: ${title} - ${dateStr}` };
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

    // ========== ACTIONS PAR NOM D'ENTREPRISE ==========

    case 'send_email_by_name': {
      const { companyName, subject, body } = params;
      if (!companyName) {
        return { success: false, message: 'Nom d\'entreprise requis' };
      }

      // Chercher le lead par nom
      const lead = await findLeadByName(tenantId, companyName);
      if (!lead) {
        return { success: false, message: `Lead "${companyName}" non trouvé` };
      }

      // Vérifier qu'on a l'email
      if (!lead.email) {
        return { success: false, message: `Le lead "${lead.company_name}" n'a pas d'email` };
      }

      // Ajouter à la queue d'envoi
      await execute(
        `INSERT INTO email_queue (tenant_id, lead_id, subject, body, status, created_at)
         VALUES ($1, $2, $3, $4, 'pending', NOW())`,
        [tenantId, lead.id, subject, body]
      );

      return {
        success: true,
        message: `📧 Email envoyé à ${lead.company_name} (${lead.email})`,
        leadId: lead.id,
        leadName: lead.company_name
      };
    }

    case 'add_note_by_name': {
      const { companyName, content } = params;
      if (!companyName || !content) {
        return { success: false, message: 'Nom d\'entreprise et contenu requis' };
      }

      const lead = await findLeadByName(tenantId, companyName);
      if (!lead) {
        return { success: false, message: `Lead "${companyName}" non trouvé` };
      }

      await execute(
        `INSERT INTO lead_notes (lead_id, content, created_by, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [lead.id, content, userId]
      );

      return {
        success: true,
        message: `📝 Note ajoutée à ${lead.company_name}`,
        leadId: lead.id,
        leadName: lead.company_name
      };
    }

    case 'create_task_by_name': {
      const { companyName, title, description, dueDate } = params;
      if (!companyName || !title) {
        return { success: false, message: 'Nom d\'entreprise et titre requis' };
      }

      const lead = await findLeadByName(tenantId, companyName);
      if (!lead) {
        return { success: false, message: `Lead "${companyName}" non trouvé` };
      }

      // Fonction pour créer une date en heure de Paris
      const createParisDate = (year, month, day, hours = 9, minutes = 0) => {
        // Créer la date en UTC puis ajuster pour Paris (UTC+1 hiver, UTC+2 été)
        const date = new Date(Date.UTC(year, month, day, hours, minutes, 0, 0));
        // Paris est UTC+1 en hiver (janvier), donc soustraire 1h pour obtenir l'heure locale correcte
        // Vérifier si on est en heure d'été (dernier dimanche de mars au dernier dimanche d'octobre)
        const janFirst = new Date(year, 0, 1);
        const julFirst = new Date(year, 6, 1);
        const stdTimezoneOffset = Math.max(janFirst.getTimezoneOffset(), julFirst.getTimezoneOffset());
        const isDST = date.getTimezoneOffset() < stdTimezoneOffset;
        // Paris: UTC+1 (hiver) ou UTC+2 (été)
        const parisOffset = isDST ? 2 : 1;
        date.setUTCHours(hours - parisOffset, minutes, 0, 0);
        return date;
      };

      // Parser la date (supporte ISO, "demain", "dans X jours", etc.)
      let parsedDate = null;
      let requestedHours = 9;
      let requestedMinutes = 0;

      if (dueDate) {
        // Extraire l'heure si présente AVANT de parser la date
        const timeMatch = dueDate.match(/(\d{1,2})[h:](\d{2})?/i);
        if (timeMatch) {
          requestedHours = parseInt(timeMatch[1]);
          requestedMinutes = parseInt(timeMatch[2] || '0');
        }

        // Essayer de parser comme date ISO
        const isoDate = new Date(dueDate);
        if (!isNaN(isoDate.getTime()) && dueDate.includes('-')) {
          // C'est une date ISO, l'utiliser directement
          parsedDate = isoDate;
        } else {
          // Parser les expressions françaises
          const now = new Date();
          const lowerDate = dueDate.toLowerCase();

          if (lowerDate.includes('demain')) {
            parsedDate = createParisDate(now.getFullYear(), now.getMonth(), now.getDate() + 1, requestedHours, requestedMinutes);
          } else if (lowerDate.includes('après-demain') || lowerDate.includes('apres-demain')) {
            parsedDate = createParisDate(now.getFullYear(), now.getMonth(), now.getDate() + 2, requestedHours, requestedMinutes);
          } else if (lowerDate.includes('dans')) {
            const match = lowerDate.match(/dans\s+(\d+)\s*(jour|semaine|heure)/i);
            if (match) {
              const num = parseInt(match[1]);
              if (match[2].includes('jour')) {
                parsedDate = createParisDate(now.getFullYear(), now.getMonth(), now.getDate() + num, requestedHours, requestedMinutes);
              } else if (match[2].includes('semaine')) {
                parsedDate = createParisDate(now.getFullYear(), now.getMonth(), now.getDate() + (num * 7), requestedHours, requestedMinutes);
              } else if (match[2].includes('heure')) {
                parsedDate = new Date(now.getTime() + num * 60 * 60 * 1000);
              }
            }
          } else if (lowerDate.includes('aujourd')) {
            parsedDate = createParisDate(now.getFullYear(), now.getMonth(), now.getDate(), requestedHours, requestedMinutes);
          }
        }
      }

      // Par défaut: demain 9h (heure de Paris)
      if (!parsedDate) {
        const now = new Date();
        parsedDate = createParisDate(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 0);
      }

      await execute(
        `INSERT INTO follow_ups (tenant_id, lead_id, user_id, title, notes, scheduled_date, completed, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, FALSE, NOW())`,
        [tenantId, lead.id, userId, title, description || '', parsedDate]
      );

      // Formater la date pour l'affichage en heure de Paris
      const dateStr = parsedDate.toLocaleString('fr-FR', {
        timeZone: 'Europe/Paris',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit'
      });
      return {
        success: true,
        message: `✅ Tâche "${title}" créée pour ${lead.company_name} - ${dateStr}`,
        leadId: lead.id,
        leadName: lead.company_name
      };
    }

    case 'update_status_by_name': {
      const { companyName, status } = params;
      if (!companyName || !status) {
        return { success: false, message: 'Nom d\'entreprise et statut requis' };
      }

      const lead = await findLeadByName(tenantId, companyName);
      if (!lead) {
        return { success: false, message: `Lead "${companyName}" non trouvé` };
      }

      await execute(
        `UPDATE leads SET status = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3`,
        [status, lead.id, tenantId]
      );

      return {
        success: true,
        message: `🔄 Statut de ${lead.company_name} changé en "${status}"`,
        leadId: lead.id,
        leadName: lead.company_name
      };
    }

    case 'navigate_to_lead': {
      const { companyName, leadId: directLeadId } = params;

      let lead;
      if (directLeadId) {
        lead = await queryOne(`SELECT id, company_name FROM leads WHERE id = $1 AND tenant_id = $2`, [directLeadId, tenantId]);
      } else if (companyName) {
        lead = await findLeadByName(tenantId, companyName);
      }

      if (!lead) {
        return { success: false, message: `Lead non trouvé` };
      }

      return {
        success: true,
        message: `🔗 Ouvrir ${lead.company_name}`,
        action_type: 'navigate',
        navigate_to: `/leads/${lead.id}`,
        leadId: lead.id,
        leadName: lead.company_name
      };
    }

    case 'search_lead': {
      const { searchTerm } = params;
      if (!searchTerm) {
        return { success: false, message: 'Terme de recherche requis' };
      }

      const results = await searchLeads(tenantId, searchTerm, 5);
      if (results.length === 0) {
        return { success: false, message: `Aucun lead trouvé pour "${searchTerm}"` };
      }

      return {
        success: true,
        message: `🔍 ${results.length} lead(s) trouvé(s)`,
        leads: results
      };
    }

    // ========== ACTIONS DE LECTURE ==========

    case 'get_tasks_by_date':
    case 'get_tasks': {
      const { date, filter } = params;
      let dateFilter = '';
      const queryParams = [tenantId, userId];

      if (date) {
        // Parser la date
        let targetDate;
        const lowerDate = (date || '').toLowerCase();

        if (lowerDate.includes('demain')) {
          targetDate = new Date();
          targetDate.setDate(targetDate.getDate() + 1);
        } else if (lowerDate.includes('aujourd')) {
          targetDate = new Date();
        } else {
          targetDate = new Date(date);
        }

        if (!isNaN(targetDate.getTime())) {
          dateFilter = ` AND f.scheduled_date::date = $3`;
          queryParams.push(targetDate.toISOString().split('T')[0]);
        }
      }

      try {
        const { rows } = await query(
          `SELECT f.*, l.company_name as lead_name
           FROM follow_ups f
           LEFT JOIN leads l ON f.lead_id = l.id
           WHERE f.tenant_id = $1
             AND f.user_id = $2
             AND f.completed = FALSE
             ${dateFilter}
           ORDER BY f.scheduled_date ASC
           LIMIT 10`,
          queryParams
        );

        if (rows.length === 0) {
          return {
            success: true,
            message: `📋 Aucune tâche trouvée${date ? ` pour ${date}` : ''}`,
            tasks: []
          };
        }

        const taskList = rows.map(t => ({
          id: t.id,
          title: t.title,
          lead: t.lead_name,
          scheduled_date: t.scheduled_date,
          completed: t.completed
        }));

        return {
          success: true,
          message: `📋 ${rows.length} tâche(s) trouvée(s)`,
          tasks: taskList
        };
      } catch (e) {
        return { success: false, message: `Erreur: ${e.message}` };
      }
    }

    case 'get_lead_info': {
      const { companyName, leadId: directLeadId } = params;

      let lead;
      if (directLeadId) {
        lead = await queryOne(`SELECT * FROM leads WHERE id = $1 AND tenant_id = $2`, [directLeadId, tenantId]);
      } else if (companyName) {
        lead = await findLeadByName(tenantId, companyName);
      }

      if (!lead) {
        return { success: false, message: `Lead non trouvé` };
      }

      return {
        success: true,
        message: `📋 Informations du lead`,
        lead: {
          id: lead.id,
          company_name: lead.company_name,
          contact_name: lead.contact_name,
          email: lead.email,
          phone: lead.phone,
          sector: lead.sector,
          city: lead.city,
          score: lead.score,
          status: lead.status
        }
      };
    }

    default:
      return { success: false, message: `Action inconnue: ${action}` };
  }
}

/**
 * Construit le prompt système avec le contexte du lead
 */
function buildSystemPrompt(user, fullContext) {
  const { lead, history, tasks, stats, hotLeads, mentionedLeads, conversationContextLead } = fullContext;

  // ========== RÈGLES CRITIQUES EN PREMIER (avant toute donnée) ==========
  let context = `🚨🚨🚨 RÈGLES OBLIGATOIRES - LIS CECI EN PREMIER 🚨🚨🚨

Tu es ASEFI, un agent IA AUTONOME. Tu DOIS suivre ces règles SANS EXCEPTION:

1. SI UN LEAD APPARAÎT DANS "LEAD EN CONTEXTE" OU "LEADS TROUVÉS" CI-DESSOUS:
   → UTILISE-LE pour TOUTE action demandée (tâche, email, note, etc.)
   → NE DEMANDE JAMAIS "pour quel lead ?" ou "quelle entreprise ?"

2. EXÉCUTE les actions IMMÉDIATEMENT avec le format:
   [ACTION:nom_action]{"param":"valeur"}[/ACTION]

3. Pour les DATES, utilise TOUJOURS le format ISO: "2025-01-20T09:00:00"
   - "demain 9h" → calcule la date et écris "2025-01-21T09:00:00"
   - "dans 2 jours" → calcule et écris la date ISO

4. AFFICHE toutes les données RÉELLES des leads - JAMAIS de "[En cours...]"

5. NE DIS JAMAIS: "je ne peux pas", "pour quel lead ?", "précisez"

═══════════════════════════════════════════
👤 UTILISATEUR: ${user.first_name} ${user.last_name} (${user.role})
═══════════════════════════════════════════

`;

  // ========== LEAD EN CONTEXTE (prioritaire) ==========
  if (conversationContextLead) {
    context += `🎯🎯🎯 LEAD EN CONTEXTE (UTILISE CELUI-CI POUR LES ACTIONS) 🎯🎯🎯
Nom: ${conversationContextLead.company_name}
ID: ${conversationContextLead.id}
Email: ${conversationContextLead.email || 'N/A'}
Téléphone: ${conversationContextLead.phone || 'N/A'}
Secteur: ${conversationContextLead.sector || 'N/A'}
Ville: ${conversationContextLead.city || 'N/A'}
Score: ${conversationContextLead.score || 0}/100
Statut: ${conversationContextLead.status || 'nouveau'}

`;
  }

  // ========== LEADS MENTIONNÉS ==========
  if (mentionedLeads && mentionedLeads.length > 0) {
    context += `🔍 LEADS TROUVÉS (${mentionedLeads.length}):
`;
    mentionedLeads.forEach((ml, i) => {
      context += `${i + 1}. ${ml.company_name} | ID: ${ml.id} | Email: ${ml.email || 'N/A'} | Tel: ${ml.phone || 'N/A'} | Score: ${ml.score || 0}/100
`;
    });
    context += '\n';
  }

  // ========== STATS (condensées) ==========
  context += `📊 STATS: ${stats?.leads_total || 0} leads | ${stats?.hot_leads || 0} chauds | ${stats?.tasks_pending || 0} tâches en attente
`;

  // ========== TÂCHES (max 5) ==========
  if (tasks && tasks.length > 0) {
    context += `📋 TÂCHES (${Math.min(tasks.length, 5)} sur ${tasks.length}):
`;
    tasks.slice(0, 5).forEach((task, i) => {
      const dueDate = task.due_date ? new Date(task.due_date).toLocaleDateString('fr-FR') : 'Sans date';
      context += `${i + 1}. [${task.id}] ${task.title || 'Sans titre'} - ${task.lead_name || 'Pas de lead'} - ${dueDate}
`;
    });
    context += '\n';
  }

  // ========== HOT LEADS (max 3) ==========
  if (hotLeads && hotLeads.length > 0) {
    context += `🔥 TOP 3 LEADS CHAUDS:
`;
    hotLeads.slice(0, 3).forEach((l, i) => {
      context += `${i + 1}. ${l.company_name} (${l.score}/100) - ${l.email || 'N/A'}
`;
    });
    context += '\n';
  }

  // ========== LEAD CONSULTÉ (si sur une page lead) ==========
  if (lead) {
    context += `📍 LEAD ACTUELLEMENT CONSULTÉ:
${lead.company_name} | ${lead.email || 'N/A'} | ${lead.phone || 'N/A'} | Score: ${lead.score}/100 | ${lead.status}
`;
  }

  // ========== ACTIONS DISPONIBLES ==========
  context += `
⚡ ACTIONS (utilise le lead en contexte si disponible):
- [ACTION:create_task_by_name]{"companyName":"NOM","title":"TITRE","dueDate":"2025-01-20T09:00:00"}[/ACTION]
- [ACTION:send_email_by_name]{"companyName":"NOM","subject":"OBJET","body":"CONTENU"}[/ACTION]
- [ACTION:add_note_by_name]{"companyName":"NOM","content":"NOTE"}[/ACTION]
- [ACTION:update_status_by_name]{"companyName":"NOM","status":"qualifie"}[/ACTION]
- [ACTION:navigate_to_lead]{"companyName":"NOM"}[/ACTION]
- [ACTION:complete_task]{"taskId":"UUID"}[/ACTION]

📅 DATE ACTUELLE: ${new Date().toISOString().split('T')[0]}
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

    // ========== RÉCUPÉRER L'HISTORIQUE DE CONVERSATION D'ABORD ==========
    // (pour maintenir le contexte des leads mentionnés précédemment)
    let conversationMessages = [];
    let conversationContextLead = null; // Le lead mentionné dans la conversation précédente

    if (conversationId) {
      try {
        const { rows } = await query(
          `SELECT role, content FROM asefi_messages
           WHERE conversation_id = $1
           ORDER BY created_at ASC
           LIMIT 20`,
          [conversationId]
        );
        conversationMessages = rows.map(m => ({ role: m.role, content: m.content }));

        // Extraire les noms d'entreprises des messages précédents pour maintenir le contexte
        // On parcourt du plus ancien au plus récent, le dernier trouvé sera le contexte actuel
        for (const msg of rows) {
          const namesInMessage = extractCompanyNames(msg.content);
          for (const name of namesInMessage) {
            const foundLead = await findLeadByName(tenantId, name);
            if (foundLead) {
              conversationContextLead = foundLead;
            }
          }
        }
        if (conversationContextLead) {
          log(`📍 Lead en contexte de conversation: ${conversationContextLead.company_name}`);
        }
      } catch (historyErr) {
        log('⚠️ Erreur récupération historique (continue sans):', historyErr.message);
      }
    }

    // ========== RECHERCHE INTELLIGENTE DE LEADS MENTIONNÉS ==========
    // Détecter si l'utilisateur mentionne un lead spécifique et le chercher
    let mentionedLeads = [];
    const companyNamesInMessage = extractCompanyNames(message);

    if (companyNamesInMessage.length > 0) {
      log(`🔍 Noms d'entreprises détectés dans le message: ${companyNamesInMessage.join(', ')}`);

      for (const name of companyNamesInMessage) {
        const foundLead = await findLeadByName(tenantId, name);
        if (foundLead) {
          mentionedLeads.push(foundLead);
          log(`✅ Lead trouvé: ${foundLead.company_name} (ID: ${foundLead.id})`);
        }
      }
    }

    // Si aucun lead spécifique mais mots-clés de recherche, faire une recherche générique
    if (mentionedLeads.length === 0) {
      const searchKeywords = message.match(/(?:cherche|trouve|montre|ouvre|affiche)\s+(?:le\s+lead\s+)?["']?([^"'\n]{3,40})["']?/i);
      if (searchKeywords) {
        const searchResults = await searchLeads(tenantId, searchKeywords[1], 5);
        mentionedLeads = searchResults;
        log(`🔍 Recherche générique pour "${searchKeywords[1]}": ${searchResults.length} résultats`);
      }
    }

    // ========== GESTION DU CONTEXTE DE CONVERSATION ==========
    // RÈGLE IMPORTANTE: Si on a un lead en contexte de conversation et que l'utilisateur
    // demande une action SANS spécifier de lead, on utilise automatiquement le lead en contexte

    // Mots-clés d'action qui impliquent un lead
    const actionKeywords = /\b(créer|creer|envoyer|envoie|ajouter|ajoute|noter|note|tâche|tache|rappel|email|mail|appeler|appel|relance|statut|ouvre|ouvrir|affiche|montre)\b/i;

    // Références contextuelles explicites
    const contextualReferences = /\b(ce lead|le lead|ouvre[- ]?le|celui[- ]?ci|lui|cette entreprise|ce prospect|ouvrir le lead|pour lui|sur lui)\b/i;

    // Si on a un lead en contexte ET (action demandée OU référence contextuelle) ET pas de lead spécifié
    if (conversationContextLead && mentionedLeads.length === 0) {
      if (contextualReferences.test(message) || actionKeywords.test(message)) {
        mentionedLeads.push(conversationContextLead);
        log(`🔄 Utilisation automatique du lead en contexte: ${conversationContextLead.company_name}`);
      }
    }

    // Construire le contexte complet avec TOUT ce qu'on a trouvé
    const fullContext = {
      lead,
      history,
      tasks,
      stats,
      hotLeads,
      mentionedLeads, // Leads trouvés dans le message actuel
      conversationContextLead // Le dernier lead discuté dans la conversation
    };

    // Construire le prompt système avec TOUTES les données
    const systemPrompt = buildSystemPrompt(req.user, fullContext);

    // Préparer les messages pour l'API Claude
    let messages = [...conversationMessages];
    messages.push({ role: 'user', content: message });

    // Appeler Claude avec temperature basse pour plus de consistance
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      temperature: 0.3,  // Basse température = plus rigoureux, suit mieux les règles
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
