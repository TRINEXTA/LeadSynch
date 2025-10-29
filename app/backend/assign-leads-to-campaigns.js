import { queryAll, execute } from './lib/db.js';

async function assignLeadsToCampaigns() {
  try {
    console.log('🔗 Association manuelle des leads aux campagnes...\n');
    
    // Récupérer les campagnes actives
    const campaigns = await queryAll(`
      SELECT id, name FROM campaigns WHERE status = 'active';
    `);
    
    if (campaigns.length === 0) {
      console.log(' Aucune campagne active trouvée');
      process.exit(0);
    }
    
    console.log(` ${campaigns.length} campagne(s) active(s) trouvée(s):\n`);
    campaigns.forEach(c => console.log(`   - [${c.id}] ${c.name}`));
    
    // Compter les leads sans campagne
    const orphans = await queryAll(`
      SELECT COUNT(*) as total FROM leads WHERE campaign_id IS NULL;
    `);
    
    console.log(`\n Leads sans campagne: ${orphans[0].total}`);
    
    if (orphans[0].total === 0) {
      console.log(' Tous les leads ont déjà une campagne !');
      process.exit(0);
    }
    
    // Assigner TOUS les leads sans campagne à la PREMIÈRE campagne active
    const firstCampaign = campaigns[0];
    
    console.log(`\n Assignment de tous les leads à: ${firstCampaign.name}`);
    
    await execute(`
      UPDATE leads 
      SET campaign_id = $1
      WHERE campaign_id IS NULL;
    `, [firstCampaign.id]);
    
    console.log(' Leads assignés !');
    
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
    
    console.log('\n Répartition finale:\n');
    result.forEach(r => {
      console.log(`   - ${r.campaign}: ${r.total_leads} leads`);
    });
    
    console.log('\n Terminé !\n');
    process.exit(0);
  } catch (error) {
    console.error(' Erreur:', error);
    process.exit(1);
  }
}

assignLeadsToCampaigns();
