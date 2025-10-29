import { authMiddleware } from '../middleware/auth.js';
import { queryAll, execute } from '../lib/db.js';
import { parse } from 'csv-parse/sync';

async function handler(req, res) {
  const tenant_id = req.user.tenant_id;

  try {
    if (req.method === 'POST') {
      const { database_id, csv_content, sector } = req.body;

      if (!database_id || !csv_content) {
        return res.status(400).json({ 
          error: 'database_id et csv_content requis' 
        });
      }

      // Parser le CSV
      const records = parse(csv_content, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });

      console.log(`📊 ${records.length} lignes CSV à traiter`);

      let added = 0;
      let updated = 0;
      let skipped = 0;

      for (const record of records) {
        // Extraire les données (mapping flexible)
        const company_name = record.company_name || record.nom || record.entreprise || record.name;
        const phone = record.phone || record.telephone || record.tel;
        const email = record.email || record.mail;
        const website = record.website || record.site || record.web;
        const address = record.address || record.adresse;
        const city = record.city || record.ville;

        if (!company_name) {
          skipped++;
          continue;
        }

        // 1. Vérifier si existe dans global_leads
        const existingGlobal = await queryAll(
          `SELECT * FROM global_leads 
           WHERE LOWER(company_name) = LOWER($1)
           AND (city ILIKE $2 OR $2 IS NULL)
           LIMIT 1`,
          [company_name, city]
        );

        let globalLeadId;

        if (existingGlobal.length > 0) {
          // Lead existe déjà dans global_leads
          const existing = existingGlobal[0];
          
          // Comparer et garder les infos les plus récentes
          const shouldUpdate = 
            (!existing.phone && phone) ||
            (!existing.email && email) ||
            (!existing.website && website) ||
            (!existing.address && address);

          if (shouldUpdate) {
            await execute(
              `UPDATE global_leads 
               SET phone = COALESCE($1, phone),
                   email = COALESCE($2, email),
                   website = COALESCE($3, website),
                   address = COALESCE($4, address),
                   last_verified_at = NOW()
               WHERE id = $5`,
              [phone, email, website, address, existing.id]
            );
            updated++;
            console.log(`🔄 Enrichi: ${company_name}`);
          } else {
            console.log(`⏭️  Skip: ${company_name} (déjà complet)`);
          }

          globalLeadId = existing.id;
        } else {
          // Nouveau lead → Ajouter à global_leads
          const newGlobal = await execute(
            `INSERT INTO global_leads 
            (company_name, phone, email, website, address, city, industry, source, first_discovered_by, last_verified_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'import_csv', $8, NOW())
            RETURNING id`,
            [company_name, phone, email, website, address, city, sector, tenant_id]
          );
          
          globalLeadId = newGlobal.id;
          added++;
          console.log(`✅ Ajouté: ${company_name}`);
        }

        // 2. Vérifier si existe déjà dans la base privée
        const existingPrivate = await queryAll(
          `SELECT id FROM leads 
           WHERE database_id = $1 
           AND LOWER(company_name) = LOWER($2)`,
          [database_id, company_name]
        );

        if (existingPrivate.length === 0) {
          // Ajouter à la base privée
          await execute(
            `INSERT INTO leads 
            (database_id, tenant_id, global_lead_id, company_name, phone, email, website, address, city, industry, status, score)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'nouveau', 50)`,
            [database_id, tenant_id, globalLeadId, company_name, phone, email, website, address, city, sector]
          );
        }
      }

      // Mettre à jour le compteur total_leads
      await execute(
        `UPDATE lead_databases 
         SET total_leads = (SELECT COUNT(*) FROM leads WHERE database_id = $1),
             updated_at = NOW()
         WHERE id = $1`,
        [database_id]
      );

      return res.json({
        success: true,
        stats: {
          total: records.length,
          added,
          updated,
          skipped
        }
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Import CSV error:', error);
    return res.status(500).json({ 
      error: 'Erreur import',
      details: error.message 
    });
  }
}

export default authMiddleware(handler);