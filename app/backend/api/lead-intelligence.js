import { log, error } from "../lib/logger.js";
import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { query, queryOne, queryAll } from '../lib/db.js';
import {
  calculateLeadScore,
  calculateAllLeadScores,
  calculateHealthLabel,
  calculateNextBestAction,
  updateAllHealthLabels,
  getLeadsByHealthLabel,
  getHealthLabelStats,
  getLeadsWithPendingActions,
  HEALTH_LABEL_CONFIG,
  ACTION_TYPE_CONFIG
} from '../lib/leadScoring.js';
import {
  findDuplicates,
  checkDuplicateBeforeCreate,
  getPendingDuplicates,
  mergeLeads,
  dismissDuplicate,
  scanAllDuplicates,
  getDuplicateStats
} from '../lib/duplicateDetection.js';

const router = express.Router();

// ========== HEALTH LABELS ==========

/**
 * GET /health-labels/stats
 * Récupère les statistiques des health labels pour le tenant
 */
router.get('/health-labels/stats', authMiddleware, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const stats = await getHealthLabelStats(tenantId);

    res.json({
      success: true,
      stats,
      config: HEALTH_LABEL_CONFIG
    });
  } catch (err) {
    error('Erreur stats health labels:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /health-labels/:label
 * Récupère les leads par health label
 */
router.get('/health-labels/:label', authMiddleware, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { label } = req.params;
    const limit = parseInt(req.query.limit) || 100;

    const validLabels = ['hot', 'warm', 'cold', 'at_risk', 'lost', 'won', 'new'];
    if (!validLabels.includes(label)) {
      return res.status(400).json({ error: 'Label invalide' });
    }

    const leads = await getLeadsByHealthLabel(tenantId, label, limit);

    res.json({
      success: true,
      label,
      config: HEALTH_LABEL_CONFIG[label],
      leads,
      count: leads.length
    });
  } catch (err) {
    error('Erreur récupération leads par label:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /health-labels/refresh
 * Force le recalcul des health labels pour tous les leads
 */
router.post('/health-labels/refresh', authMiddleware, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;

    // Vérifier les permissions (admin ou manager seulement)
    if (!['admin', 'manager', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Permission refusée' });
    }

    const stats = await updateAllHealthLabels(tenantId);

    res.json({
      success: true,
      message: 'Health labels mis à jour',
      stats
    });
  } catch (err) {
    error('Erreur refresh health labels:', err);
    res.status(500).json({ error: err.message });
  }
});

// ========== NEXT BEST ACTION ==========

/**
 * GET /next-actions
 * Récupère les leads avec des actions en attente, triés par priorité
 */
router.get('/next-actions', authMiddleware, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const limit = parseInt(req.query.limit) || 50;

    const leads = await getLeadsWithPendingActions(tenantId, limit);

    res.json({
      success: true,
      leads,
      count: leads.length,
      action_types: ACTION_TYPE_CONFIG
    });
  } catch (err) {
    error('Erreur récupération next actions:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /next-action/:leadId
 * Calcule la prochaine meilleure action pour un lead spécifique
 */
router.get('/next-action/:leadId', authMiddleware, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { leadId } = req.params;

    // Récupérer le lead avec ses interactions
    const lead = await queryOne(
      `SELECT l.*,
        COALESCE((SELECT COUNT(*) FROM email_events WHERE lead_id = l.id AND event_type = 'open'), 0) as opens,
        COALESCE((SELECT COUNT(*) FROM email_events WHERE lead_id = l.id AND event_type = 'click'), 0) as clicks,
        (SELECT MAX(created_at) FROM email_events WHERE lead_id = l.id) as last_interaction_date,
        (SELECT MAX(created_at) FROM email_events WHERE lead_id = l.id AND event_type = 'open') as last_open_date,
        (SELECT MAX(created_at) FROM email_events WHERE lead_id = l.id AND event_type = 'click') as last_click_date,
        COALESCE((SELECT COUNT(*) FROM email_queue WHERE lead_id = l.id AND status = 'sent'), 0) as emails_sent,
        COALESCE((SELECT COUNT(*) FROM call_logs WHERE lead_id = l.id), 0) as total_calls,
        COALESCE((SELECT COUNT(*) FROM call_logs WHERE lead_id = l.id AND outcome = 'answered'), 0) as calls_answered,
        COALESCE((SELECT COUNT(*) FROM call_logs WHERE lead_id = l.id AND outcome IN ('no_answer', 'busy', 'voicemail')), 0) as calls_unanswered
       FROM leads l
       WHERE l.id = $1 AND l.tenant_id = $2`,
      [leadId, tenantId]
    );

    if (!lead) {
      return res.status(404).json({ error: 'Lead non trouvé' });
    }

    const interactions = {
      opens: parseInt(lead.opens) || 0,
      clicks: parseInt(lead.clicks) || 0,
      last_interaction_date: lead.last_interaction_date,
      last_open_date: lead.last_open_date,
      last_click_date: lead.last_click_date,
      emails_sent: parseInt(lead.emails_sent) || 0
    };

    const callHistory = {
      total_calls: parseInt(lead.total_calls) || 0,
      calls_answered: parseInt(lead.calls_answered) || 0,
      calls_unanswered: parseInt(lead.calls_unanswered) || 0
    };

    const healthLabel = calculateHealthLabel(lead, interactions);
    const nextAction = calculateNextBestAction(lead, interactions, callHistory);
    const { score, grade, breakdown } = calculateLeadScore(lead, interactions);

    res.json({
      success: true,
      lead_id: leadId,
      health_label: healthLabel,
      health_label_config: HEALTH_LABEL_CONFIG[healthLabel],
      next_action: {
        ...nextAction,
        config: ACTION_TYPE_CONFIG[nextAction.type]
      },
      score: {
        value: score,
        grade,
        breakdown
      }
    });
  } catch (err) {
    error('Erreur calcul next action:', err);
    res.status(500).json({ error: err.message });
  }
});

// ========== DUPLICATAS ==========

/**
 * GET /duplicates
 * Récupère les duplicatas en attente de traitement
 */
router.get('/duplicates', authMiddleware, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const limit = parseInt(req.query.limit) || 50;

    const duplicates = await getPendingDuplicates(tenantId, limit);
    const stats = await getDuplicateStats(tenantId);

    res.json({
      success: true,
      duplicates,
      stats
    });
  } catch (err) {
    error('Erreur récupération duplicatas:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /duplicates/check
 * Vérifie si les données d'un lead sont un duplicata potentiel
 */
router.post('/duplicates/check', authMiddleware, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const leadData = req.body;

    const result = await checkDuplicateBeforeCreate(leadData, tenantId);

    res.json({
      success: true,
      is_duplicate: result.isDuplicate,
      duplicates: result.duplicates,
      high_confidence_match: result.highConfidenceDuplicate
    });
  } catch (err) {
    error('Erreur vérification duplicata:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /duplicates/scan
 * Lance un scan complet pour détecter les duplicatas
 */
router.post('/duplicates/scan', authMiddleware, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;

    // Vérifier les permissions
    if (!['admin', 'manager', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Permission refusée' });
    }

    const stats = await scanAllDuplicates(tenantId);

    res.json({
      success: true,
      message: 'Scan des duplicatas terminé',
      stats
    });
  } catch (err) {
    error('Erreur scan duplicatas:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /duplicates/:id/merge
 * Fusionne deux leads
 */
router.post('/duplicates/:id/merge', authMiddleware, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;
    const { keepLeadId, mergeLeadId } = req.body;

    if (!keepLeadId || !mergeLeadId) {
      return res.status(400).json({ error: 'keepLeadId et mergeLeadId requis' });
    }

    const result = await mergeLeads(tenantId, keepLeadId, mergeLeadId, userId);

    res.json({
      success: true,
      message: 'Leads fusionnés avec succès',
      result
    });
  } catch (err) {
    error('Erreur fusion leads:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /duplicates/:id/dismiss
 * Ignore une détection de duplicata
 */
router.post('/duplicates/:id/dismiss', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await dismissDuplicate(id, userId);

    res.json({
      success: true,
      message: 'Duplicata ignoré',
      result
    });
  } catch (err) {
    error('Erreur rejet duplicata:', err);
    res.status(500).json({ error: err.message });
  }
});

// ========== SCORING ==========

/**
 * POST /scores/refresh
 * Force le recalcul des scores pour tous les leads
 */
router.post('/scores/refresh', authMiddleware, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;

    // Vérifier les permissions
    if (!['admin', 'manager', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Permission refusée' });
    }

    const result = await calculateAllLeadScores(tenantId);

    res.json({
      success: true,
      message: 'Scores recalculés',
      updated: result.updated
    });
  } catch (err) {
    error('Erreur refresh scores:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /score/:leadId
 * Calcule le score d'un lead spécifique
 */
router.get('/score/:leadId', authMiddleware, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { leadId } = req.params;

    const lead = await queryOne(
      `SELECT l.*,
        COALESCE((SELECT COUNT(*) FROM email_events WHERE lead_id = l.id AND event_type = 'open'), 0) as opens,
        COALESCE((SELECT COUNT(*) FROM email_events WHERE lead_id = l.id AND event_type = 'click'), 0) as clicks,
        (SELECT MAX(created_at) FROM email_events WHERE lead_id = l.id) as last_interaction_date
       FROM leads l
       WHERE l.id = $1 AND l.tenant_id = $2`,
      [leadId, tenantId]
    );

    if (!lead) {
      return res.status(404).json({ error: 'Lead non trouvé' });
    }

    const interactions = {
      opens: parseInt(lead.opens) || 0,
      clicks: parseInt(lead.clicks) || 0,
      last_interaction_date: lead.last_interaction_date,
      replied: false
    };

    const result = calculateLeadScore(lead, interactions);

    res.json({
      success: true,
      lead_id: leadId,
      ...result
    });
  } catch (err) {
    error('Erreur calcul score:', err);
    res.status(500).json({ error: err.message });
  }
});

// ========== DASHBOARD INTELLIGENCE ==========

/**
 * GET /dashboard
 * Récupère toutes les données d'intelligence pour le dashboard
 */
router.get('/dashboard', authMiddleware, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;

    // Récupérer en parallèle
    const [healthStats, duplicateStats, hotLeads, atRiskLeads, pendingActions] = await Promise.all([
      getHealthLabelStats(tenantId),
      getDuplicateStats(tenantId),
      getLeadsByHealthLabel(tenantId, 'hot', 5),
      getLeadsByHealthLabel(tenantId, 'at_risk', 5),
      getLeadsWithPendingActions(tenantId, 10)
    ]);

    res.json({
      success: true,
      health_labels: {
        stats: healthStats,
        config: HEALTH_LABEL_CONFIG
      },
      duplicates: duplicateStats,
      hot_leads: hotLeads,
      at_risk_leads: atRiskLeads,
      pending_actions: {
        leads: pendingActions,
        action_types: ACTION_TYPE_CONFIG
      }
    });
  } catch (err) {
    error('Erreur dashboard intelligence:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
