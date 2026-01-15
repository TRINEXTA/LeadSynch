import { log, error, warn } from "../lib/logger.js";
import { query as q } from './db.js';

/**
 * Algorithme de scoring automatique des leads
 * Score sur 100 points basé sur différents critères
 */

/**
 * Calcule le score d'un lead
 * @param {object} lead - Objet lead complet
 * @param {object} interactions - Historique d'interactions
 * @returns {number} - Score entre 0 et 100
 */
export function calculateLeadScore(lead, interactions = {}) {
  let score = 0;
  const breakdown = {};

  // === 1. DONNÉES DE CONTACT (25 points max) ===
  let contactScore = 0;

  // Email présent et valide (10 pts)
  if (lead.email && lead.email.includes('@')) {
    contactScore += 10;
  }

  // Téléphone présent (8 pts)
  if (lead.phone || lead.direct_line) {
    contactScore += 8;
  }

  // SIRET présent (5 pts - entreprise légitime)
  if (lead.siret) {
    contactScore += 5;
  }

  // Site web présent (2 pts)
  if (lead.website) {
    contactScore += 2;
  }

  breakdown.contact_data = contactScore;
  score += contactScore;

  // === 2. ENGAGEMENT (30 points max) ===
  let engagementScore = 0;

  // Emails ouverts
  const openRate = interactions.opens || 0;
  engagementScore += Math.min(openRate * 2, 10); // Max 10 pts

  // Liens cliqués
  const clickRate = interactions.clicks || 0;
  engagementScore += Math.min(clickRate * 3, 12); // Max 12 pts

  // A répondu à un email
  if (interactions.replied) {
    engagementScore += 8;
  }

  breakdown.engagement = Math.round(engagementScore);
  score += engagementScore;

  // === 3. PROFIL ENTREPRISE (20 points max) ===
  let companyScore = 0;

  // Taille d'entreprise (effectif)
  const effectif = parseInt(lead.effectif) || 0;
  if (effectif > 500) companyScore += 10;
  else if (effectif > 100) companyScore += 8;
  else if (effectif > 50) companyScore += 6;
  else if (effectif > 10) companyScore += 4;
  else if (effectif > 0) companyScore += 2;

  // Secteur d'activité prioritaire (à personnaliser)
  const prioritySectors = ['tech', 'industrie', 'services'];
  if (lead.sector && prioritySectors.includes(lead.sector.toLowerCase())) {
    companyScore += 5;
  }

  // Localisation géographique (ville importante)
  const majorCities = ['paris', 'lyon', 'marseille', 'toulouse', 'bordeaux', 'lille', 'nantes'];
  if (lead.city && majorCities.includes(lead.city.toLowerCase())) {
    companyScore += 5;
  }

  breakdown.company_profile = companyScore;
  score += companyScore;

  // === 4. COMPORTEMENT & STATUT (15 points max) ===
  let behaviorScore = 0;

  // Statut dans le pipeline
  const statusScores = {
    'nouveau': 2,
    'contacte': 5,
    'qualifie': 8,
    'rdv': 12,
    'proposition': 15,
    'negociation': 18,
    'gagne': 0, // Déjà client
    'perdu': 0
  };
  behaviorScore += statusScores[lead.status] || 0;

  // Limiter à 15 pts
  behaviorScore = Math.min(behaviorScore, 15);

  breakdown.behavior = behaviorScore;
  score += behaviorScore;

  // === 5. TIMING & FRAÎCHEUR (10 points max) ===
  let timingScore = 0;

  // Lead récent (moins de 7 jours)
  if (lead.created_at) {
    const daysSinceCreation = Math.floor(
      (Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceCreation <= 7) timingScore += 5;
    else if (daysSinceCreation <= 30) timingScore += 3;
    else if (daysSinceCreation <= 90) timingScore += 1;
  }

  // Dernière interaction récente
  if (interactions.last_interaction_date) {
    const daysSinceLastInteraction = Math.floor(
      (Date.now() - new Date(interactions.last_interaction_date).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceLastInteraction <= 7) timingScore += 5;
    else if (daysSinceLastInteraction <= 14) timingScore += 3;
    else if (daysSinceLastInteraction <= 30) timingScore += 1;
  }

  breakdown.timing = timingScore;
  score += timingScore;

  // Arrondir le score final
  score = Math.round(Math.min(score, 100));

  return {
    score,
    grade: getScoreGrade(score),
    breakdown
  };
}

/**
 * Convertit un score numérique en grade (A, B, C, D, F)
 * @param {number} score - Score entre 0 et 100
 * @returns {string} - Grade
 */
function getScoreGrade(score) {
  if (score >= 80) return 'A'; // Hot lead
  if (score >= 60) return 'B'; // Warm lead
  if (score >= 40) return 'C'; // Cold lead
  if (score >= 20) return 'D'; // Very cold lead
  return 'F'; // Dead lead
}

/**
 * Calcule les scores pour tous les leads d'un tenant
 * @param {string} tenantId - ID du tenant
 * @returns {Promise<void>}
 */
export async function calculateAllLeadScores(tenantId) {
  try {
    log(`🎯 Calcul des scores pour tenant ${tenantId}...`);

    // Récupérer tous les leads du tenant
    const { rows: leads } = await q(
      `SELECT l.*,
        (SELECT COUNT(*) FROM email_events WHERE lead_id = l.id AND event_type = 'open') as opens,
        (SELECT COUNT(*) FROM email_events WHERE lead_id = l.id AND event_type = 'click') as clicks,
        (SELECT MAX(created_at) FROM email_events WHERE lead_id = l.id) as last_interaction_date
       FROM leads l
       WHERE l.tenant_id = $1 AND l.status NOT IN ('gagne', 'perdu')`,
      [tenantId]
    );

    log(`📊 ${leads.length} leads à scorer`);

    let updated = 0;

    for (const lead of leads) {
      const interactions = {
        opens: parseInt(lead.opens) || 0,
        clicks: parseInt(lead.clicks) || 0,
        last_interaction_date: lead.last_interaction_date,
        replied: false // TODO: Détecter si le lead a répondu
      };

      const { score, grade } = calculateLeadScore(lead, interactions);

      // Mettre à jour le score dans la base
      await q(
        `UPDATE leads SET score = $1, score_grade = $2 WHERE id = $3`,
        [score, grade, lead.id]
      );

      updated++;
    }

    log(`✅ ${updated} scores mis à jour`);

    return { updated };
  } catch (error) {
    error('Erreur calcul scores:', error);
    throw error;
  }
}

/**
 * Ajoute les colonnes score et score_grade si elles n'existent pas
 * @returns {Promise<void>}
 */
export async function ensureScoreColumns() {
  try {
    await q(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'leads' AND column_name = 'score'
        ) THEN
          ALTER TABLE leads ADD COLUMN score INTEGER DEFAULT 0;
          ALTER TABLE leads ADD COLUMN score_grade VARCHAR(2) DEFAULT 'F';
          CREATE INDEX idx_leads_score ON leads(score DESC);
          CREATE INDEX idx_leads_score_grade ON leads(score_grade);
          RAISE NOTICE 'Colonnes score ajoutées';
        END IF;
      END
      $$;
    `);

    log('✅ Colonnes de scoring vérifiées');
  } catch (error) {
    error('Erreur création colonnes score:', error);
    throw error;
  }
}

/**
 * Récupère les meilleurs leads (scores les plus élevés)
 * @param {string} tenantId - ID du tenant
 * @param {number} limit - Nombre de leads à retourner
 * @returns {Promise<array>} - Top leads
 */
export async function getTopLeads(tenantId, limit = 50) {
  try {
    const { rows } = await q(
      `SELECT * FROM leads
       WHERE tenant_id = $1 AND score > 0
       ORDER BY score DESC, created_at DESC
       LIMIT $2`,
      [tenantId, limit]
    );

    return rows;
  } catch (error) {
    error('Erreur récupération top leads:', error);
    throw error;
  }
}

/**
 * Récupère les leads par grade
 * @param {string} tenantId - ID du tenant
 * @param {string} grade - Grade (A, B, C, D, F)
 * @returns {Promise<array>} - Leads du grade spécifié
 */
export async function getLeadsByGrade(tenantId, grade) {
  try {
    const { rows } = await q(
      `SELECT * FROM leads
       WHERE tenant_id = $1 AND score_grade = $2
       ORDER BY score DESC, created_at DESC`,
      [tenantId, grade]
    );

    return rows;
  } catch (error) {
    error('Erreur récupération leads par grade:', error);
    throw error;
  }
}

// ========== HEALTH LABELS ==========

/**
 * Labels de santé des deals
 * - hot: Score > 70, activité dans les 7 derniers jours
 * - warm: Score 40-70, activité dans les 14 derniers jours
 * - cold: Score 20-40, peu d'activité récente
 * - at_risk: Score < 20 ou inactif > 14 jours
 * - lost: Refus explicite ou désabonné
 * - won: Converti en client
 * - new: Nouveau lead sans activité
 */
const HEALTH_LABELS = {
  HOT: 'hot',
  WARM: 'warm',
  COLD: 'cold',
  AT_RISK: 'at_risk',
  LOST: 'lost',
  WON: 'won',
  NEW: 'new'
};

/**
 * Calcule le health label d'un lead
 * @param {object} lead - Objet lead avec score et dates
 * @param {object} interactions - Historique d'interactions
 * @returns {string} - Health label
 */
export function calculateHealthLabel(lead, interactions = {}) {
  const score = lead.score || 0;
  const status = (lead.status || '').toLowerCase();

  // Statuts terminaux
  if (status === 'gagne' || status === 'won') {
    return HEALTH_LABELS.WON;
  }

  if (status === 'perdu' || status === 'lost' || status === 'refuse' || status === 'unsubscribed') {
    return HEALTH_LABELS.LOST;
  }

  // Calculer les jours depuis la dernière activité
  const lastActivity = lead.last_activity_at || interactions.last_interaction_date || lead.created_at;
  const daysSinceActivity = lastActivity
    ? Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  // Calculer les jours depuis la création
  const daysSinceCreation = lead.created_at
    ? Math.floor((Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  // Nouveau lead (moins de 3 jours, pas d'activité)
  if (daysSinceCreation <= 3 && !interactions.opens && !interactions.clicks && daysSinceActivity >= daysSinceCreation) {
    return HEALTH_LABELS.NEW;
  }

  // AT RISK: Très faible score ou très inactif
  if (score < 20 || daysSinceActivity > 21) {
    return HEALTH_LABELS.AT_RISK;
  }

  // HOT: Score élevé et activité très récente
  if (score >= 70 && daysSinceActivity <= 7) {
    return HEALTH_LABELS.HOT;
  }

  // WARM: Score moyen-élevé ou activité récente
  if (score >= 40 || daysSinceActivity <= 14) {
    return HEALTH_LABELS.WARM;
  }

  // COLD: Reste
  return HEALTH_LABELS.COLD;
}

/**
 * Configuration des labels de santé avec couleurs et icônes
 */
export const HEALTH_LABEL_CONFIG = {
  hot: {
    label: 'Chaud',
    color: '#ef4444', // red-500
    bgColor: '#fef2f2', // red-50
    icon: '🔥',
    description: 'Prospect très engagé, à contacter immédiatement'
  },
  warm: {
    label: 'Tiède',
    color: '#f59e0b', // amber-500
    bgColor: '#fffbeb', // amber-50
    icon: '🟡',
    description: 'Intérêt modéré, maintenir le contact'
  },
  cold: {
    label: 'Froid',
    color: '#3b82f6', // blue-500
    bgColor: '#eff6ff', // blue-50
    icon: '❄️',
    description: 'Peu d\'engagement, relancer avec nouvelle approche'
  },
  at_risk: {
    label: 'À risque',
    color: '#ef4444', // red-500
    bgColor: '#fef2f2', // red-50
    icon: '⚠️',
    description: 'Risque de perte, action urgente requise'
  },
  lost: {
    label: 'Perdu',
    color: '#6b7280', // gray-500
    bgColor: '#f3f4f6', // gray-100
    icon: '❌',
    description: 'Prospect perdu ou désabonné'
  },
  won: {
    label: 'Gagné',
    color: '#22c55e', // green-500
    bgColor: '#f0fdf4', // green-50
    icon: '✅',
    description: 'Converti en client'
  },
  new: {
    label: 'Nouveau',
    color: '#8b5cf6', // violet-500
    bgColor: '#f5f3ff', // violet-50
    icon: '✨',
    description: 'Nouveau prospect à qualifier'
  }
};

// ========== NEXT BEST ACTION ==========

/**
 * Types d'actions suggérées
 */
const ACTION_TYPES = {
  CALL: 'call',
  EMAIL: 'email',
  SMS: 'sms',
  WHATSAPP: 'whatsapp',
  LINKEDIN: 'linkedin',
  WAIT: 'wait',
  CLOSE: 'close',
  QUALIFY: 'qualify',
  FOLLOW_UP: 'follow_up',
  MEETING: 'meeting'
};

/**
 * Détermine la prochaine meilleure action pour un lead
 * @param {object} lead - Objet lead complet
 * @param {object} interactions - Historique d'interactions
 * @param {object} callHistory - Historique des appels
 * @returns {object} - { action, reason, priority, scheduledFor }
 */
export function calculateNextBestAction(lead, interactions = {}, callHistory = {}) {
  const healthLabel = calculateHealthLabel(lead, interactions);
  const score = lead.score || 0;
  const status = (lead.status || 'nouveau').toLowerCase();

  // Jours depuis dernière activité
  const lastActivity = lead.last_activity_at || interactions.last_interaction_date;
  const daysSinceActivity = lastActivity
    ? Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // Compteurs d'interactions
  const emailsSent = interactions.emails_sent || 0;
  const callsCount = callHistory.total_calls || 0;
  const callsAnswered = callHistory.calls_answered || 0;
  const callsUnanswered = callHistory.calls_unanswered || 0;

  // Vérifier si email ouvert récemment
  const emailOpenedRecently = interactions.last_open_date &&
    (Date.now() - new Date(interactions.last_open_date).getTime()) < 48 * 60 * 60 * 1000;

  // Vérifier si lien cliqué récemment
  const linkClickedRecently = interactions.last_click_date &&
    (Date.now() - new Date(interactions.last_click_date).getTime()) < 24 * 60 * 60 * 1000;

  let action = { type: null, reason: '', priority: 5, scheduledFor: null };

  // ===== LOGIQUE DE DÉCISION =====

  // Cas 1: Lien cliqué récemment → Appeler immédiatement
  if (linkClickedRecently) {
    return {
      type: ACTION_TYPES.CALL,
      reason: 'A cliqué sur un lien - intérêt confirmé, appeler dans les 2h',
      priority: 10,
      scheduledFor: new Date(Date.now() + 2 * 60 * 60 * 1000) // Dans 2h
    };
  }

  // Cas 2: Email ouvert récemment → Appeler rapidement
  if (emailOpenedRecently) {
    return {
      type: ACTION_TYPES.CALL,
      reason: 'Email ouvert récemment - prospect attentif, appeler aujourd\'hui',
      priority: 9,
      scheduledFor: new Date(Date.now() + 4 * 60 * 60 * 1000) // Dans 4h
    };
  }

  // Cas 3: Lead HOT → Appel prioritaire
  if (healthLabel === HEALTH_LABELS.HOT) {
    if (callsCount === 0) {
      return {
        type: ACTION_TYPES.CALL,
        reason: 'Lead chaud jamais appelé - premier contact prioritaire',
        priority: 9,
        scheduledFor: new Date()
      };
    }
    if (callsUnanswered > 0 && callsUnanswered < 3) {
      return {
        type: ACTION_TYPES.CALL,
        reason: `Rappeler (${callsUnanswered} tentative${callsUnanswered > 1 ? 's' : ''} sans réponse)`,
        priority: 8,
        scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000) // Demain
      };
    }
  }

  // Cas 4: Lead AT_RISK → Dernière tentative ou clôture
  if (healthLabel === HEALTH_LABELS.AT_RISK) {
    if (callsUnanswered >= 3 && emailsSent >= 3) {
      return {
        type: ACTION_TYPES.CLOSE,
        reason: '3+ appels et emails sans réponse - proposer clôture',
        priority: 3,
        scheduledFor: null
      };
    }
    if (daysSinceActivity && daysSinceActivity > 14) {
      return {
        type: ACTION_TYPES.EMAIL,
        reason: 'Inactif depuis plus de 14 jours - email de relance',
        priority: 5,
        scheduledFor: new Date()
      };
    }
  }

  // Cas 5: Nouveau lead → Qualifier
  if (healthLabel === HEALTH_LABELS.NEW || status === 'nouveau') {
    if (!lead.email && !lead.phone) {
      return {
        type: ACTION_TYPES.QUALIFY,
        reason: 'Enrichir les données - email ou téléphone manquant',
        priority: 6,
        scheduledFor: new Date()
      };
    }
    if (lead.phone) {
      return {
        type: ACTION_TYPES.CALL,
        reason: 'Nouveau lead avec téléphone - premier appel de qualification',
        priority: 7,
        scheduledFor: new Date()
      };
    }
    return {
      type: ACTION_TYPES.EMAIL,
      reason: 'Nouveau lead - envoyer email d\'introduction',
      priority: 6,
      scheduledFor: new Date()
    };
  }

  // Cas 6: Lead WARM → Maintenir le contact
  if (healthLabel === HEALTH_LABELS.WARM) {
    if (emailsSent > 0 && callsCount === 0 && lead.phone) {
      return {
        type: ACTION_TYPES.CALL,
        reason: 'Emails envoyés mais jamais appelé - tenter un appel',
        priority: 6,
        scheduledFor: new Date()
      };
    }
    if (daysSinceActivity && daysSinceActivity > 5) {
      return {
        type: ACTION_TYPES.FOLLOW_UP,
        reason: `Pas de contact depuis ${daysSinceActivity} jours - planifier relance`,
        priority: 5,
        scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000)
      };
    }
  }

  // Cas 7: Lead COLD → Tentative de réactivation
  if (healthLabel === HEALTH_LABELS.COLD) {
    if (emailsSent < 2) {
      return {
        type: ACTION_TYPES.EMAIL,
        reason: 'Lead froid avec peu d\'emails - tenter nouvelle approche',
        priority: 4,
        scheduledFor: new Date(Date.now() + 48 * 60 * 60 * 1000) // Dans 2 jours
      };
    }
    return {
      type: ACTION_TYPES.WAIT,
      reason: 'Lead froid - attendre avant nouvelle tentative',
      priority: 2,
      scheduledFor: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Dans 7 jours
    };
  }

  // Cas par défaut
  return {
    type: ACTION_TYPES.FOLLOW_UP,
    reason: 'Planifier un suivi régulier',
    priority: 4,
    scheduledFor: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // Dans 3 jours
  };
}

/**
 * Configuration des types d'actions avec labels et icônes
 */
export const ACTION_TYPE_CONFIG = {
  call: { label: 'Appeler', icon: '📞', color: '#3b82f6' },
  email: { label: 'Envoyer email', icon: '📧', color: '#8b5cf6' },
  sms: { label: 'Envoyer SMS', icon: '💬', color: '#22c55e' },
  whatsapp: { label: 'Envoyer WhatsApp', icon: '📱', color: '#25d366' },
  linkedin: { label: 'Contacter LinkedIn', icon: '💼', color: '#0077b5' },
  wait: { label: 'Attendre', icon: '⏳', color: '#6b7280' },
  close: { label: 'Clôturer', icon: '🚪', color: '#ef4444' },
  qualify: { label: 'Qualifier', icon: '🔍', color: '#f59e0b' },
  follow_up: { label: 'Relancer', icon: '🔄', color: '#06b6d4' },
  meeting: { label: 'Planifier RDV', icon: '📅', color: '#ec4899' }
};

/**
 * Met à jour les health labels et next best actions pour tous les leads d'un tenant
 * @param {string} tenantId - ID du tenant
 * @returns {Promise<object>} - { updated, hot, warm, cold, at_risk }
 */
export async function updateAllHealthLabels(tenantId) {
  try {
    log(`🏷️ Mise à jour des health labels pour tenant ${tenantId}...`);

    // Récupérer tous les leads actifs avec leurs interactions
    const { rows: leads } = await q(
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
       WHERE l.tenant_id = $1 AND l.status NOT IN ('gagne', 'perdu', 'won', 'lost')`,
      [tenantId]
    );

    log(`📊 ${leads.length} leads à mettre à jour`);

    const stats = { updated: 0, hot: 0, warm: 0, cold: 0, at_risk: 0, new: 0 };

    for (const lead of leads) {
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
      const nba = calculateNextBestAction(lead, interactions, callHistory);

      // Mettre à jour le lead
      await q(
        `UPDATE leads
         SET health_label = $1,
             health_label_updated_at = NOW(),
             next_best_action = $2,
             next_best_action_date = $3
         WHERE id = $4`,
        [healthLabel, nba.reason, nba.scheduledFor, lead.id]
      );

      stats.updated++;
      if (healthLabel === 'hot') stats.hot++;
      else if (healthLabel === 'warm') stats.warm++;
      else if (healthLabel === 'cold') stats.cold++;
      else if (healthLabel === 'at_risk') stats.at_risk++;
      else if (healthLabel === 'new') stats.new++;
    }

    log(`✅ ${stats.updated} health labels mis à jour`);
    log(`   🔥 Hot: ${stats.hot} | 🟡 Warm: ${stats.warm} | ❄️ Cold: ${stats.cold} | ⚠️ At Risk: ${stats.at_risk} | ✨ New: ${stats.new}`);

    return stats;
  } catch (err) {
    error('Erreur mise à jour health labels:', err);
    throw err;
  }
}

/**
 * Récupère les leads par health label
 * @param {string} tenantId - ID du tenant
 * @param {string} healthLabel - Label (hot, warm, cold, at_risk, lost, won, new)
 * @param {number} limit - Nombre max de résultats
 * @returns {Promise<array>}
 */
export async function getLeadsByHealthLabel(tenantId, healthLabel, limit = 100) {
  try {
    const { rows } = await q(
      `SELECT l.*,
        (SELECT COUNT(*) FROM email_events WHERE lead_id = l.id AND event_type = 'open') as email_opens,
        (SELECT COUNT(*) FROM email_events WHERE lead_id = l.id AND event_type = 'click') as email_clicks
       FROM leads l
       WHERE l.tenant_id = $1 AND l.health_label = $2
       ORDER BY l.score DESC, l.last_activity_at DESC NULLS LAST
       LIMIT $3`,
      [tenantId, healthLabel, limit]
    );

    return rows;
  } catch (err) {
    error('Erreur récupération leads par health label:', err);
    throw err;
  }
}

/**
 * Récupère les statistiques de health labels pour un tenant
 * @param {string} tenantId - ID du tenant
 * @returns {Promise<object>}
 */
export async function getHealthLabelStats(tenantId) {
  try {
    const { rows } = await q(
      `SELECT
        COALESCE(health_label, 'unknown') as label,
        COUNT(*) as count,
        AVG(score) as avg_score
       FROM leads
       WHERE tenant_id = $1 AND status NOT IN ('gagne', 'perdu')
       GROUP BY health_label
       ORDER BY
         CASE health_label
           WHEN 'hot' THEN 1
           WHEN 'warm' THEN 2
           WHEN 'new' THEN 3
           WHEN 'cold' THEN 4
           WHEN 'at_risk' THEN 5
           ELSE 6
         END`,
      [tenantId]
    );

    const stats = {
      total: 0,
      by_label: {}
    };

    for (const row of rows) {
      stats.by_label[row.label] = {
        count: parseInt(row.count),
        avg_score: Math.round(parseFloat(row.avg_score) || 0)
      };
      stats.total += parseInt(row.count);
    }

    return stats;
  } catch (err) {
    error('Erreur récupération stats health labels:', err);
    throw err;
  }
}

/**
 * Récupère les leads avec leurs next best actions triés par priorité
 * @param {string} tenantId - ID du tenant
 * @param {number} limit - Nombre max de résultats
 * @returns {Promise<array>}
 */
export async function getLeadsWithPendingActions(tenantId, limit = 50) {
  try {
    const { rows } = await q(
      `SELECT l.*,
        CASE l.health_label
          WHEN 'hot' THEN 10
          WHEN 'warm' THEN 7
          WHEN 'new' THEN 6
          WHEN 'cold' THEN 4
          WHEN 'at_risk' THEN 8
          ELSE 1
        END as action_priority
       FROM leads l
       WHERE l.tenant_id = $1
         AND l.status NOT IN ('gagne', 'perdu', 'won', 'lost')
         AND l.next_best_action IS NOT NULL
         AND (l.next_best_action_date IS NULL OR l.next_best_action_date <= NOW() + INTERVAL '1 day')
       ORDER BY action_priority DESC, l.score DESC
       LIMIT $2`,
      [tenantId, limit]
    );

    return rows;
  } catch (err) {
    error('Erreur récupération leads avec actions:', err);
    throw err;
  }
}
