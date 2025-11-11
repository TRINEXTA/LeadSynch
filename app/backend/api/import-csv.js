import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import db from '../config/db.js';
import { parse } from 'csv-parse/sync';

const router = express.Router();

// POST /api/import-csv - Import et classification automatique
router.post('/', authMiddleware, async (req, res) => {
  const tenant_id = req.user.tenant_id;
  const user_id = req.user.id;

  try {
    const { database_id, csv_content, sector } = req.body;

    if (!database_id || !csv_content) {
      return res.status(400).json({ 
        success: false,
        error: 'database_id et csv_content requis' 
      });
    }

    console.log(`📊 [IMPORT CSV] Début pour base ${database_id} - Tenant ${tenant_id}`);

    // Vérifier que la database existe et appartient au tenant
    const dbCheck = await db.query(
      'SELECT id FROM lead_databases WHERE id = $1 AND tenant_id = $2',
      [database_id, tenant_id]
    );

    if (dbCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Base de données introuvable'
      });
    }

    // Parser le CSV
    let records;
    try {
      records = parse(csv_content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
        bom: true,
        encoding: 'utf8'
      });
    } catch (parseError) {
      console.error('❌ Erreur parsing CSV:', parseError);
      return res.status(400).json({
        success: false,
        error: 'Format CSV invalide',
        details: parseError.message
      });
    }

    console.log(`📋 ${records.length} lignes CSV détectées`);

    if (records.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Aucune donnée trouvée dans le CSV'
      });
    }

    let added = 0;
    let updated = 0;
    let skipped = 0;
    const sectorsDetected = {};
    const errors = [];

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      
      try {
        if (i === 0) {
          console.log('🔍 Colonnes détectées:', Object.keys(record).slice(0, 10));
        }

        // ✅ Mapping et nettoyage des colonnes
        let company_name = (
          record['Nom de la société'] || 
          record.company_name || 
          record.nom || 
          record.entreprise || 
          record.name || 
          record.Company ||
          record['Company Name'] ||
          ''
        ).trim();

        let contact_name = (
          record['Nom du contact'] || 
          record.contact_name || 
          record.contact || 
          record.nom_contact ||
          record['Contact Name'] ||
          ''
        ).trim();

        let email = (
          record['Email'] || 
          record.email || 
          record.mail ||
          record['E-mail'] ||
          ''
        ).trim();

        let phone = (
          record['Téléphone'] || 
          record.phone || 
          record.telephone || 
          record.tel || 
          record.Phone ||
          record['Phone Number'] ||
          ''
        ).trim();

        let website = (
          record['website'] || 
          record.site || 
          record.web || 
          record.Website ||
          record['Site Web'] ||
          ''
        ).trim();

        let rue = (
          record['rue'] || 
          record.address || 
          record.adresse || 
          record.Address ||
          record['Adresse'] ||
          ''
        ).trim();

        let postal_code = (
          record['code postal'] || 
          record.cp || 
          record.postal_code ||
          record['Code Postal'] ||
          record.zipcode ||
          ''
        ).trim();

        let city = (
          record['City'] || 
          record.city || 
          record.ville ||
          record['Ville'] ||
          ''
        ).trim();

        let address = rue && postal_code 
          ? `${rue}, ${postal_code} ${city}`.trim()
          : (rue || '');

        // Extraction SIRET
        const description = record['Description'] || '';
        const siretMatch = description.match(/SIRET\s*:?\s*(\d{14})/i);
        let siret = siretMatch 
          ? siretMatch[1] 
          : (record.siret || record.Siret || record.SIRET || '');
        siret = siret.trim();
        
        // Extraction code NAF
        const nafMatch = description.match(/Code NAF\s*:?\s*([A-Z0-9.]+)/i);
        let naf_code = nafMatch 
          ? nafMatch[1] 
          : (record.naf || record.NAF || record.code_naf || record['Code NAF'] || '');
        naf_code = naf_code.trim();

        // Extraction étiquette secteur
        const etiquette = record['Etiquette'] || record['Étiquette'] || '';

        // Validation nom entreprise
        if (!company_name || company_name.length < 2) {
          console.log(`⚠️ Ligne ${i + 1} ignorée (nom invalide):`, company_name);
          skipped++;
          errors.push({
            line: i + 1,
            reason: 'Nom d\'entreprise invalide'
          });
          continue;
        }

        // 🤖 Détection automatique du secteur
        let detectedSector = sector || 'autre';
        
        if (etiquette) {
          detectedSector = mapEtiquetteToSector(etiquette);
        } else if (naf_code) {
          const nafCode = naf_code.replace(/\./g, '').substring(0, 2);
          detectedSector = detectSectorFromNAF(nafCode);
        } else if (company_name) {
          detectedSector = detectSectorFromName(company_name);
        }

        sectorsDetected[detectedSector] = (sectorsDetected[detectedSector] || 0) + 1;

        // ✅ Convertir les strings vides en NULL pour PostgreSQL
        contact_name = contact_name || null;
        email = email || null;
        phone = phone || null;
        website = website || null;
        address = address || null;
        city = city || null;
        postal_code = postal_code || null;
        siret = siret || null;
        naf_code = naf_code || null;

        // ✅ Déduplication intelligente
        let existingLead = null;

        // Chercher par email si présent
        if (email) {
          const emailCheck = await db.query(
            'SELECT id FROM leads WHERE tenant_id = $1 AND email = $2 LIMIT 1',
            [tenant_id, email]
          );
          if (emailCheck.rows.length > 0) {
            existingLead = emailCheck.rows[0];
          }
        }

        // Si pas trouvé par email, chercher par phone
        if (!existingLead && phone) {
          const phoneCheck = await db.query(
            'SELECT id FROM leads WHERE tenant_id = $1 AND phone = $2 LIMIT 1',
            [tenant_id, phone]
          );
          if (phoneCheck.rows.length > 0) {
            existingLead = phoneCheck.rows[0];
          }
        }

        // Si pas trouvé, chercher par company_name + city
        if (!existingLead && city) {
          const nameCheck = await db.query(
            'SELECT id FROM leads WHERE tenant_id = $1 AND LOWER(company_name) = LOWER($2) AND city = $3 LIMIT 1',
            [tenant_id, company_name, city]
          );
          if (nameCheck.rows.length > 0) {
            existingLead = nameCheck.rows[0];
          }
        }

        if (existingLead) {
          // Lead existe → Update
          const leadId = existingLead.id;
          
          await db.query(
            `UPDATE leads 
             SET contact_name = COALESCE($1, contact_name),
                 phone = COALESCE($2, phone),
                 email = COALESCE($3, email),
                 website = COALESCE($4, website),
                 address = COALESCE($5, address),
                 city = COALESCE($6, city),
                 postal_code = COALESCE($7, postal_code),
                 sector = COALESCE($8, sector),
                 siret = COALESCE($9, siret),
                 naf_code = COALESCE($10, naf_code),
                 updated_at = NOW()
             WHERE id = $11 AND tenant_id = $12`,
            [contact_name, phone, email, website, address, city, postal_code,
             detectedSector, siret, naf_code, leadId, tenant_id]
          );

          // Créer la relation si elle n'existe pas
          await db.query(
            `INSERT INTO lead_database_relations (lead_id, database_id, added_at)
             VALUES ($1, $2, NOW())
             ON CONFLICT (lead_id, database_id) DO NOTHING`,
            [leadId, database_id]
          );

          updated++;
          
        } else {
          // Nouveau lead → INSERT
          const newLead = await db.query(
            `INSERT INTO leads 
            (tenant_id, company_name, contact_name, phone, email, website, 
             address, city, postal_code, sector, siret, naf_code, 
             status, source, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 
                    'nouveau', 'import_csv', NOW(), NOW())
            RETURNING id`,
            [tenant_id, company_name, contact_name, phone, email, website, 
             address, city, postal_code, detectedSector, siret, naf_code]
          );
          
          const leadId = newLead.rows[0].id;

          // Créer la relation
          await db.query(
            `INSERT INTO lead_database_relations (lead_id, database_id, added_at)
             VALUES ($1, $2, NOW())`,
            [leadId, database_id]
          );
          
          added++;
        }

        // Log progression
        if (i % 50 === 0 && i > 0) {
          console.log(`📈 ${i}/${records.length} (${added} ajoutés, ${updated} mis à jour)`);
        }

      } catch (lineError) {
        console.error(`❌ Ligne ${i + 1}:`, lineError.message);
        skipped++;
        errors.push({
          line: i + 1,
          reason: lineError.message
        });
      }
    }

    // Mettre à jour la base
    try {
      await db.query(
        `UPDATE lead_databases 
         SET segmentation = $1,
             total_leads = (
               SELECT COUNT(DISTINCT lead_id) 
               FROM lead_database_relations 
               WHERE database_id = $2
             ),
             updated_at = NOW()
         WHERE id = $2 AND tenant_id = $3`,
        [JSON.stringify(sectorsDetected), database_id, tenant_id]
      );
    } catch (updateError) {
      console.error('⚠️ Erreur mise à jour segmentation:', updateError);
    }

    console.log(`✅ Import: ${added} ajoutés, ${updated} mis à jour, ${skipped} ignorés`);
    console.log(`📊 Secteurs:`, sectorsDetected);

    return res.json({
      success: true,
      stats: {
        total: records.length,
        added,
        updated,
        skipped
      },
      segmentation: sectorsDetected,
      errors: errors.length > 0 ? errors.slice(0, 10) : []
    });

  } catch (error) {
    console.error('❌ [IMPORT CSV] Erreur fatale:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Erreur lors de l\'import',
      details: error.message 
    });
  }
});

// 🤖 Fonctions de classification
function mapEtiquetteToSector(etiquette) {
  const mapping = {
    'santé': 'sante', 'médico': 'sante', 'medical': 'sante',
    'commerce': 'commerce', 'distribution': 'commerce',
    'hébergement': 'hotellerie', 'restauration': 'hotellerie', 'hôtel': 'hotellerie',
    'btp': 'btp', 'construction': 'btp',
    'informatique': 'informatique', 'it': 'informatique', 'tech': 'informatique',
    'juridique': 'juridique', 'legal': 'juridique', 'avocat': 'juridique',
    'comptabilité': 'comptabilite', 'comptable': 'comptabilite',
    'immobilier': 'immobilier',
    'transport': 'logistique', 'logistique': 'logistique',
    'automobile': 'automobile',
    'industrie': 'industrie',
    'services': 'services',
    'consulting': 'consulting', 'conseil': 'consulting',
    'education': 'education', 'formation': 'education',
    'rh': 'rh', 'ressources humaines': 'rh'
  };
  
  const lower = etiquette.toLowerCase();
  for (const [key, value] of Object.entries(mapping)) {
    if (lower.includes(key)) return value;
  }
  return 'autre';
}

function detectSectorFromNAF(nafCode) {
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
    '68': 'immobilier',
    '69': 'juridique', '70': 'consulting',
    '71': 'consulting', '72': 'informatique', '73': 'consulting', '74': 'consulting',
    '75': 'services',
    '77': 'services', '78': 'rh', '79': 'services',
    '80': 'services', '81': 'services', '82': 'services',
    '85': 'education', '86': 'sante', '87': 'sante', '88': 'sante',
    '90': 'services', '91': 'services', '92': 'services', '93': 'services',
    '94': 'services', '95': 'services', '96': 'services'
  };
  return mapping[nafCode] || 'autre';
}

function detectSectorFromName(name) {
  const lower = name.toLowerCase();
  
  if (/avoca|juridi|legal|notai|huissi/.test(lower)) return 'juridique';
  if (/compta|expert.compta|audit|cabinet comptable/.test(lower)) return 'comptabilite';
  if (/medic|santé|clinic|hospit|pharma|dentist|infirmi|creche|ehpad|medecin|docteur/.test(lower)) return 'sante';
  if (/inform|digital|web|soft|tech|dev|cyber|data|si\b|systeme/.test(lower)) return 'informatique';
  if (/btp|construct|maçon|plomb|electric|charpent|menuisi|peintr/.test(lower)) return 'btp';
  if (/hotel|restaura|cafe|bar|traiteur|brasserie/.test(lower)) return 'hotellerie';
  if (/immo|foncier|gestion.locative|agence immobiliere/.test(lower)) return 'immobilier';
  if (/transport|logistiq|livraison|courier|fret/.test(lower)) return 'logistique';
  if (/commerce|retail|boutique|magasin|cave|caviste|distribution/.test(lower)) return 'commerce';
  if (/ecole|formation|educat|enseign|centre de formation/.test(lower)) return 'education';
  if (/consult|conseil|strateg|cabinet conseil/.test(lower)) return 'consulting';
  if (/recrut|rh|ressources.humaines|interim/.test(lower)) return 'rh';
  if (/auto|garage|meca|concessionnaire/.test(lower)) return 'automobile';
  if (/indust|fabri|usine|manufactur/.test(lower)) return 'industrie';
  
  return 'autre';
}

export default router;