import { authMiddleware } from '../middleware/auth.js';
import db from '../config/db.js';
import { parse } from 'csv-parse/sync';

async function handler(req, res) {
  const tenant_id = req.user.tenant_id;
  const user_id = req.user.id;

  try {
    if (req.method === 'POST') {
      const { database_id, csv_content, sector } = req.body;

      if (!database_id || !csv_content) {
        return res.status(400).json({ 
          error: 'database_id et csv_content requis' 
        });
      }

      console.log(`📊 Import CSV pour base ${database_id}`);

      // Parser le CSV
      const records = parse(csv_content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
        bom: true // Support BOM UTF-8
      });

      console.log(`📋 ${records.length} lignes CSV détectées`);

      let added = 0;
      let updated = 0;
      let skipped = 0;

      const sectorsDetected = {};

      for (const record of records) {
        try {
          // ✅ Mapping flexible des colonnes (FRANÇAIS + ANGLAIS)
          const company_name = record['Nom de la société'] || record.company_name || record.nom || record.entreprise || record.name || record.Company;
          const phone = record['Téléphone'] || record.phone || record.telephone || record.tel || record.Phone;
          const email = record['Email'] || record.email || record.mail;
          const website = record['website'] || record.site || record.web || record.Website;
          const rue = record['rue'] || record.address || record.adresse || record.Address;
          const codePostal = record['code postal'] || record.cp || record.postal_code;
          const city = record['City'] || record.city || record.ville;
          const address = rue && codePostal ? `${rue}, ${codePostal} ${city}` : (rue || '');
          
          // ✅ Nom du contact
          const contact_name = record['Nom du contact'] || record.contact_name || record.contact || record.nom_contact || null;
          
          // ✅ Extraction SIRET depuis la description
          const description = record['Description'] || '';
          const siretMatch = description.match(/SIRET\s*:\s*(\d+)/i);
          const siret = siretMatch ? siretMatch[1] : (record.siret || record.Siret || record.SIRET || null);
          
          // ✅ Extraction code NAF depuis la description
          const nafMatch = description.match(/Code NAF\s*:\s*([A-Z0-9.]+)/i);
          const naf = nafMatch ? nafMatch[1] : (record.naf || record.NAF || record.code_naf || null);

          // ✅ Extraction secteur depuis Etiquette
          const etiquette = record['Etiquette'] || '';

          if (!company_name || company_name.length < 2) {
            console.log('⚠️ Lead ignoré (nom invalide):', company_name);
            skipped++;
            continue;
          }

          // 🤖 Détection automatique du secteur
          let detectedSector = sector || 'autre';
          
          // Priorité 1: Etiquette du CSV
          if (etiquette) {
            detectedSector = mapEtiquetteToSector(etiquette);
          }
          // Priorité 2: Code NAF
          else if (naf) {
            const nafCode = naf.replace(/\./g, '').substring(0, 2);
            detectedSector = detectSectorFromNAF(nafCode);
          }
          // Priorité 3: Nom de l'entreprise
          else if (company_name) {
            detectedSector = detectSectorFromName(company_name);
          }

          sectorsDetected[detectedSector] = (sectorsDetected[detectedSector] || 0) + 1;

          // ✅ Vérifier si le lead existe
          const existingLead = await db.query(
            `SELECT l.id FROM leads l
             JOIN lead_database_relations ldr ON l.id = ldr.lead_id
             WHERE l.tenant_id = $1 
             AND ldr.database_id = $2
             AND LOWER(l.company_name) = LOWER($3)`,
            [tenant_id, database_id, company_name]
          );

          if (existingLead.rows.length > 0) {
            // Lead existe → Update
            await db.query(
              `UPDATE leads 
               SET phone = COALESCE($1, phone),
                   email = COALESCE($2, email),
                   website = COALESCE($3, website),
                   address = COALESCE($4, address),
                   city = COALESCE($5, city),
                   sector = COALESCE($6, sector),
                   siret = COALESCE($7, siret),
                   naf_code = COALESCE($8, naf_code),
                   contact_name = COALESCE($9, contact_name),
                   updated_at = NOW()
               WHERE id = $10`,
              [phone, email, website, address, city, detectedSector, siret, naf, contact_name, existingLead.rows[0].id]
            );
            updated++;
          } else {
            // ✅ Nouveau lead → INSERT
            const newLead = await db.query(
              `INSERT INTO leads 
              (tenant_id, company_name, contact_name, phone, email, website, address, city, sector, siret, naf_code, status, source, created_by, created_at, updated_at)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'nouveau', 'import_csv', $12, NOW(), NOW())
              RETURNING id`,
              [tenant_id, company_name, contact_name, phone, email, website, address, city, detectedSector, siret, naf, user_id]
            );
            
            // ✅ Créer la relation lead <-> database
            await db.query(
              `INSERT INTO lead_database_relations (lead_id, database_id, added_at)
               VALUES ($1, $2, NOW())`,
              [newLead.rows[0].id, database_id]
            );
            
            added++;
          }
        } catch (lineError) {
          console.error('❌ Erreur ligne:', lineError.message);
          skipped++;
        }
      }

      // ✅ Mettre à jour la segmentation de la base
      await db.query(
        `UPDATE lead_databases 
         SET segmentation = $1,
             total_leads = (SELECT COUNT(DISTINCT ldr.lead_id) FROM lead_database_relations ldr WHERE ldr.database_id = $2),
             updated_at = NOW()
         WHERE id = $2`,
        [JSON.stringify(sectorsDetected), database_id]
      );

      console.log(`✅ Import terminé: ${added} ajoutés, ${updated} mis à jour, ${skipped} ignorés`);
      console.log(`📊 Secteurs détectés:`, sectorsDetected);

      return res.json({
        success: true,
        stats: {
          total: records.length,
          added,
          updated,
          skipped
        },
        segmentation: sectorsDetected
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('❌ Import CSV error:', error);
    return res.status(500).json({ 
      error: 'Erreur import',
      details: error.message 
    });
  }
}

// 🤖 Mapper l'étiquette vers un secteur
function mapEtiquetteToSector(etiquette) {
  const mapping = {
    'Santé / Médico-social': 'sante',
    'Commerce / Distribution': 'commerce',
    'Hébergement / Restauration': 'hotellerie',
    'BTP / Construction': 'btp',
    'Informatique / IT': 'informatique',
    'Juridique / Legal': 'juridique',
    'Comptabilité': 'comptabilite',
    'Immobilier': 'immobilier',
    'Transport / Logistique': 'logistique',
    'Automobile': 'automobile',
    'Industrie': 'industrie',
    'Services': 'services',
    'Consulting': 'consulting',
    'Education': 'education',
    'RH': 'rh'
  };
  
  for (const [key, value] of Object.entries(mapping)) {
    if (etiquette.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }
  
  return 'autre';
}

// 🤖 Détection secteur basée sur code NAF
function detectSectorFromNAF(nafCode) {
  const mapping = {
    '01': 'agriculture', '02': 'agriculture', '03': 'agriculture',
    '05': 'industrie', '06': 'industrie', '07': 'industrie', '08': 'industrie',
    '10': 'industrie', '11': 'industrie', '12': 'industrie',
    '41': 'btp', '42': 'btp', '43': 'btp',
    '45': 'automobile', '46': 'commerce', '47': 'commerce',
    '49': 'logistique', '50': 'logistique', '51': 'logistique', '52': 'logistique', '53': 'logistique',
    '55': 'hotellerie', '56': 'hotellerie',
    '58': 'informatique', '59': 'informatique', '60': 'informatique', '61': 'informatique', '62': 'informatique', '63': 'informatique',
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

// 🤖 Détection secteur basée sur le nom de l'entreprise
function detectSectorFromName(name) {
  const lowerName = name.toLowerCase();
  
  if (/avoca|juridi|legal|notai|huissi/.test(lowerName)) return 'juridique';
  if (/compta|expert.compta|audit/.test(lowerName)) return 'comptabilite';
  if (/medic|santé|clinic|hospit|pharma|dentist|infirmi|creche/.test(lowerName)) return 'sante';
  if (/inform|digital|web|soft|tech|dev|cyber|data/.test(lowerName)) return 'informatique';
  if (/btp|construct|maçon|plomb|electric|charpent/.test(lowerName)) return 'btp';
  if (/hotel|restaura|cafe|bar|traiteur/.test(lowerName)) return 'hotellerie';
  if (/immo|foncier|gestion.locative/.test(lowerName)) return 'immobilier';
  if (/transport|logistiq|livraison|courier/.test(lowerName)) return 'logistique';
  if (/commerce|retail|boutique|magasin|garage|cave|caviste/.test(lowerName)) return 'commerce';
  if (/ecole|formation|educat|enseign/.test(lowerName)) return 'education';
  if (/consult|conseil|strateg/.test(lowerName)) return 'consulting';
  if (/recrut|rh|ressources.humaines/.test(lowerName)) return 'rh';
  if (/auto|garage|meca/.test(lowerName)) return 'automobile';
  if (/indust|fabri|usine/.test(lowerName)) return 'industrie';
  
  return 'autre';
}

export default authMiddleware(handler);