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
