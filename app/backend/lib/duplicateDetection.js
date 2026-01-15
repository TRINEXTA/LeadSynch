import { log, error, warn } from "./logger.js";
import { query as q, queryOne, queryAll } from './db.js';

/**
 * Service de détection des duplicatas
 * Détecte les leads en double basé sur plusieurs critères
 */

/**
 * Types de correspondance pour la détection
 */
const MATCH_TYPES = {
  EMAIL: 'email',
  PHONE: 'phone',
  SIRET: 'siret',
  NAME_POSTAL: 'name_postal',
  WEBSITE: 'website'
};

/**
 * Niveaux de confiance par type de correspondance
 */
const CONFIDENCE_LEVELS = {
  [MATCH_TYPES.EMAIL]: 100,      // Email identique = certain
  [MATCH_TYPES.SIRET]: 100,      // SIRET identique = certain
  [MATCH_TYPES.PHONE]: 95,       // Téléphone identique = très probable
  [MATCH_TYPES.WEBSITE]: 90,     // Site web identique = très probable
  [MATCH_TYPES.NAME_POSTAL]: 80  // Nom + code postal = probable
};

/**
 * Normalise un email pour la comparaison
 * @param {string} email - Email à normaliser
 * @returns {string} - Email normalisé
 */
function normalizeEmail(email) {
  if (!email) return null;
  return email.toLowerCase().trim();
}

/**
 * Normalise un numéro de téléphone pour la comparaison
 * @param {string} phone - Numéro de téléphone
 * @returns {string} - Numéro normalisé (chiffres uniquement)
 */
function normalizePhone(phone) {
  if (!phone) return null;
  // Garder uniquement les chiffres
  const digits = phone.replace(/\D/g, '');
  // Si commence par 0033 ou +33, convertir en 0
  if (digits.startsWith('33') && digits.length >= 11) {
    return '0' + digits.substring(2);
  }
  if (digits.startsWith('0033')) {
    return '0' + digits.substring(4);
  }
  return digits;
}

/**
 * Normalise un SIRET pour la comparaison
 * @param {string} siret - SIRET à normaliser
 * @returns {string} - SIRET normalisé (14 chiffres)
 */
function normalizeSiret(siret) {
  if (!siret) return null;
  const digits = siret.replace(/\D/g, '');
  // SIRET doit avoir 14 chiffres
  if (digits.length !== 14) return null;
  return digits;
}

/**
 * Normalise un nom d'entreprise pour la comparaison
 * @param {string} name - Nom de l'entreprise
 * @returns {string} - Nom normalisé
 */
function normalizeCompanyName(name) {
  if (!name) return null;
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Enlever les accents
    .replace(/[^a-z0-9]/g, '') // Garder seulement alphanumérique
    .trim();
}

/**
 * Normalise un code postal
 * @param {string} postalCode - Code postal
 * @returns {string} - Code postal normalisé
 */
function normalizePostalCode(postalCode) {
  if (!postalCode) return null;
  const digits = postalCode.replace(/\D/g, '');
  return digits.padStart(5, '0').substring(0, 5);
}

/**
 * Normalise une URL de site web
 * @param {string} website - URL du site
 * @returns {string} - Domaine normalisé
 */
function normalizeWebsite(website) {
  if (!website) return null;
  try {
    let url = website.toLowerCase().trim();
    if (!url.startsWith('http')) {
      url = 'https://' + url;
    }
    const parsed = new URL(url);
    // Retourner le domaine sans www
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

/**
 * Recherche les duplicatas potentiels pour un lead
 * @param {object} lead - Lead à vérifier
 * @param {string} tenantId - ID du tenant
 * @param {string} excludeLeadId - ID du lead à exclure (lui-même)
 * @returns {Promise<array>} - Liste des duplicatas potentiels
 */
export async function findDuplicates(lead, tenantId, excludeLeadId = null) {
  const duplicates = [];
  const checkedIds = new Set();

  // 1. Vérification par email
  if (lead.email) {
    const normalizedEmail = normalizeEmail(lead.email);
    if (normalizedEmail) {
      const { rows } = await q(
        `SELECT id, company_name, email, phone, siret, postal_code, website, created_at
         FROM leads
         WHERE tenant_id = $1
           AND LOWER(TRIM(email)) = $2
           AND ($3::uuid IS NULL OR id != $3)`,
        [tenantId, normalizedEmail, excludeLeadId]
      );

      for (const row of rows) {
        if (!checkedIds.has(row.id)) {
          checkedIds.add(row.id);
          duplicates.push({
            lead: row,
            match_type: MATCH_TYPES.EMAIL,
            confidence: CONFIDENCE_LEVELS[MATCH_TYPES.EMAIL],
            match_details: `Email identique: ${normalizedEmail}`
          });
        }
      }
    }
  }

  // 2. Vérification par SIRET
  if (lead.siret) {
    const normalizedSiret = normalizeSiret(lead.siret);
    if (normalizedSiret) {
      const { rows } = await q(
        `SELECT id, company_name, email, phone, siret, postal_code, website, created_at
         FROM leads
         WHERE tenant_id = $1
           AND REPLACE(siret, ' ', '') = $2
           AND ($3::uuid IS NULL OR id != $3)`,
        [tenantId, normalizedSiret, excludeLeadId]
      );

      for (const row of rows) {
        if (!checkedIds.has(row.id)) {
          checkedIds.add(row.id);
          duplicates.push({
            lead: row,
            match_type: MATCH_TYPES.SIRET,
            confidence: CONFIDENCE_LEVELS[MATCH_TYPES.SIRET],
            match_details: `SIRET identique: ${normalizedSiret}`
          });
        }
      }
    }
  }

  // 3. Vérification par téléphone
  const phoneToCheck = lead.phone || lead.direct_line;
  if (phoneToCheck) {
    const normalizedPhone = normalizePhone(phoneToCheck);
    if (normalizedPhone && normalizedPhone.length >= 10) {
      const { rows } = await q(
        `SELECT id, company_name, email, phone, siret, postal_code, website, created_at
         FROM leads
         WHERE tenant_id = $1
           AND (
             REGEXP_REPLACE(phone, '[^0-9]', '', 'g') = $2
             OR REGEXP_REPLACE(direct_line, '[^0-9]', '', 'g') = $2
           )
           AND ($3::uuid IS NULL OR id != $3)`,
        [tenantId, normalizedPhone, excludeLeadId]
      );

      for (const row of rows) {
        if (!checkedIds.has(row.id)) {
          checkedIds.add(row.id);
          duplicates.push({
            lead: row,
            match_type: MATCH_TYPES.PHONE,
            confidence: CONFIDENCE_LEVELS[MATCH_TYPES.PHONE],
            match_details: `Téléphone identique: ${normalizedPhone}`
          });
        }
      }
    }
  }

  // 4. Vérification par site web
  if (lead.website) {
    const normalizedWebsite = normalizeWebsite(lead.website);
    if (normalizedWebsite) {
      const { rows } = await q(
        `SELECT id, company_name, email, phone, siret, postal_code, website, created_at
         FROM leads
         WHERE tenant_id = $1
           AND website IS NOT NULL
           AND website != ''
           AND ($2::uuid IS NULL OR id != $2)`,
        [tenantId, excludeLeadId]
      );

      for (const row of rows) {
        if (!checkedIds.has(row.id)) {
          const rowWebsite = normalizeWebsite(row.website);
          if (rowWebsite === normalizedWebsite) {
            checkedIds.add(row.id);
            duplicates.push({
              lead: row,
              match_type: MATCH_TYPES.WEBSITE,
              confidence: CONFIDENCE_LEVELS[MATCH_TYPES.WEBSITE],
              match_details: `Site web identique: ${normalizedWebsite}`
            });
          }
        }
      }
    }
  }

  // 5. Vérification par nom + code postal
  if (lead.company_name && lead.postal_code) {
    const normalizedName = normalizeCompanyName(lead.company_name);
    const normalizedPostal = normalizePostalCode(lead.postal_code);

    if (normalizedName && normalizedName.length >= 3 && normalizedPostal) {
      const { rows } = await q(
        `SELECT id, company_name, email, phone, siret, postal_code, website, created_at
         FROM leads
         WHERE tenant_id = $1
           AND company_name IS NOT NULL
           AND postal_code IS NOT NULL
           AND ($2::uuid IS NULL OR id != $2)`,
        [tenantId, excludeLeadId]
      );

      for (const row of rows) {
        if (!checkedIds.has(row.id)) {
          const rowName = normalizeCompanyName(row.company_name);
          const rowPostal = normalizePostalCode(row.postal_code);

          if (rowName === normalizedName && rowPostal === normalizedPostal) {
            checkedIds.add(row.id);
            duplicates.push({
              lead: row,
              match_type: MATCH_TYPES.NAME_POSTAL,
              confidence: CONFIDENCE_LEVELS[MATCH_TYPES.NAME_POSTAL],
              match_details: `Nom et code postal similaires: ${lead.company_name} (${lead.postal_code})`
            });
          }
        }
      }
    }
  }

  // Trier par confiance décroissante
  duplicates.sort((a, b) => b.confidence - a.confidence);

  return duplicates;
}

/**
 * Vérifie si un lead est un duplicata avant création
 * @param {object} leadData - Données du lead à créer
 * @param {string} tenantId - ID du tenant
 * @returns {Promise<object>} - { isDuplicate, duplicates }
 */
export async function checkDuplicateBeforeCreate(leadData, tenantId) {
  const duplicates = await findDuplicates(leadData, tenantId);

  return {
    isDuplicate: duplicates.length > 0,
    duplicates: duplicates,
    highConfidenceDuplicate: duplicates.find(d => d.confidence >= 95) || null
  };
}

/**
 * Enregistre une détection de duplicata dans la base
 * @param {string} tenantId - ID du tenant
 * @param {string} leadId - ID du lead original
 * @param {string} duplicateLeadId - ID du duplicata
 * @param {string} matchType - Type de correspondance
 * @param {number} confidence - Niveau de confiance
 * @returns {Promise<object>}
 */
export async function logDuplicateDetection(tenantId, leadId, duplicateLeadId, matchType, confidence) {
  try {
    // Vérifier si déjà enregistré
    const existing = await queryOne(
      `SELECT id FROM duplicate_detections
       WHERE tenant_id = $1 AND lead_id = $2 AND duplicate_lead_id = $3`,
      [tenantId, leadId, duplicateLeadId]
    );

    if (existing) {
      return existing;
    }

    const result = await q(
      `INSERT INTO duplicate_detections
       (tenant_id, lead_id, duplicate_lead_id, match_type, match_confidence)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [tenantId, leadId, duplicateLeadId, matchType, confidence]
    );

    return result.rows[0];
  } catch (err) {
    error('Erreur enregistrement duplicata:', err);
    throw err;
  }
}

/**
 * Récupère les duplicatas en attente pour un tenant
 * @param {string} tenantId - ID du tenant
 * @param {number} limit - Nombre max de résultats
 * @returns {Promise<array>}
 */
export async function getPendingDuplicates(tenantId, limit = 50) {
  try {
    const { rows } = await q(
      `SELECT
        dd.*,
        l1.company_name as lead_company,
        l1.email as lead_email,
        l1.phone as lead_phone,
        l1.created_at as lead_created_at,
        l2.company_name as duplicate_company,
        l2.email as duplicate_email,
        l2.phone as duplicate_phone,
        l2.created_at as duplicate_created_at
       FROM duplicate_detections dd
       JOIN leads l1 ON dd.lead_id = l1.id
       JOIN leads l2 ON dd.duplicate_lead_id = l2.id
       WHERE dd.tenant_id = $1 AND dd.status = 'pending'
       ORDER BY dd.match_confidence DESC, dd.created_at DESC
       LIMIT $2`,
      [tenantId, limit]
    );

    return rows;
  } catch (err) {
    error('Erreur récupération duplicatas en attente:', err);
    throw err;
  }
}

/**
 * Fusionne deux leads (garde le plus ancien, archive le plus récent)
 * @param {string} tenantId - ID du tenant
 * @param {string} keepLeadId - ID du lead à garder
 * @param {string} mergeLeadId - ID du lead à fusionner
 * @param {string} userId - ID de l'utilisateur effectuant la fusion
 * @returns {Promise<object>}
 */
export async function mergeLeads(tenantId, keepLeadId, mergeLeadId, userId) {
  try {
    log(`🔄 Fusion des leads: garder ${keepLeadId}, fusionner ${mergeLeadId}`);

    // Récupérer les deux leads
    const keepLead = await queryOne(
      'SELECT * FROM leads WHERE id = $1 AND tenant_id = $2',
      [keepLeadId, tenantId]
    );

    const mergeLead = await queryOne(
      'SELECT * FROM leads WHERE id = $1 AND tenant_id = $2',
      [mergeLeadId, tenantId]
    );

    if (!keepLead || !mergeLead) {
      throw new Error('Un ou plusieurs leads introuvables');
    }

    // Fusionner les données (compléter les champs manquants du lead gardé)
    const fieldsToMerge = [
      'email', 'phone', 'direct_line', 'siret', 'website',
      'address', 'city', 'postal_code', 'country',
      'contact_name', 'contact_email', 'contact_phone',
      'sector', 'effectif', 'chiffre_affaires'
    ];

    const updates = [];
    const values = [keepLeadId];
    let paramIndex = 2;

    for (const field of fieldsToMerge) {
      if (!keepLead[field] && mergeLead[field]) {
        updates.push(`${field} = $${paramIndex}`);
        values.push(mergeLead[field]);
        paramIndex++;
      }
    }

    // Mettre à jour le lead gardé si nécessaire
    if (updates.length > 0) {
      await q(
        `UPDATE leads SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $1`,
        values
      );
    }

    // Transférer les relations du lead fusionné vers le lead gardé
    // 1. Email queue
    await q(
      `UPDATE email_queue SET lead_id = $1 WHERE lead_id = $2 AND tenant_id = $3`,
      [keepLeadId, mergeLeadId, tenantId]
    );

    // 2. Email events
    await q(
      `UPDATE email_events SET lead_id = $1 WHERE lead_id = $2`,
      [keepLeadId, mergeLeadId]
    );

    // 3. Call logs
    await q(
      `UPDATE call_logs SET lead_id = $1 WHERE lead_id = $2`,
      [keepLeadId, mergeLeadId]
    );

    // 4. Notes
    await q(
      `UPDATE lead_notes SET lead_id = $1 WHERE lead_id = $2`,
      [keepLeadId, mergeLeadId]
    );

    // 5. Follow-ups
    await q(
      `UPDATE follow_ups SET lead_id = $1 WHERE lead_id = $2`,
      [keepLeadId, mergeLeadId]
    );

    // Marquer le lead fusionné comme duplicata
    await q(
      `UPDATE leads
       SET is_duplicate = true,
           duplicate_of = $1,
           status = 'archived',
           updated_at = NOW()
       WHERE id = $2`,
      [keepLeadId, mergeLeadId]
    );

    // Mettre à jour la détection de duplicata
    await q(
      `UPDATE duplicate_detections
       SET status = 'merged',
           merged_at = NOW(),
           merged_by = $1
       WHERE (lead_id = $2 AND duplicate_lead_id = $3)
          OR (lead_id = $3 AND duplicate_lead_id = $2)`,
      [userId, keepLeadId, mergeLeadId]
    );

    log(`✅ Leads fusionnés avec succès`);

    return {
      success: true,
      keptLeadId: keepLeadId,
      mergedLeadId: mergeLeadId,
      fieldsUpdated: updates.length
    };
  } catch (err) {
    error('Erreur fusion des leads:', err);
    throw err;
  }
}

/**
 * Ignore une détection de duplicata
 * @param {string} detectionId - ID de la détection
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<object>}
 */
export async function dismissDuplicate(detectionId, userId) {
  try {
    const result = await q(
      `UPDATE duplicate_detections
       SET status = 'dismissed',
           dismissed_at = NOW(),
           dismissed_by = $1
       WHERE id = $2
       RETURNING *`,
      [userId, detectionId]
    );

    return result.rows[0];
  } catch (err) {
    error('Erreur rejet duplicata:', err);
    throw err;
  }
}

/**
 * Analyse tous les leads d'un tenant pour détecter les duplicatas
 * @param {string} tenantId - ID du tenant
 * @returns {Promise<object>} - Statistiques de détection
 */
export async function scanAllDuplicates(tenantId) {
  try {
    log(`🔍 Scan des duplicatas pour tenant ${tenantId}...`);

    const { rows: leads } = await q(
      `SELECT id, company_name, email, phone, direct_line, siret, postal_code, website
       FROM leads
       WHERE tenant_id = $1
         AND is_duplicate = false
         AND status NOT IN ('archived', 'perdu')
       ORDER BY created_at ASC`,
      [tenantId]
    );

    log(`📊 ${leads.length} leads à analyser`);

    const stats = {
      scanned: 0,
      duplicatesFound: 0,
      byType: {}
    };

    const processedPairs = new Set();

    for (const lead of leads) {
      stats.scanned++;

      const duplicates = await findDuplicates(lead, tenantId, lead.id);

      for (const dup of duplicates) {
        // Éviter les doublons de paires
        const pairKey = [lead.id, dup.lead.id].sort().join('-');
        if (processedPairs.has(pairKey)) continue;
        processedPairs.add(pairKey);

        // Enregistrer la détection
        await logDuplicateDetection(
          tenantId,
          lead.id,
          dup.lead.id,
          dup.match_type,
          dup.confidence
        );

        stats.duplicatesFound++;
        stats.byType[dup.match_type] = (stats.byType[dup.match_type] || 0) + 1;
      }
    }

    log(`✅ Scan terminé: ${stats.duplicatesFound} duplicatas trouvés`);

    return stats;
  } catch (err) {
    error('Erreur scan duplicatas:', err);
    throw err;
  }
}

/**
 * Récupère les statistiques de duplicatas pour un tenant
 * @param {string} tenantId - ID du tenant
 * @returns {Promise<object>}
 */
export async function getDuplicateStats(tenantId) {
  try {
    const { rows } = await q(
      `SELECT
        status,
        COUNT(*) as count,
        AVG(match_confidence) as avg_confidence
       FROM duplicate_detections
       WHERE tenant_id = $1
       GROUP BY status`,
      [tenantId]
    );

    const stats = {
      pending: 0,
      merged: 0,
      dismissed: 0,
      total: 0
    };

    for (const row of rows) {
      stats[row.status] = parseInt(row.count);
      stats.total += parseInt(row.count);
    }

    return stats;
  } catch (err) {
    error('Erreur stats duplicatas:', err);
    throw err;
  }
}

export {
  MATCH_TYPES,
  CONFIDENCE_LEVELS,
  normalizeEmail,
  normalizePhone,
  normalizeSiret,
  normalizeCompanyName,
  normalizePostalCode,
  normalizeWebsite
};
