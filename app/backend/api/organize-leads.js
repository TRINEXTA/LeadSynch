/**
 * API d'organisation et de tri des leads
 * - Correction des secteurs (IA + règles)
 * - Normalisation des villes/régions
 * - Suppression des doublons
 * - Création de bases par secteur/ville
 */

import { log, error, warn } from '../lib/logger.js';
import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import db from '../config/db.js';
import { searchCity, REGIONS } from '../lib/geoService.js';

const router = express.Router();
const q = (text, params = []) => db.query(text, params);

router.use(authMiddleware);

// ==================== CONSTANTES ====================

const VALID_SECTORS = [
  'juridique', 'comptabilite', 'sante', 'informatique', 'btp',
  'hotellerie', 'immobilier', 'logistique', 'commerce', 'education',
  'consulting', 'rh', 'services', 'industrie', 'automobile', 'agriculture', 'autre'
];

// Mapping code postal -> région
const POSTAL_TO_REGION = {
  '75': 'Île-de-France', '77': 'Île-de-France', '78': 'Île-de-France',
  '91': 'Île-de-France', '92': 'Île-de-France', '93': 'Île-de-France',
  '94': 'Île-de-France', '95': 'Île-de-France',
  '13': 'Provence-Alpes-Côte d\'Azur', '83': 'Provence-Alpes-Côte d\'Azur',
  '84': 'Provence-Alpes-Côte d\'Azur', '04': 'Provence-Alpes-Côte d\'Azur',
  '05': 'Provence-Alpes-Côte d\'Azur', '06': 'Provence-Alpes-Côte d\'Azur',
  '69': 'Auvergne-Rhône-Alpes', '01': 'Auvergne-Rhône-Alpes',
  '07': 'Auvergne-Rhône-Alpes', '26': 'Auvergne-Rhône-Alpes',
  '38': 'Auvergne-Rhône-Alpes', '42': 'Auvergne-Rhône-Alpes',
  '43': 'Auvergne-Rhône-Alpes', '63': 'Auvergne-Rhône-Alpes',
  '73': 'Auvergne-Rhône-Alpes', '74': 'Auvergne-Rhône-Alpes',
  '03': 'Auvergne-Rhône-Alpes', '15': 'Auvergne-Rhône-Alpes',
  '31': 'Occitanie', '09': 'Occitanie', '11': 'Occitanie',
  '12': 'Occitanie', '30': 'Occitanie', '32': 'Occitanie',
  '34': 'Occitanie', '46': 'Occitanie', '48': 'Occitanie',
  '65': 'Occitanie', '66': 'Occitanie', '81': 'Occitanie', '82': 'Occitanie',
  '33': 'Nouvelle-Aquitaine', '16': 'Nouvelle-Aquitaine',
  '17': 'Nouvelle-Aquitaine', '19': 'Nouvelle-Aquitaine',
  '23': 'Nouvelle-Aquitaine', '24': 'Nouvelle-Aquitaine',
  '40': 'Nouvelle-Aquitaine', '47': 'Nouvelle-Aquitaine',
  '64': 'Nouvelle-Aquitaine', '79': 'Nouvelle-Aquitaine',
  '86': 'Nouvelle-Aquitaine', '87': 'Nouvelle-Aquitaine',
  '44': 'Pays de la Loire', '49': 'Pays de la Loire',
  '53': 'Pays de la Loire', '72': 'Pays de la Loire', '85': 'Pays de la Loire',
  '35': 'Bretagne', '22': 'Bretagne', '29': 'Bretagne', '56': 'Bretagne',
  '59': 'Hauts-de-France', '02': 'Hauts-de-France', '60': 'Hauts-de-France',
  '62': 'Hauts-de-France', '80': 'Hauts-de-France',
  '67': 'Grand Est', '68': 'Grand Est', '08': 'Grand Est',
  '10': 'Grand Est', '51': 'Grand Est', '52': 'Grand Est',
  '54': 'Grand Est', '55': 'Grand Est', '57': 'Grand Est', '88': 'Grand Est',
  '76': 'Normandie', '14': 'Normandie', '27': 'Normandie',
  '50': 'Normandie', '61': 'Normandie',
  '21': 'Bourgogne-Franche-Comté', '25': 'Bourgogne-Franche-Comté',
  '39': 'Bourgogne-Franche-Comté', '58': 'Bourgogne-Franche-Comté',
  '70': 'Bourgogne-Franche-Comté', '71': 'Bourgogne-Franche-Comté',
  '89': 'Bourgogne-Franche-Comté', '90': 'Bourgogne-Franche-Comté',
  '37': 'Centre-Val de Loire', '18': 'Centre-Val de Loire',
  '28': 'Centre-Val de Loire', '36': 'Centre-Val de Loire',
  '41': 'Centre-Val de Loire', '45': 'Centre-Val de Loire'
};

// ==================== FONCTIONS UTILITAIRES ====================

/**
 * Détecte le secteur depuis le nom de l'entreprise
 */
function detectSectorFromName(name) {
  if (!name) return null;
  const lower = name.toLowerCase();

  if (/avoca|juridi|legal|notai|huissi|barreau/.test(lower)) return 'juridique';
  if (/compta|expert.compta|audit|cabinet comptable|commissaire/.test(lower)) return 'comptabilite';
  if (/medic|santé|sante|clinic|hospit|pharma|dentist|infirmi|creche|ehpad|medecin|docteur|kine|osteo|psycho|ophtalm|veterinaire/.test(lower)) return 'sante';
  if (/inform|digital|web|soft|tech|dev|cyber|data|si\b|systeme|cloud|saas|app|mobile/.test(lower)) return 'informatique';
  if (/btp|construct|maçon|macon|plomb|electric|charpent|menuisi|peintr|carrel|couvreur|terrassement/.test(lower)) return 'btp';
  if (/hotel|restaura|cafe|bar|traiteur|brasserie|pizz|snack|fast.food/.test(lower)) return 'hotellerie';
  if (/immo|foncier|gestion.locative|agence immobiliere|syndic|copropri/.test(lower)) return 'immobilier';
  if (/transport|logistiq|livraison|courier|fret|demenage|taxi|vtc/.test(lower)) return 'logistique';
  if (/commerce|magasin|boutique|vente|negoce|grossiste|detail/.test(lower)) return 'commerce';
  if (/ecole|formation|universi|lycee|college|creche|education|enseignement/.test(lower)) return 'education';
  if (/conseil|consult|strateg|coach|accompagn/.test(lower)) return 'consulting';
  if (/rh|recrutement|ressources.humaines|interim|emploi|travail.tempo/.test(lower)) return 'rh';
  if (/garage|auto|voiture|mecanic|carrosserie|controle.technique/.test(lower)) return 'automobile';
  if (/agricul|ferme|elevage|viticul|paysan/.test(lower)) return 'agriculture';
  if (/usine|fabric|industri|manufactur|production/.test(lower)) return 'industrie';

  return null;
}

/**
 * Détecte le secteur depuis le code NAF
 */
function detectSectorFromNAF(nafCode) {
  if (!nafCode) return null;
  const code = nafCode.replace(/\./g, '').substring(0, 2);

  const mapping = {
    '01': 'agriculture', '02': 'agriculture', '03': 'agriculture',
    '05': 'industrie', '06': 'industrie', '07': 'industrie', '08': 'industrie',
    '10': 'industrie', '11': 'industrie', '12': 'industrie',
    '41': 'btp', '42': 'btp', '43': 'btp',
    '45': 'automobile', '46': 'commerce', '47': 'commerce',
    '49': 'logistique', '50': 'logistique', '51': 'logistique', '52': 'logistique', '53': 'logistique',
    '55': 'hotellerie', '56': 'hotellerie',
    '58': 'informatique', '59': 'informatique', '60': 'informatique',
    '61': 'informatique', '62': 'informatique', '63': 'informatique',
    '64': 'services', '65': 'services', '66': 'services',
    '68': 'immobilier', '69': 'juridique', '70': 'consulting',
    '71': 'consulting', '72': 'consulting', '73': 'consulting', '74': 'consulting',
    '75': 'services',
    '77': 'services', '78': 'rh', '79': 'services',
    '80': 'services', '81': 'services', '82': 'services',
    '85': 'education', '86': 'sante', '87': 'sante', '88': 'sante',
    '90': 'services', '91': 'services', '92': 'services', '93': 'services'
  };

  return mapping[code] || null;
}

/**
 * Détecte la région depuis le code postal
 */
function detectRegionFromPostalCode(postalCode) {
  if (!postalCode) return null;
  const prefix = postalCode.toString().substring(0, 2);
  return POSTAL_TO_REGION[prefix] || null;
}

/**
 * Normalise le nom de ville
 */
function normalizeCity(city) {
  if (!city) return null;
  return city
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^(st|ste)\s/i, 'Saint ')
    .replace(/\bcedex\b.*$/i, '')
    .trim();
}

// ==================== ENDPOINTS ====================

/**
 * GET /api/organize-leads/analyze/:database_id
 * Analyse une base et retourne les problèmes détectés
 */
router.get('/analyze/:database_id', async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    const { database_id } = req.params;

    log(`🔍 Analyse de la base ${database_id}`);

    // Vérifier que la base existe
    const { rows: dbRows } = await q(
      'SELECT * FROM lead_databases WHERE id = $1 AND tenant_id = $2',
      [database_id, tenantId]
    );

    if (dbRows.length === 0) {
      return res.status(404).json({ error: 'Base non trouvée' });
    }

    // Récupérer tous les leads de la base
    const { rows: leads } = await q(
      `SELECT l.* FROM leads l
       WHERE l.id IN (
         SELECT id FROM leads WHERE database_id = $1
         UNION
         SELECT lead_id FROM lead_database_relations WHERE database_id = $1
       )`,
      [database_id]
    );

    // Analyse
    const analysis = {
      total_leads: leads.length,
      issues: {
        missing_sector: 0,
        invalid_sector: 0,
        missing_city: 0,
        missing_region: 0,
        missing_postal_code: 0,
        potential_duplicates: 0
      },
      sectors: {},
      cities: {},
      regions: {},
      suggestions: []
    };

    // Détecter les doublons par email
    const emailCounts = {};
    const siretCounts = {};

    for (const lead of leads) {
      // Secteurs
      if (!lead.sector || lead.sector === 'autre') {
        analysis.issues.missing_sector++;
      } else if (!VALID_SECTORS.includes(lead.sector)) {
        analysis.issues.invalid_sector++;
      }
      analysis.sectors[lead.sector || 'non défini'] = (analysis.sectors[lead.sector || 'non défini'] || 0) + 1;

      // Villes
      if (!lead.city) {
        analysis.issues.missing_city++;
      } else {
        const normalizedCity = normalizeCity(lead.city);
        analysis.cities[normalizedCity] = (analysis.cities[normalizedCity] || 0) + 1;
      }

      // Code postal
      if (!lead.postal_code) {
        analysis.issues.missing_postal_code++;
      }

      // Régions
      const region = detectRegionFromPostalCode(lead.postal_code);
      if (region) {
        analysis.regions[region] = (analysis.regions[region] || 0) + 1;
      } else {
        analysis.issues.missing_region++;
      }

      // Doublons
      if (lead.email) {
        emailCounts[lead.email.toLowerCase()] = (emailCounts[lead.email.toLowerCase()] || 0) + 1;
      }
      if (lead.siret) {
        siretCounts[lead.siret] = (siretCounts[lead.siret] || 0) + 1;
      }
    }

    // Compter les doublons
    analysis.issues.potential_duplicates =
      Object.values(emailCounts).filter(c => c > 1).length +
      Object.values(siretCounts).filter(c => c > 1).length;

    // Générer des suggestions
    if (analysis.issues.missing_sector > 0) {
      analysis.suggestions.push({
        action: 'fix_sectors',
        description: `${analysis.issues.missing_sector} leads sans secteur détecté`,
        priority: 'high'
      });
    }

    if (analysis.issues.missing_city > 0) {
      analysis.suggestions.push({
        action: 'fix_locations',
        description: `${analysis.issues.missing_city} leads sans ville`,
        priority: 'medium'
      });
    }

    if (analysis.issues.potential_duplicates > 0) {
      analysis.suggestions.push({
        action: 'remove_duplicates',
        description: `${analysis.issues.potential_duplicates} doublons potentiels détectés`,
        priority: 'high'
      });
    }

    if (Object.keys(analysis.sectors).length > 3) {
      analysis.suggestions.push({
        action: 'split_by_sector',
        description: `${Object.keys(analysis.sectors).length} secteurs différents - possibilité de séparer`,
        priority: 'low'
      });
    }

    return res.json({
      success: true,
      database: dbRows[0],
      analysis
    });

  } catch (err) {
    error('❌ Erreur analyse:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/organize-leads/fix-sectors/:database_id
 * Corrige les secteurs des leads d'une base
 */
router.post('/fix-sectors/:database_id', async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    const { database_id } = req.params;

    log(`🔧 Correction secteurs pour base ${database_id}`);

    // Récupérer les leads sans secteur ou avec secteur "autre"
    const { rows: leads } = await q(
      `SELECT l.* FROM leads l
       WHERE l.tenant_id = $1
       AND l.id IN (
         SELECT id FROM leads WHERE database_id = $2
         UNION
         SELECT lead_id FROM lead_database_relations WHERE database_id = $2
       )
       AND (l.sector IS NULL OR l.sector = '' OR l.sector = 'autre')`,
      [tenantId, database_id]
    );

    log(`📊 ${leads.length} leads à corriger`);

    let fixed = 0;
    let unchanged = 0;

    for (const lead of leads) {
      // Essayer de détecter le secteur
      let newSector = null;

      // 1. D'abord par code NAF
      if (lead.naf_code) {
        newSector = detectSectorFromNAF(lead.naf_code);
      }

      // 2. Ensuite par nom d'entreprise
      if (!newSector && lead.company_name) {
        newSector = detectSectorFromName(lead.company_name);
      }

      if (newSector && newSector !== lead.sector) {
        await q(
          'UPDATE leads SET sector = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3',
          [newSector, lead.id, tenantId]
        );
        fixed++;
      } else {
        unchanged++;
      }
    }

    // Mettre à jour la segmentation de la base
    await updateDatabaseSegmentation(database_id, tenantId);

    return res.json({
      success: true,
      stats: {
        total: leads.length,
        fixed,
        unchanged
      }
    });

  } catch (err) {
    error('❌ Erreur fix-sectors:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/organize-leads/fix-locations/:database_id
 * Corrige et normalise les villes/régions des leads
 */
router.post('/fix-locations/:database_id', async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    const { database_id } = req.params;

    log(`📍 Correction localisations pour base ${database_id}`);

    // Récupérer les leads de la base
    const { rows: leads } = await q(
      `SELECT l.* FROM leads l
       WHERE l.tenant_id = $1
       AND l.id IN (
         SELECT id FROM leads WHERE database_id = $2
         UNION
         SELECT lead_id FROM lead_database_relations WHERE database_id = $2
       )`,
      [tenantId, database_id]
    );

    let fixed = 0;

    for (const lead of leads) {
      let updates = [];
      let params = [];
      let paramIndex = 1;

      // Normaliser la ville
      if (lead.city) {
        const normalizedCity = normalizeCity(lead.city);
        if (normalizedCity !== lead.city) {
          updates.push(`city = $${paramIndex++}`);
          params.push(normalizedCity);
        }
      }

      // Détecter la région depuis le code postal
      if (lead.postal_code && !lead.region) {
        const region = detectRegionFromPostalCode(lead.postal_code);
        if (region) {
          updates.push(`region = $${paramIndex++}`);
          params.push(region);
        }
      }

      // Appliquer les mises à jour
      if (updates.length > 0) {
        updates.push(`updated_at = NOW()`);
        params.push(lead.id, tenantId);

        await q(
          `UPDATE leads SET ${updates.join(', ')} WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex}`,
          params
        );
        fixed++;
      }
    }

    return res.json({
      success: true,
      stats: {
        total: leads.length,
        fixed
      }
    });

  } catch (err) {
    error('❌ Erreur fix-locations:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/organize-leads/remove-duplicates/:database_id
 * Supprime les doublons d'une base (garde le plus récent)
 */
router.post('/remove-duplicates/:database_id', async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    const { database_id } = req.params;
    const { strategy = 'email' } = req.body; // 'email', 'siret', 'name', 'all'

    log(`🗑️ Suppression doublons (${strategy}) pour base ${database_id}`);

    let duplicatesRemoved = 0;

    if (strategy === 'email' || strategy === 'all') {
      // Supprimer les doublons par email (garder le plus récent)
      const { rowCount } = await q(
        `DELETE FROM leads
         WHERE tenant_id = $1
         AND id IN (
           SELECT l.id FROM leads l
           WHERE l.id IN (
             SELECT id FROM leads WHERE database_id = $2
             UNION
             SELECT lead_id FROM lead_database_relations WHERE database_id = $2
           )
           AND l.email IS NOT NULL
           AND l.id NOT IN (
             SELECT DISTINCT ON (LOWER(email)) id
             FROM leads
             WHERE email IS NOT NULL AND tenant_id = $1
             ORDER BY LOWER(email), updated_at DESC
           )
         )`,
        [tenantId, database_id]
      );
      duplicatesRemoved += rowCount;
    }

    if (strategy === 'siret' || strategy === 'all') {
      // Supprimer les doublons par SIRET
      const { rowCount } = await q(
        `DELETE FROM leads
         WHERE tenant_id = $1
         AND id IN (
           SELECT l.id FROM leads l
           WHERE l.id IN (
             SELECT id FROM leads WHERE database_id = $2
             UNION
             SELECT lead_id FROM lead_database_relations WHERE database_id = $2
           )
           AND l.siret IS NOT NULL
           AND l.id NOT IN (
             SELECT DISTINCT ON (siret) id
             FROM leads
             WHERE siret IS NOT NULL AND tenant_id = $1
             ORDER BY siret, updated_at DESC
           )
         )`,
        [tenantId, database_id]
      );
      duplicatesRemoved += rowCount;
    }

    // Nettoyer les relations orphelines
    await q('DELETE FROM lead_database_relations WHERE lead_id NOT IN (SELECT id FROM leads)');

    // Mettre à jour la segmentation
    await updateDatabaseSegmentation(database_id, tenantId);

    return res.json({
      success: true,
      stats: {
        duplicates_removed: duplicatesRemoved
      }
    });

  } catch (err) {
    error('❌ Erreur remove-duplicates:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/organize-leads/split-by-sector/:database_id
 * Crée une nouvelle base par secteur
 */
router.post('/split-by-sector/:database_id', async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    const userId = req.user?.id;
    const { database_id } = req.params;

    log(`✂️ Split par secteur pour base ${database_id}`);

    // Récupérer la base source
    const { rows: dbRows } = await q(
      'SELECT * FROM lead_databases WHERE id = $1 AND tenant_id = $2',
      [database_id, tenantId]
    );

    if (dbRows.length === 0) {
      return res.status(404).json({ error: 'Base non trouvée' });
    }

    const sourceDb = dbRows[0];

    // Récupérer les secteurs distincts
    const { rows: sectors } = await q(
      `SELECT DISTINCT sector, COUNT(*) as count
       FROM leads
       WHERE id IN (
         SELECT id FROM leads WHERE database_id = $1
         UNION
         SELECT lead_id FROM lead_database_relations WHERE database_id = $1
       )
       AND sector IS NOT NULL AND sector != ''
       GROUP BY sector
       ORDER BY count DESC`,
      [database_id]
    );

    const newDatabases = [];

    for (const { sector, count } of sectors) {
      if (parseInt(count) === 0) continue;

      // Créer la nouvelle base
      const { rows: newDbRows } = await q(
        `INSERT INTO lead_databases (tenant_id, name, description, source, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         RETURNING *`,
        [
          tenantId,
          `${sourceDb.name} - ${sector.charAt(0).toUpperCase() + sector.slice(1)}`,
          `Extrait de "${sourceDb.name}" - Secteur ${sector}`,
          sourceDb.source || 'split',
          userId
        ]
      );

      const newDb = newDbRows[0];

      // Déplacer les leads vers la nouvelle base
      await q(
        `UPDATE leads SET database_id = $1, updated_at = NOW()
         WHERE tenant_id = $2
         AND sector = $3
         AND id IN (
           SELECT id FROM leads WHERE database_id = $4
           UNION
           SELECT lead_id FROM lead_database_relations WHERE database_id = $4
         )`,
        [newDb.id, tenantId, sector, database_id]
      );

      // Mettre à jour la segmentation
      await updateDatabaseSegmentation(newDb.id, tenantId);

      newDatabases.push({
        id: newDb.id,
        name: newDb.name,
        sector,
        lead_count: parseInt(count)
      });
    }

    return res.json({
      success: true,
      new_databases: newDatabases,
      stats: {
        sectors_split: newDatabases.length
      }
    });

  } catch (err) {
    error('❌ Erreur split-by-sector:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/organize-leads/split-by-city/:database_id
 * Crée une nouvelle base par ville principale
 */
router.post('/split-by-city/:database_id', async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    const userId = req.user?.id;
    const { database_id } = req.params;
    const { min_leads = 10 } = req.body; // Minimum de leads pour créer une base

    log(`✂️ Split par ville pour base ${database_id}`);

    // Récupérer la base source
    const { rows: dbRows } = await q(
      'SELECT * FROM lead_databases WHERE id = $1 AND tenant_id = $2',
      [database_id, tenantId]
    );

    if (dbRows.length === 0) {
      return res.status(404).json({ error: 'Base non trouvée' });
    }

    const sourceDb = dbRows[0];

    // Récupérer les villes avec assez de leads
    const { rows: cities } = await q(
      `SELECT city, COUNT(*) as count
       FROM leads
       WHERE id IN (
         SELECT id FROM leads WHERE database_id = $1
         UNION
         SELECT lead_id FROM lead_database_relations WHERE database_id = $1
       )
       AND city IS NOT NULL AND city != ''
       GROUP BY city
       HAVING COUNT(*) >= $2
       ORDER BY count DESC`,
      [database_id, min_leads]
    );

    const newDatabases = [];

    for (const { city, count } of cities) {
      // Créer la nouvelle base
      const { rows: newDbRows } = await q(
        `INSERT INTO lead_databases (tenant_id, name, description, source, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         RETURNING *`,
        [
          tenantId,
          `${sourceDb.name} - ${city}`,
          `Extrait de "${sourceDb.name}" - Ville: ${city}`,
          sourceDb.source || 'split',
          userId
        ]
      );

      const newDb = newDbRows[0];

      // Déplacer les leads
      await q(
        `UPDATE leads SET database_id = $1, updated_at = NOW()
         WHERE tenant_id = $2
         AND city = $3
         AND id IN (
           SELECT id FROM leads WHERE database_id = $4
           UNION
           SELECT lead_id FROM lead_database_relations WHERE database_id = $4
         )`,
        [newDb.id, tenantId, city, database_id]
      );

      await updateDatabaseSegmentation(newDb.id, tenantId);

      newDatabases.push({
        id: newDb.id,
        name: newDb.name,
        city,
        lead_count: parseInt(count)
      });
    }

    return res.json({
      success: true,
      new_databases: newDatabases,
      stats: {
        cities_split: newDatabases.length
      }
    });

  } catch (err) {
    error('❌ Erreur split-by-city:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/organize-leads/full-organize/:database_id
 * Exécute toutes les opérations de nettoyage
 */
router.post('/full-organize/:database_id', async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    const { database_id } = req.params;
    const {
      fix_sectors = true,
      fix_locations = true,
      remove_duplicates = true,
      split_by_sector = false,
      split_by_city = false
    } = req.body;

    log(`🚀 Organisation complète pour base ${database_id}`);

    const results = {
      fix_sectors: null,
      fix_locations: null,
      remove_duplicates: null,
      split_by_sector: null,
      split_by_city: null
    };

    // 1. Corriger les secteurs
    if (fix_sectors) {
      const sectorRes = await fixSectorsInternal(database_id, tenantId);
      results.fix_sectors = sectorRes;
    }

    // 2. Corriger les localisations
    if (fix_locations) {
      const locRes = await fixLocationsInternal(database_id, tenantId);
      results.fix_locations = locRes;
    }

    // 3. Supprimer les doublons
    if (remove_duplicates) {
      const dupRes = await removeDuplicatesInternal(database_id, tenantId);
      results.remove_duplicates = dupRes;
    }

    // 4. Split par secteur (après nettoyage)
    if (split_by_sector) {
      // Appel API interne
    }

    return res.json({
      success: true,
      results
    });

  } catch (err) {
    error('❌ Erreur full-organize:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ==================== FONCTIONS INTERNES ====================

async function updateDatabaseSegmentation(databaseId, tenantId) {
  const { rows: sectors } = await q(
    `SELECT sector, COUNT(*) as count
     FROM leads
     WHERE id IN (
       SELECT id FROM leads WHERE database_id = $1
       UNION
       SELECT lead_id FROM lead_database_relations WHERE database_id = $1
     )
     AND sector IS NOT NULL
     GROUP BY sector`,
    [databaseId]
  );

  const segmentation = {};
  for (const { sector, count } of sectors) {
    segmentation[sector] = parseInt(count);
  }

  await q(
    `UPDATE lead_databases
     SET segmentation = $1,
         total_leads = (
           SELECT COUNT(DISTINCT lead_id) FROM (
             SELECT id as lead_id FROM leads WHERE database_id = $2
             UNION
             SELECT lead_id FROM lead_database_relations WHERE database_id = $2
           ) combined
         ),
         updated_at = NOW()
     WHERE id = $2 AND tenant_id = $3`,
    [JSON.stringify(segmentation), databaseId, tenantId]
  );
}

async function fixSectorsInternal(databaseId, tenantId) {
  const { rows: leads } = await q(
    `SELECT * FROM leads
     WHERE tenant_id = $1
     AND id IN (
       SELECT id FROM leads WHERE database_id = $2
       UNION
       SELECT lead_id FROM lead_database_relations WHERE database_id = $2
     )
     AND (sector IS NULL OR sector = '' OR sector = 'autre')`,
    [tenantId, databaseId]
  );

  let fixed = 0;
  for (const lead of leads) {
    let newSector = detectSectorFromNAF(lead.naf_code) || detectSectorFromName(lead.company_name);
    if (newSector) {
      await q('UPDATE leads SET sector = $1 WHERE id = $2', [newSector, lead.id]);
      fixed++;
    }
  }

  await updateDatabaseSegmentation(databaseId, tenantId);
  return { total: leads.length, fixed };
}

async function fixLocationsInternal(databaseId, tenantId) {
  const { rows: leads } = await q(
    `SELECT * FROM leads WHERE tenant_id = $1
     AND id IN (
       SELECT id FROM leads WHERE database_id = $2
       UNION
       SELECT lead_id FROM lead_database_relations WHERE database_id = $2
     )`,
    [tenantId, databaseId]
  );

  let fixed = 0;
  for (const lead of leads) {
    const region = detectRegionFromPostalCode(lead.postal_code);
    const normalizedCity = normalizeCity(lead.city);

    if ((region && !lead.region) || (normalizedCity && normalizedCity !== lead.city)) {
      await q(
        'UPDATE leads SET region = COALESCE($1, region), city = COALESCE($2, city) WHERE id = $3',
        [region, normalizedCity, lead.id]
      );
      fixed++;
    }
  }

  return { total: leads.length, fixed };
}

async function removeDuplicatesInternal(databaseId, tenantId) {
  const { rowCount } = await q(
    `DELETE FROM leads
     WHERE tenant_id = $1
     AND email IS NOT NULL
     AND id NOT IN (
       SELECT DISTINCT ON (LOWER(email)) id
       FROM leads
       WHERE tenant_id = $1 AND email IS NOT NULL
       ORDER BY LOWER(email), updated_at DESC
     )`,
    [tenantId]
  );

  await q('DELETE FROM lead_database_relations WHERE lead_id NOT IN (SELECT id FROM leads)');
  await updateDatabaseSegmentation(databaseId, tenantId);

  return { duplicates_removed: rowCount };
}

export default router;
