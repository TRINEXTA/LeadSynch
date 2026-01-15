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
  SEND_EMAIL: 'send_email',
  ADD_NOTE: 'add_note',
  ASSIGN_LEAD: 'assign_lead',
  GET_LEAD_INFO: 'get_lead_info',
  GET_LEAD_HISTORY: 'get_lead_history',
  GENERATE_EMAIL: 'generate_email',
  GENERATE_MESSAGE: 'generate_message',
  UPDATE_FIELD: 'update_field'
};

/**
 * Récupère les informations détaillées d'un lead
 * @param {string} leadId - ID du lead
 * @param {string} tenantId - ID du tenant
 */
async function getLeadDetails(leadId, tenantId) {
  const lead = await queryOne(
    `SELECT l.*,
      ld.name as database_name,
      u.first_name || ' ' || u.last_name as assigned_to_name,
      COALESCE((SELECT COUNT(*) FROM email_events WHERE lead_id = l.id AND event_type = 'open'), 0) as email_opens,
      COALESCE((SELECT COUNT(*) FROM email_events WHERE lead_id = l.id AND event_type = 'click'), 0) as email_clicks,
      COALESCE((SELECT COUNT(*) FROM email_queue WHERE lead_id = l.id AND status = 'sent'), 0) as emails_sent,
      COALESCE((SELECT COUNT(*) FROM call_logs WHERE lead_id = l.id), 0) as total_calls,
      (SELECT MAX(created_at) FROM email_events WHERE lead_id = l.id) as last_email_interaction,
      (SELECT MAX(created_at) FROM call_logs WHERE lead_id = l.id) as last_call
     FROM leads l
     LEFT JOIN lead_databases ld ON l.database_id = ld.id
     LEFT JOIN users u ON l.assigned_to = u.id
     WHERE l.id = $1 AND l.tenant_id = $2`,
    [leadId, tenantId]
  );

  if (!lead) return null;

  // Calculer le score et le health label
  const interactions = {
    opens: parseInt(lead.email_opens) || 0,
    clicks: parseInt(lead.email_clicks) || 0,
    emails_sent: parseInt(lead.emails_sent) || 0
  };

  const callHistory = {
    total_calls: parseInt(lead.total_calls) || 0
  };

  const { score, grade, breakdown } = calculateLeadScore(lead, interactions);
  const healthLabel = calculateHealthLabel(lead, interactions);
  const nextAction = calculateNextBestAction(lead, interactions, callHistory);

  return {
    ...lead,
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
  // Emails envoyés
  const { rows: emails } = await query(
    `SELECT 'email' as type, subject, created_at, status
     FROM email_queue
     WHERE lead_id = $1 AND tenant_id = $2
     ORDER BY created_at DESC
     LIMIT 10`,
    [leadId, tenantId]
  );

  // Appels
  const { rows: calls } = await query(
    `SELECT 'call' as type, outcome, notes, duration_seconds, created_at
     FROM call_logs
     WHERE lead_id = $1
     ORDER BY created_at DESC
     LIMIT 10`,
    [leadId]
  );

  // Notes
  const { rows: notes } = await query(
    `SELECT 'note' as type, content, created_at,
       u.first_name || ' ' || u.last_name as author
     FROM lead_notes ln
     LEFT JOIN users u ON ln.created_by = u.id
     WHERE ln.lead_id = $1
     ORDER BY ln.created_at DESC
     LIMIT 10`,
    [leadId]
  );

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

    default:
      return { success: false, message: `Action inconnue: ${action}` };
  }
}

/**
 * Construit le prompt système avec le contexte du lead
 */
function buildSystemPrompt(user, lead, history) {
  let context = `Tu es ASEFI, l'assistant IA intelligent de LeadSynch, une plateforme CRM B2B.

Tu peux:
1. Répondre aux questions sur les leads et l'activité commerciale
2. Générer du contenu personnalisé (emails, messages)
3. Exécuter des actions (avec la permission de l'utilisateur)

INFORMATIONS UTILISATEUR:
- Nom: ${user.first_name} ${user.last_name}
- Rôle: ${user.role}
- Tenant ID: ${user.tenant_id}

`;

  if (lead) {
    context += `
CONTEXTE DU LEAD ACTUEL:
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
- Emails envoyés: ${lead.emails_sent}
- Emails ouverts: ${lead.email_opens}
- Appels: ${lead.total_calls}
- Assigné à: ${lead.assigned_to_name || 'Non assigné'}
- Base de données: ${lead.database_name || 'Aucune'}
- Créé le: ${lead.created_at}
- Dernière activité email: ${lead.last_email_interaction || 'Aucune'}
- Dernier appel: ${lead.last_call || 'Aucun'}
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
          context += `${i + 1}. [Note] ${h.content.substring(0, 100)}... par ${h.author} (${new Date(h.created_at).toLocaleDateString('fr-FR')})\n`;
        }
      });
    }
  }

  context += `

ACTIONS DISPONIBLES:
Tu peux suggérer ou exécuter les actions suivantes (demande confirmation avant d'exécuter):
- update_status: Changer le statut du lead
- add_note: Ajouter une note au lead
- create_task: Créer une tâche de suivi
- send_email: Envoyer un email (préparé dans la queue)
- update_field: Modifier un champ du lead

FORMAT DE RÉPONSE POUR LES ACTIONS:
Si l'utilisateur demande d'exécuter une action, réponds avec:
[ACTION:type_action]{"param1":"valeur1","param2":"valeur2"}[/ACTION]

Exemple pour mettre à jour le statut:
[ACTION:update_status]{"leadId":"xxx","status":"qualifie"}[/ACTION]

RÈGLES:
1. Sois concis et professionnel
2. Utilise les données réelles fournies ci-dessus
3. Ne jamais inventer d'informations
4. Toujours demander confirmation avant d'exécuter une action
5. Suggère des actions pertinentes basées sur le contexte
6. Génère du contenu personnalisé en utilisant les infos du lead
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

    // Récupérer les infos du lead si spécifié
    let lead = null;
    let history = null;

    if (leadId) {
      lead = await getLeadDetails(leadId, tenantId);
      if (!lead) {
        return res.status(404).json({ error: 'Lead non trouvé' });
      }
      history = await getLeadHistory(leadId, tenantId);
    }

    // Construire le prompt système
    const systemPrompt = buildSystemPrompt(req.user, lead, history);

    // Récupérer l'historique de conversation si existant
    let messages = [];
    if (conversationId) {
      const { rows } = await query(
        `SELECT role, content FROM asefi_messages
         WHERE conversation_id = $1
         ORDER BY created_at ASC
         LIMIT 20`,
        [conversationId]
      );
      messages = rows.map(m => ({ role: m.role, content: m.content }));
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
        const result = await executeAction(action.type, action.params, userId, tenantId);
        executedActions.push({ ...action, result });
      }
    }

    // Sauvegarder la conversation
    let currentConversationId = conversationId;
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
