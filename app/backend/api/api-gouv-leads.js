import { log, error, warn } from "../lib/logger.js";
/**
 * API Gouv Leads - Génération de leads à partir de l'API Entreprise du gouvernement français
 * Sources légales: API Sirene (INSEE), API Entreprise
 * GRATUIT et conforme RGPD
 */

import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { queryOne, queryAll, execute } from '../lib/db.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

/**
 * Rechercher des entreprises via API Sirene (INSEE)
 * https://api.gouv.fr/les-api/sirene_v3
 * GRATUIT, données publiques officielles
 */
router.post('/search', authMiddleware, async (req, res) => {
  try {
    const { query, department, city, activity_code, max_results = 100 } = req.body;
    const { tenant_id } = req.user;

    if (!query && !department && !city && !activity_code) {
      return res.status(400).json({
        success: false,
        error: 'Au moins un critère de recherche requis (query, department, city, activity_code)'
      });
    }

    log(`🔍 Recherche API Sirene: query="${query}" dept="${department}" city="${city}" naf="${activity_code}"`);

    // Construire la requête API Sirene
    const params = new URLSearchParams();

    if (query) {
      params.append('q', `denominationUniteLegale:"${query}*"`);
    }

    if (department) {
      params.append('departement', department);
    }

    if (city) {
      params.append('commune', city);
    }

    if (activity_code) {
      params.append('activitePrincipaleUniteLegale', activity_code);
    }

    params.append('nombre', Math.min(max_results, 1000)); // Max 1000 par requête
    params.append('champs', 'siren,denominationUniteLegale,activitePrincipaleUniteLegale,categorieEntreprise,trancheEffectifsUniteLegale,dateCreationUniteLegale,etatAdministratifUniteLegale,adresseEtablissement');

    const url = `https://api.insee.fr/entreprises/sirene/V3/siret?${params.toString()}`;

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${process.env.INSEE_API_KEY || ''}`
      }
    });

    if (!response.ok) {
      // Même sans clé API, certaines requêtes fonctionnent en mode limité
      warn(`⚠️ Erreur API Sirene (${response.status}). Essai en mode public...`);

      // Fallback: API publique sans auth (limitée mais fonctionnelle)
      const publicUrl = `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(query || city || '')}&per_page=${max_results}`;
      const publicResponse = await fetch(publicUrl);

      if (!publicResponse.ok) {
        throw new Error(`API Gouv indisponible: ${publicResponse.status}`);
      }

      const publicData = await publicResponse.json();
      return res.json({
        success: true,
        source: 'api.gouv.fr/search (public)',
        companies: formatPublicApiResults(publicData.results || []),
        total: publicData.total_results || 0
      });
    }

    const data = await response.json();

    if (!data.etablissements || data.etablissements.length === 0) {
      return res.json({
        success: true,
        source: 'api.insee.fr/sirene',
        companies: [],
        total: 0,
        message: 'Aucune entreprise trouvée'
      });
    }

    const companies = formatSireneResults(data.etablissements);

    log(`✅ ${companies.length} entreprises trouvées via API Sirene`);

    return res.json({
      success: true,
      source: 'api.insee.fr/sirene',
      companies: companies,
      total: data.header?.total || companies.length
    });

  } catch (error) {
    error('❌ Erreur API Gouv search:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Importer les entreprises trouvées dans une base de données LeadSynch
 */
router.post('/import', authMiddleware, async (req, res) => {
  try {
    const { companies, database_id } = req.body;
    const { tenant_id, id: user_id } = req.user;

    if (!companies || !Array.isArray(companies) || companies.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'companies array requis'
      });
    }

    if (!database_id) {
      return res.status(400).json({
        success: false,
        error: 'database_id requis'
      });
    }

    // Vérifier que la base existe
    const database = await queryOne(
      'SELECT id, name FROM lead_databases WHERE id = $1 AND tenant_id = $2',
      [database_id, tenant_id]
    );

    if (!database) {
      return res.status(404).json({
        success: false,
        error: 'Base de données introuvable'
      });
    }

    log(`📥 Import de ${companies.length} entreprises dans la base "${database.name}"`);

    let imported = 0;
    let duplicates = 0;
    let errors = 0;
    const importedLeads = [];

    for (const company of companies) {
      try {
        // Vérifier doublon par SIREN ou email
        const existing = await queryOne(
          `SELECT id FROM leads
           WHERE tenant_id = $1
           AND (siren = $2 OR (email IS NOT NULL AND email = $3))`,
          [tenant_id, company.siren, company.email]
        );

        if (existing) {
          duplicates++;
          continue;
        }

        // Créer le lead
        const lead = await queryOne(
          `INSERT INTO leads (
            id, tenant_id, database_id, company_name, contact_name, email, phone,
            address, city, postal_code, country, sector, industry, siren,
            employees_range, legal_form, creation_date, website, source,
            created_at, updated_at, assigned_to
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW(), NOW(), $20
          ) RETURNING id, company_name, email, city, sector`,
          [
            uuidv4(),
            tenant_id,
            database_id,
            company.company_name,
            company.contact_name || null,
            company.email || null,
            company.phone || null,
            company.address || null,
            company.city || null,
            company.postal_code || null,
            'France',
            company.sector || 'Services',
            company.industry || company.activity_label || null,
            company.siren || null,
            company.employees_range || null,
            company.legal_form || null,
            company.creation_date || null,
            company.website || null,
            'API Gouv (Sirene)',
            user_id
          ]
        );

        importedLeads.push(lead);
        imported++;

      } catch (leadError) {
        error('Erreur import lead:', leadError);
        errors++;
      }
    }

    log(`✅ Import terminé: ${imported} importés, ${duplicates} doublons, ${errors} erreurs`);

    return res.json({
      success: true,
      imported: imported,
      duplicates: duplicates,
      errors: errors,
      total: companies.length,
      leads: importedLeads
    });

  } catch (error) {
    error('❌ Erreur import API Gouv:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Obtenir les codes NAF (secteurs d'activité)
 * Pour aider à filtrer les recherches
 */
router.get('/naf-codes', authMiddleware, async (req, res) => {
  try {
    const { search } = req.query;

    // Liste des codes NAF les plus courants pour la prospection B2B
    const nafCodes = [
      { code: '62', label: 'Programmation, conseil et autres activités informatiques' },
      { code: '6201Z', label: 'Programmation informatique' },
      { code: '6202A', label: 'Conseil en systèmes et logiciels informatiques' },
      { code: '6311Z', label: 'Traitement de données, hébergement et activités connexes' },
      { code: '6312Z', label: 'Portails Internet' },
      { code: '69', label: 'Activités juridiques et comptables' },
      { code: '6910Z', label: 'Activités juridiques' },
      { code: '6920Z', label: 'Activités comptables' },
      { code: '70', label: 'Activités des sièges sociaux ; conseil de gestion' },
      { code: '7022Z', label: 'Conseil pour les affaires et autres conseils de gestion' },
      { code: '73', label: 'Publicité et études de marché' },
      { code: '7311Z', label: 'Activités des agences de publicité' },
      { code: '7312Z', label: 'Régie publicitaire de médias' },
      { code: '7320Z', label: 'Études de marché et sondages' },
      { code: '74', label: 'Autres activités spécialisées, scientifiques et techniques' },
      { code: '7490B', label: 'Activités spécialisées, scientifiques et techniques diverses' },
      { code: '78', label: 'Activités liées à l\'emploi' },
      { code: '7820Z', label: 'Activités des agences de travail temporaire' },
      { code: '82', label: 'Activités administratives et autres activités de soutien aux entreprises' },
      { code: '8299Z', label: 'Autres activités de soutien aux entreprises n.c.a.' },
      { code: '85', label: 'Enseignement' },
      { code: '8559A', label: 'Formation continue d\'adultes' }
    ];

    let filtered = nafCodes;

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = nafCodes.filter(naf =>
        naf.code.toLowerCase().includes(searchLower) ||
        naf.label.toLowerCase().includes(searchLower)
      );
    }

    return res.json({
      success: true,
      codes: filtered
    });

  } catch (error) {
    error('❌ Erreur NAF codes:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Formater les résultats de l'API Sirene
 */
function formatSireneResults(etablissements) {
  return etablissements.map(etab => {
    const unite = etab.uniteLegale || {};
    const adresse = etab.adresseEtablissement || {};

    return {
      siren: unite.siren || etab.siren,
      siret: etab.siret,
      company_name: unite.denominationUniteLegale || unite.nomUniteLegale || 'Entreprise',
      contact_name: null, // Pas disponible dans API Sirene
      email: null, // Pas disponible dans API publique
      phone: null, // Pas disponible dans API publique
      address: [
        adresse.numeroVoieEtablissement,
        adresse.typeVoieEtablissement,
        adresse.libelleVoieEtablissement
      ].filter(Boolean).join(' '),
      city: adresse.libelleCommuneEtablissement || null,
      postal_code: adresse.codePostalEtablissement || null,
      activity_code: unite.activitePrincipaleUniteLegale || etab.activitePrincipaleEtablissement,
      activity_label: getNafLabel(unite.activitePrincipaleUniteLegale),
      sector: getSectorFromNaf(unite.activitePrincipaleUniteLegale),
      industry: getNafLabel(unite.activitePrincipaleUniteLegale),
      employees_range: getEmployeesRange(unite.trancheEffectifsUniteLegale),
      legal_form: unite.categorieJuridiqueUniteLegale || null,
      creation_date: unite.dateCreationUniteLegale || null,
      status: etab.etatAdministratifEtablissement === 'A' ? 'Actif' : 'Inactif',
      website: null // Pas disponible dans API publique
    };
  });
}

/**
 * Formater les résultats de l'API publique
 */
function formatPublicApiResults(results) {
  return results.map(company => ({
    siren: company.siren,
    siret: company.siege?.siret || null,
    company_name: company.nom_complet || company.nom_raison_sociale,
    contact_name: company.dirigeants?.[0]?.nom_complet || null,
    email: null,
    phone: null,
    address: company.siege?.adresse || null,
    city: company.siege?.commune || null,
    postal_code: company.siege?.code_postal || null,
    activity_code: company.activite_principale,
    activity_label: company.libelle_activite_principale,
    sector: getSectorFromNaf(company.activite_principale),
    industry: company.libelle_activite_principale,
    employees_range: company.tranche_effectif_salarie,
    legal_form: company.nature_juridique,
    creation_date: company.date_creation,
    status: company.etat_administratif === 'A' ? 'Actif' : 'Inactif',
    website: null
  }));
}

/**
 * Déterminer le secteur à partir du code NAF
 */
function getSectorFromNaf(nafCode) {
  if (!nafCode) return 'Services';

  const code = nafCode.substring(0, 2);

  const sectorMapping = {
    '62': 'Informatique',
    '63': 'Informatique',
    '69': 'Juridique',
    '70': 'Conseil',
    '73': 'Marketing',
    '74': 'Conseil',
    '78': 'RH',
    '82': 'Services',
    '85': 'Formation'
  };

  return sectorMapping[code] || 'Services';
}

/**
 * Obtenir le libellé NAF simplifié
 */
function getNafLabel(nafCode) {
  if (!nafCode) return null;

  const labels = {
    '6201Z': 'Programmation informatique',
    '6202A': 'Conseil IT',
    '6311Z': 'Hébergement données',
    '6910Z': 'Juridique',
    '6920Z': 'Comptabilité',
    '7022Z': 'Conseil gestion',
    '7311Z': 'Publicité',
    '7320Z': 'Études de marché',
    '7820Z': 'Travail temporaire',
    '8559A': 'Formation'
  };

  return labels[nafCode] || null;
}

/**
 * Convertir tranche effectifs en range
 */
function getEmployeesRange(tranche) {
  const mapping = {
    '00': '0',
    '01': '1-2',
    '02': '3-5',
    '03': '6-9',
    '11': '10-19',
    '12': '20-49',
    '21': '50-99',
    '22': '100-199',
    '31': '200-249',
    '32': '250-499',
    '41': '500-999',
    '42': '1000-1999',
    '51': '2000-4999',
    '52': '5000-9999',
    '53': '10000+'
  };

  return mapping[tranche] || null;
}

export default router;
