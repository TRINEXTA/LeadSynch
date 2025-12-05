import { log, error, warn } from "../lib/logger.js";
/**
 * Script de génération automatique de base de prospects pour TRINEXTA
 * Secteurs ciblés: Services IT, Conseil Informatique, Développement
 * Sources: API.gouv.fr (Sirene INSEE) - 100% légal et conforme RGPD
 *
 * Usage: node generate-trinexta-database.js [tenant_id] [database_id]
 */

import { queryOne, queryAll, execute } from '../lib/db.js';
import { v4 as uuidv4 } from 'uuid';

// Codes NAF cibles pour Trinexta (IT Services)
const TARGET_NAF_CODES = [
  '6201Z', // Programmation informatique
  '6202A', // Conseil en systèmes et logiciels informatiques
  '6202B', // Tierce maintenance de systèmes et d'applications informatiques
  '6203Z', // Gestion d'installations informatiques
  '6209Z', // Autres activités informatiques
  '6311Z', // Traitement de données, hébergement et activités connexes
  '6312Z', // Portails Internet
  '6391Z', // Activités des agences de presse
  '7022Z', // Conseil pour les affaires et autres conseils de gestion
  '7112B', // Ingénierie, études techniques
  '8559A', // Formation continue d'adultes (IT)
  '8559B'  // Autres enseignements
];

// Départements à cibler (grandes villes IT)
const TARGET_DEPARTMENTS = [
  '75', // Paris
  '92', // Hauts-de-Seine (La Défense)
  '78', // Yvelines
  '91', // Essonne
  '94', // Val-de-Marne
  '69', // Rhône (Lyon)
  '31', // Haute-Garonne (Toulouse)
  '33', // Gironde (Bordeaux)
  '59', // Nord (Lille)
  '06', // Alpes-Maritimes (Nice/Sophia Antipolis)
  '13', // Bouches-du-Rhône (Marseille, Aix)
  '44', // Loire-Atlantique (Nantes)
  '35'  // Ille-et-Vilaine (Rennes)
];

// Villes spécifiques à cibler
const TARGET_CITIES = [
  'Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice', 'Nantes',
  'Montpellier', 'Strasbourg', 'Bordeaux', 'Lille', 'Rennes',
  'Reims', 'Saint-Étienne', 'Toulon', 'Grenoble', 'Dijon',
  'Angers', 'Nîmes', 'Villeurbanne', 'Aix-en-Provence',
  'Boulogne-Billancourt', 'Issy-les-Moulineaux', 'Levallois-Perret'
];

async function generateTrinextaDatabase(tenantId, databaseId) {
  log('🚀 Démarrage génération base prospects Trinexta...');
  log(`📊 Tenant: ${tenantId}, Database: ${databaseId}`);

  // Vérifier que la base existe
  const database = await queryOne(
    'SELECT id, name FROM lead_databases WHERE id = $1 AND tenant_id = $2',
    [databaseId, tenantId]
  );

  if (!database) {
    throw new Error('Base de données introuvable');
  }

  log(`✅ Base trouvée: "${database.name}"`);

  let totalCompanies = 0;
  let totalImported = 0;
  let totalDuplicates = 0;
  let totalErrors = 0;

  // Pour chaque code NAF
  for (const nafCode of TARGET_NAF_CODES) {
    log(`\n🔍 Recherche pour NAF ${nafCode}...`);

    // Pour chaque département
    for (const dept of TARGET_DEPARTMENTS) {
      try {
        const companies = await searchCompaniesApiGouv(nafCode, dept);

        if (companies.length === 0) {
          log(`  ⚠️ Aucune entreprise trouvée (NAF=${nafCode}, Dept=${dept})`);
          continue;
        }

        log(`  📦 ${companies.length} entreprises trouvées (Dept ${dept})`);
        totalCompanies += companies.length;

        // Importer dans la base
        const importResult = await importCompanies(companies, tenantId, databaseId);
        totalImported += importResult.imported;
        totalDuplicates += importResult.duplicates;
        totalErrors += importResult.errors;

        // Pause de 2 secondes entre requêtes (rate limiting API)
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        error(`  ❌ Erreur NAF=${nafCode} Dept=${dept}:`, error.message);
        totalErrors++;
      }
    }
  }

  log('\n' + '='.repeat(60));
  log('📊 RÉSUMÉ GÉNÉRATION BASE TRINEXTA');
  log('='.repeat(60));
  log(`✅ Entreprises trouvées: ${totalCompanies}`);
  log(`✅ Entreprises importées: ${totalImported}`);
  log(`⚠️  Doublons ignorés: ${totalDuplicates}`);
  log(`❌ Erreurs: ${totalErrors}`);
  log('='.repeat(60));

  return {
    total_found: totalCompanies,
    imported: totalImported,
    duplicates: totalDuplicates,
    errors: totalErrors
  };
}

/**
 * Rechercher des entreprises via API publique gouv.fr
 * Ne nécessite PAS de clé API
 */
async function searchCompaniesApiGouv(nafCode, department) {
  try {
    // API publique sans authentification
    const url = `https://recherche-entreprises.api.gouv.fr/search?activite_principale=${nafCode}&code_postal=${department}*&per_page=25&page=1`;

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      warn(`⚠️ API Gouv erreur ${response.status}`);
      return [];
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      return [];
    }

    // Formater les résultats
    return data.results
      .filter(company => company.etat_administratif === 'A') // Seulement entreprises actives
      .filter(company => {
        // Filtrer par ville si possible
        const city = company.siege?.commune || '';
        return TARGET_CITIES.some(targetCity =>
          city.toLowerCase().includes(targetCity.toLowerCase())
        );
      })
      .map(company => ({
        siren: company.siren,
        siret: company.siege?.siret || null,
        company_name: company.nom_complet || company.nom_raison_sociale,
        contact_name: null,
        email: null,
        phone: null,
        address: company.siege?.adresse || null,
        city: company.siege?.commune || null,
        postal_code: company.siege?.code_postal || null,
        activity_code: company.activite_principale,
        activity_label: company.libelle_activite_principale,
        sector: getSectorFromNaf(company.activite_principale),
        industry: company.libelle_activite_principale,
        employees_range: company.tranche_effectif_salarie || null,
        legal_form: company.nature_juridique || null,
        creation_date: company.date_creation || null,
        status: 'Actif',
        website: null,
        source: 'API.gouv.fr (Sirene)'
      }));

  } catch (error) {
    error('Erreur searchCompaniesApiGouv:', error.message);
    return [];
  }
}

/**
 * Importer les entreprises dans la base LeadSynch
 */
async function importCompanies(companies, tenantId, databaseId) {
  let imported = 0;
  let duplicates = 0;
  let errors = 0;

  for (const company of companies) {
    try {
      // Vérifier doublon par SIREN
      const existing = await queryOne(
        `SELECT id FROM leads
         WHERE tenant_id = $1 AND siren = $2`,
        [tenantId, company.siren]
      );

      if (existing) {
        duplicates++;
        continue;
      }

      // Créer le lead
      await execute(
        `INSERT INTO leads (
          id, tenant_id, database_id, company_name, contact_name, email, phone,
          address, city, postal_code, country, sector, industry, siren,
          employees_range, legal_form, creation_date, website, source,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW(), NOW()
        )`,
        [
          uuidv4(),
          tenantId,
          databaseId,
          company.company_name,
          company.contact_name,
          company.email,
          company.phone,
          company.address,
          company.city,
          company.postal_code,
          'France',
          company.sector,
          company.industry,
          company.siren,
          company.employees_range,
          company.legal_form,
          company.creation_date,
          company.website,
          company.source
        ]
      );

      imported++;

    } catch (leadError) {
      error('Erreur import lead:', leadError.message);
      errors++;
    }
  }

  return { imported, duplicates, errors };
}

/**
 * Déterminer le secteur à partir du code NAF
 */
function getSectorFromNaf(nafCode) {
  if (!nafCode) return 'IT Services';

  const code = nafCode.substring(0, 2);

  const sectorMapping = {
    '62': 'Informatique',
    '63': 'Informatique',
    '70': 'Conseil IT',
    '71': 'Ingénierie',
    '85': 'Formation IT'
  };

  return sectorMapping[code] || 'IT Services';
}

// Exécution si appelé directement
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const tenantId = process.argv[2];
  const databaseId = process.argv[3];

  if (!tenantId || !databaseId) {
    error('Usage: node generate-trinexta-database.js <tenant_id> <database_id>');
    process.exit(1);
  }

  generateTrinextaDatabase(tenantId, databaseId)
    .then(result => {
      log('\n✅ Génération terminée avec succès!');
      log(JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch(error => {
      error('\n❌ Erreur fatale:', error);
      process.exit(1);
    });
}

export { generateTrinextaDatabase };
