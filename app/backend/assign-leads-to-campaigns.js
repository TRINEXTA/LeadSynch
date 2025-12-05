import { log, error, warn } from "../lib/logger.js";
﻿import { queryAll, execute } from './lib/db.js';

async function assignLeadsToCampaigns() {
  try {
    log('🔗 Association manuelle des leads aux campagnes...\n');
    
    // Récupérer les campagnes actives
    const campaigns = await queryAll(`
      SELECT id, name FROM campaigns WHERE status = 'active';
    `);
    
    if (campaigns.length === 0) {
      log(' Aucune campagne active trouvée');
      process.exit(0);
    }
    
    log(` ${campaigns.length} campagne(s) active(s) trouvée(s):\n`);
    campaigns.forEach(c => log(`   - [${c.id}] ${c.name}`));
    
    // Compter les leads sans campagne
    const orphans = await queryAll(`
      SELECT COUNT(*) as total FROM leads WHERE campaign_id IS NULL;
    `);
    
    log(`\n Leads sans campagne: ${orphans[0].total}`);
    
    if (orphans[0].total === 0) {
      log(' Tous les leads ont déjà une campagne !');
      process.exit(0);
    }
    
    // Assigner TOUS les leads sans campagne à la PREMIÈRE campagne active
    const firstCampaign = campaigns[0];
    
    log(`\n Assignment de tous les leads à: ${firstCampaign.name}`);
    
    await execute(`
      UPDATE leads 
      SET campaign_id = $1
      WHERE campaign_id IS NULL;
    `, [firstCampaign.id]);
    
    log(' Leads assignés !');
    
    // Vérifier
    const result = await queryAll(`
      SELECT 
        c.name as campaign,
        COUNT(l.id) as total_leads
      FROM campaigns c
      LEFT JOIN leads l ON l.campaign_id = c.id
      WHERE c.status = 'active'
      GROUP BY c.id, c.name;
    `);
    
    log('\n Répartition finale:\n');
    result.forEach(r => {
      log(`   - ${r.campaign}: ${r.total_leads} leads`);
    });
    
    log('\n Terminé !\n');
    process.exit(0);
  } catch (error) {
    error(' Erreur:', error);
    process.exit(1);
  }
}

assignLeadsToCampaigns();
