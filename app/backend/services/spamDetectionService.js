/**
 * Service de Détection Spam
 *
 * Analyse les campagnes pour détecter les problèmes de délivrabilité
 * et identifier les emails potentiellement arrivés en spam.
 *
 * Méthodes de détection:
 * 1. Analyse des patterns d'ouverture (0% après X jours = suspect)
 * 2. Vérification des domaines (MX records)
 * 3. Analyse des bounces (soft vs hard)
 * 4. Score de spam basé sur le contenu
 *
 * @module services/spamDetectionService
 */

import { log, error, warn } from '../lib/logger.js';
import db from '../config/db.js';
import dns from 'dns';
import { promisify } from 'util';

const resolveMx = promisify(dns.resolveMx);

// ==================== HELPERS ====================
const queryOne = async (query, params = []) => {
  const { rows } = await db.query(query, params);
  return rows[0] || null;
};

const queryAll = async (query, params = []) => {
  const { rows } = await db.query(query, params);
  return rows;
};

const execute = async (query, params = []) => {
  return await db.query(query, params);
};

// ==================== CONFIGURATION ====================
const SPAM_THRESHOLDS = {
  NO_OPEN_DAYS: 7,           // Jours sans ouverture = suspect
  OPEN_RATE_CRITICAL: 5,     // Taux d'ouverture < 5% = critique
  OPEN_RATE_WARNING: 15,     // Taux d'ouverture < 15% = warning
  BOUNCE_RATE_CRITICAL: 10,  // Taux de bounce > 10% = critique
  BOUNCE_RATE_WARNING: 5,    // Taux de bounce > 5% = warning
  MIN_EMAILS_FOR_ANALYSIS: 50 // Minimum d'emails pour une analyse fiable
};

// Mots-clés spam courants
const SPAM_KEYWORDS = [
  'gratuit', 'free', 'gagner', 'winner', 'urgent',
  'offre exclusive', 'agir maintenant', 'dernière chance',
  '100%', 'garanti', 'sans risque', 'cliquez ici',
  'argent facile', 'revenus passifs', 'millionnaire'
];

// ==================== MAIN ANALYSIS FUNCTION ====================
/**
 * Analyse complète d'une campagne pour détecter les problèmes de spam
 *
 * @param {string} campaignId - ID de la campagne
 * @param {string} tenantId - ID du tenant
 * @returns {object} - Résultats de l'analyse
 */
export async function analyzeCampaignSpam(campaignId, tenantId) {
  try {
    log(`🔍 [SPAM DETECTION] Analyse campagne ${campaignId}...`);

    // Récupérer les données de la campagne
    const campaign = await queryOne(`
      SELECT c.*, et.html_body, et.subject as template_subject
      FROM campaigns c
      LEFT JOIN email_templates et ON c.template_id = et.id
      WHERE c.id = $1 AND c.tenant_id = $2
    `, [campaignId, tenantId]);

    if (!campaign) {
      throw new Error('Campagne non trouvée');
    }

    // Stats de base
    const stats = await queryOne(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'sent') as sent,
        COUNT(*) FILTER (WHERE status = 'bounced') as bounced,
        COUNT(*) FILTER (WHERE status = 'failed') as failed
      FROM email_queue
      WHERE campaign_id = $1
    `, [campaignId]);

    // Stats de tracking
    const trackingStats = await queryOne(`
      SELECT
        COUNT(DISTINCT lead_id) FILTER (WHERE event_type = 'open') as opened,
        COUNT(DISTINCT lead_id) FILTER (WHERE event_type = 'click') as clicked,
        COUNT(DISTINCT lead_id) FILTER (WHERE event_type = 'bounce') as tracked_bounces,
        COUNT(DISTINCT lead_id) FILTER (WHERE event_type = 'spam') as marked_spam
      FROM email_tracking
      WHERE campaign_id = $1 AND follow_up_id IS NULL
    `, [campaignId]);

    const sent = parseInt(stats?.sent || 0);
    const opened = parseInt(trackingStats?.opened || 0);
    const clicked = parseInt(trackingStats?.clicked || 0);
    const bounced = parseInt(stats?.bounced || 0);

    // Vérifier si assez d'emails pour analyse fiable
    if (sent < SPAM_THRESHOLDS.MIN_EMAILS_FOR_ANALYSIS) {
      return {
        success: true,
        campaign_id: campaignId,
        warning: `Analyse limitée: seulement ${sent} emails envoyés (minimum ${SPAM_THRESHOLDS.MIN_EMAILS_FOR_ANALYSIS})`,
        stats: { sent, opened, clicked, bounced },
        analysis_possible: false
      };
    }

    // Calculer les taux
    const openRate = (opened / sent) * 100;
    const clickRate = (clicked / sent) * 100;
    const bounceRate = (bounced / sent) * 100;

    // ==================== ANALYSES ====================
    const spamReasons = {};
    const recommendations = [];
    let spamScore = 0;

    // 1. Analyse du taux d'ouverture
    const openRateAnalysis = analyzeOpenRate(openRate, sent, opened);
    if (openRateAnalysis.issues.length > 0) {
      spamReasons.open_rate_issues = openRateAnalysis.issues;
      recommendations.push(...openRateAnalysis.recommendations);
      spamScore += openRateAnalysis.score;
    }

    // 2. Analyse des bounces
    const bounceAnalysis = await analyzeBounces(campaignId, bounced, sent);
    if (bounceAnalysis.issues.length > 0) {
      spamReasons.bounce_issues = bounceAnalysis.issues;
      recommendations.push(...bounceAnalysis.recommendations);
      spamScore += bounceAnalysis.score;
    }

    // 3. Analyse des domaines
    const domainAnalysis = await analyzeEmailDomains(campaignId);
    if (domainAnalysis.problematic.length > 0) {
      spamReasons.domain_issues = domainAnalysis.issues;
      spamReasons.problematic_domains = domainAnalysis.problematic;
      recommendations.push(...domainAnalysis.recommendations);
      spamScore += domainAnalysis.score;
    }

    // 4. Analyse du contenu (sujet + corps)
    const contentAnalysis = analyzeEmailContent(
      campaign.subject || campaign.template_subject,
      campaign.html_body
    );
    if (contentAnalysis.issues.length > 0) {
      spamReasons.content_issues = contentAnalysis.issues;
      recommendations.push(...contentAnalysis.recommendations);
      spamScore += contentAnalysis.score;
    }

    // 5. Analyse temporelle (emails sans ouverture après X jours)
    const temporalAnalysis = await analyzeTemporalPatterns(campaignId);
    if (temporalAnalysis.suspected_spam > 0) {
      spamReasons.no_open_after_7_days = temporalAnalysis.suspected_spam;
      recommendations.push(...temporalAnalysis.recommendations);
      spamScore += temporalAnalysis.score;
    }

    // Calculer le nombre d'emails suspects
    const suspectedSpam = Math.round(
      (temporalAnalysis.suspected_spam || 0) +
      (bounceAnalysis.soft_bounces || 0) * 0.5 +
      (domainAnalysis.invalid_domains_count || 0)
    );

    // Normaliser le score (0-100)
    spamScore = Math.min(100, Math.max(0, spamScore));

    // Sauvegarder l'analyse
    await saveSpamAnalysis(campaignId, tenantId, {
      total_sent: sent,
      total_delivered: sent - bounced,
      total_opened: opened,
      total_bounced: bounced,
      suspected_spam: suspectedSpam,
      spam_score: spamScore,
      spam_reasons: spamReasons,
      recommendations,
      problematic_domains: domainAnalysis.problematic
    });

    log(`✅ [SPAM DETECTION] Analyse terminée. Score: ${spamScore}/100, Suspects: ${suspectedSpam}`);

    return {
      success: true,
      campaign_id: campaignId,
      campaign_name: campaign.name,
      stats: {
        sent,
        delivered: sent - bounced,
        opened,
        clicked,
        bounced,
        open_rate: openRate.toFixed(1),
        click_rate: clickRate.toFixed(1),
        bounce_rate: bounceRate.toFixed(1)
      },
      spam_analysis: {
        spam_score: spamScore,
        spam_level: spamScore < 20 ? 'low' : spamScore < 50 ? 'medium' : 'high',
        suspected_spam: suspectedSpam,
        reasons: spamReasons
      },
      recommendations,
      analyzed_at: new Date().toISOString()
    };

  } catch (err) {
    error('❌ [SPAM DETECTION] Erreur:', err);
    throw err;
  }
}

// ==================== ANALYZE OPEN RATE ====================
function analyzeOpenRate(openRate, sent, opened) {
  const issues = [];
  const recommendations = [];
  let score = 0;

  if (openRate < SPAM_THRESHOLDS.OPEN_RATE_CRITICAL) {
    issues.push(`Taux d'ouverture critique: ${openRate.toFixed(1)}% (< ${SPAM_THRESHOLDS.OPEN_RATE_CRITICAL}%)`);
    recommendations.push('Vérifiez que vos emails ne sont pas filtrés en spam');
    recommendations.push('Testez votre domaine avec mail-tester.com');
    recommendations.push('Révisez votre sujet d\'email pour le rendre plus engageant');
    score = 40;
  } else if (openRate < SPAM_THRESHOLDS.OPEN_RATE_WARNING) {
    issues.push(`Taux d'ouverture faible: ${openRate.toFixed(1)}% (< ${SPAM_THRESHOLDS.OPEN_RATE_WARNING}%)`);
    recommendations.push('Améliorez vos sujets d\'emails pour augmenter les ouvertures');
    score = 20;
  }

  return { issues, recommendations, score };
}

// ==================== ANALYZE BOUNCES ====================
async function analyzeBounces(campaignId, bounced, sent) {
  const issues = [];
  const recommendations = [];
  let score = 0;
  let softBounces = 0;

  const bounceRate = (bounced / sent) * 100;

  if (bounceRate > SPAM_THRESHOLDS.BOUNCE_RATE_CRITICAL) {
    issues.push(`Taux de bounce critique: ${bounceRate.toFixed(1)}% (> ${SPAM_THRESHOLDS.BOUNCE_RATE_CRITICAL}%)`);
    recommendations.push('Nettoyez votre liste d\'emails');
    recommendations.push('Vérifiez la validité des adresses avant envoi');
    recommendations.push('Utilisez un service de vérification d\'emails');
    score = 30;
  } else if (bounceRate > SPAM_THRESHOLDS.BOUNCE_RATE_WARNING) {
    issues.push(`Taux de bounce élevé: ${bounceRate.toFixed(1)}% (> ${SPAM_THRESHOLDS.BOUNCE_RATE_WARNING}%)`);
    recommendations.push('Surveillez vos bounces et nettoyez les adresses invalides');
    score = 15;
  }

  // Analyser les types de bounces
  const bounceDetails = await queryAll(`
    SELECT error_message, COUNT(*) as count
    FROM email_queue
    WHERE campaign_id = $1 AND status = 'bounced'
    GROUP BY error_message
    ORDER BY count DESC
    LIMIT 10
  `, [campaignId]);

  // Identifier les soft bounces (boîte pleine, serveur temporairement indisponible)
  for (const bounce of bounceDetails) {
    const msg = (bounce.error_message || '').toLowerCase();
    if (msg.includes('mailbox full') || msg.includes('quota') || msg.includes('temporarily')) {
      softBounces += parseInt(bounce.count);
    }
  }

  return { issues, recommendations, score, soft_bounces: softBounces };
}

// ==================== ANALYZE EMAIL DOMAINS ====================
async function analyzeEmailDomains(campaignId) {
  const issues = [];
  const recommendations = [];
  const problematic = [];
  let score = 0;
  let invalidDomainsCount = 0;

  // Récupérer les domaines avec leurs stats
  const domainStats = await queryAll(`
    SELECT
      SPLIT_PART(eq.recipient_email, '@', 2) as domain,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE eq.status = 'sent') as sent,
      COUNT(*) FILTER (WHERE eq.status = 'bounced') as bounced,
      COUNT(DISTINCT et.lead_id) FILTER (WHERE et.event_type = 'open') as opened
    FROM email_queue eq
    LEFT JOIN email_tracking et ON eq.lead_id = et.lead_id AND eq.campaign_id = et.campaign_id
    WHERE eq.campaign_id = $1
    GROUP BY SPLIT_PART(eq.recipient_email, '@', 2)
    HAVING COUNT(*) >= 5
    ORDER BY COUNT(*) DESC
    LIMIT 50
  `, [campaignId]);

  // Analyser chaque domaine
  for (const domain of domainStats) {
    const domainBounceRate = (domain.bounced / domain.total) * 100;
    const domainOpenRate = domain.sent > 0 ? (domain.opened / domain.sent) * 100 : 0;

    // Vérifier les MX records
    let hasMx = true;
    try {
      await resolveMx(domain.domain);
    } catch {
      hasMx = false;
      invalidDomainsCount += parseInt(domain.total);
    }

    // Identifier les domaines problématiques
    if (!hasMx) {
      problematic.push({
        domain: domain.domain,
        issue: 'no_mx_records',
        count: domain.total
      });
    } else if (domainBounceRate > 30) {
      problematic.push({
        domain: domain.domain,
        issue: 'high_bounce_rate',
        bounce_rate: domainBounceRate.toFixed(1),
        count: domain.total
      });
    } else if (domainOpenRate === 0 && domain.sent >= 10) {
      problematic.push({
        domain: domain.domain,
        issue: 'zero_opens',
        sent: domain.sent
      });
    }
  }

  if (problematic.length > 0) {
    issues.push(`${problematic.length} domaine(s) problématique(s) détecté(s)`);
    if (invalidDomainsCount > 0) {
      issues.push(`${invalidDomainsCount} emails vers des domaines sans MX valide`);
      recommendations.push('Supprimez les emails avec des domaines invalides de votre liste');
    }
    score = Math.min(30, problematic.length * 5);
  }

  return {
    issues,
    recommendations,
    problematic,
    score,
    invalid_domains_count: invalidDomainsCount
  };
}

// ==================== ANALYZE EMAIL CONTENT ====================
function analyzeEmailContent(subject, htmlBody) {
  const issues = [];
  const recommendations = [];
  let score = 0;

  const contentToAnalyze = ((subject || '') + ' ' + (htmlBody || '')).toLowerCase();

  // Vérifier les mots-clés spam
  const foundSpamWords = SPAM_KEYWORDS.filter(word =>
    contentToAnalyze.includes(word.toLowerCase())
  );

  if (foundSpamWords.length > 0) {
    issues.push(`Mots-clés spam détectés: ${foundSpamWords.join(', ')}`);
    recommendations.push(`Évitez les mots: ${foundSpamWords.join(', ')}`);
    score += foundSpamWords.length * 5;
  }

  // Vérifier les majuscules excessives dans le sujet
  if (subject) {
    const upperCount = (subject.match(/[A-Z]/g) || []).length;
    const upperRatio = upperCount / subject.length;
    if (upperRatio > 0.5) {
      issues.push('Trop de majuscules dans le sujet');
      recommendations.push('Réduisez l\'utilisation des majuscules dans le sujet');
      score += 10;
    }
  }

  // Vérifier les points d'exclamation excessifs
  const exclamationCount = (contentToAnalyze.match(/!/g) || []).length;
  if (exclamationCount > 5) {
    issues.push('Trop de points d\'exclamation');
    recommendations.push('Limitez l\'utilisation des points d\'exclamation');
    score += 5;
  }

  // Vérifier le ratio texte/liens
  if (htmlBody) {
    const linkCount = (htmlBody.match(/<a[^>]+href/gi) || []).length;
    const textLength = htmlBody.replace(/<[^>]*>/g, '').length;

    if (linkCount > 0 && textLength / linkCount < 50) {
      issues.push('Ratio texte/liens trop faible');
      recommendations.push('Ajoutez plus de contenu textuel entre vos liens');
      score += 10;
    }
  }

  return { issues, recommendations, score };
}

// ==================== ANALYZE TEMPORAL PATTERNS ====================
async function analyzeTemporalPatterns(campaignId) {
  const recommendations = [];
  let score = 0;

  // Compter les emails envoyés il y a plus de X jours sans ouverture
  const noOpenAfterDays = await queryOne(`
    SELECT COUNT(*) as count
    FROM email_queue eq
    WHERE eq.campaign_id = $1
    AND eq.status = 'sent'
    AND eq.sent_at < NOW() - INTERVAL '${SPAM_THRESHOLDS.NO_OPEN_DAYS} days'
    AND NOT EXISTS (
      SELECT 1 FROM email_tracking et
      WHERE et.lead_id = eq.lead_id
      AND et.campaign_id = eq.campaign_id
      AND et.event_type = 'open'
    )
  `, [campaignId]);

  const suspectedSpam = parseInt(noOpenAfterDays?.count || 0);

  if (suspectedSpam > 0) {
    recommendations.push(`${suspectedSpam} emails n'ont pas été ouverts après ${SPAM_THRESHOLDS.NO_OPEN_DAYS} jours - possiblement en spam`);
    score = Math.min(30, Math.round(suspectedSpam / 10));
  }

  return {
    suspected_spam: suspectedSpam,
    recommendations,
    score
  };
}

// ==================== SAVE SPAM ANALYSIS ====================
async function saveSpamAnalysis(campaignId, tenantId, data) {
  await execute(`
    INSERT INTO campaign_spam_analysis
    (campaign_id, tenant_id, total_sent, total_delivered, total_opened, total_bounced,
     suspected_spam, spam_score, spam_reasons, recommendations, problematic_domains)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
  `, [
    campaignId,
    tenantId,
    data.total_sent,
    data.total_delivered,
    data.total_opened,
    data.total_bounced,
    data.suspected_spam,
    data.spam_score,
    JSON.stringify(data.spam_reasons),
    data.recommendations,
    JSON.stringify(data.problematic_domains)
  ]);
}

// ==================== GET HISTORICAL ANALYSES ====================
/**
 * Récupère l'historique des analyses spam d'une campagne
 */
export async function getSpamAnalysisHistory(campaignId, tenantId) {
  const analyses = await queryAll(`
    SELECT *
    FROM campaign_spam_analysis
    WHERE campaign_id = $1 AND tenant_id = $2
    ORDER BY analyzed_at DESC
    LIMIT 10
  `, [campaignId, tenantId]);

  return analyses.map(a => ({
    ...a,
    spam_reasons: typeof a.spam_reasons === 'string' ? JSON.parse(a.spam_reasons) : a.spam_reasons,
    problematic_domains: typeof a.problematic_domains === 'string' ? JSON.parse(a.problematic_domains) : a.problematic_domains
  }));
}

// ==================== QUICK DOMAIN CHECK ====================
/**
 * Vérifie rapidement si un domaine a des enregistrements MX valides
 */
export async function checkDomainValidity(email) {
  try {
    const domain = email.split('@')[1];
    if (!domain) return { valid: false, reason: 'invalid_email_format' };

    const mxRecords = await resolveMx(domain);
    return {
      valid: mxRecords && mxRecords.length > 0,
      mx_records: mxRecords?.length || 0
    };
  } catch (err) {
    return { valid: false, reason: 'no_mx_records' };
  }
}

// ==================== BATCH DOMAIN VALIDATION ====================
/**
 * Vérifie plusieurs emails en batch
 */
export async function validateEmailsBatch(emails) {
  const results = {
    valid: [],
    invalid: []
  };

  // Grouper par domaine pour éviter les requêtes DNS répétées
  const domainMap = new Map();

  for (const email of emails) {
    const domain = email.split('@')[1];
    if (!domain) {
      results.invalid.push({ email, reason: 'invalid_format' });
      continue;
    }

    if (!domainMap.has(domain)) {
      domainMap.set(domain, []);
    }
    domainMap.get(domain).push(email);
  }

  // Vérifier chaque domaine unique
  for (const [domain, domainEmails] of domainMap) {
    try {
      const mx = await resolveMx(domain);
      if (mx && mx.length > 0) {
        results.valid.push(...domainEmails);
      } else {
        results.invalid.push(...domainEmails.map(e => ({ email: e, reason: 'no_mx_records' })));
      }
    } catch {
      results.invalid.push(...domainEmails.map(e => ({ email: e, reason: 'dns_error' })));
    }
  }

  return results;
}

export default {
  analyzeCampaignSpam,
  getSpamAnalysisHistory,
  checkDomainValidity,
  validateEmailsBatch
};
