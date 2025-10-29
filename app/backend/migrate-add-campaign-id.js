import { pool } from './lib/db.js';

async function addCampaignId() {
  try {
    console.log(' Ajout de la colonne campaign_id...\n');
    
    // Ajouter la colonne
    await pool.query(`
      ALTER TABLE leads 
      ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL;
    `);
    
    console.log(' Colonne campaign_id ajoutée !');
    
    // Créer l'index
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_leads_campaign_id ON leads(campaign_id);
    `);
    
    console.log(' Index créé !');
    
    // Vérifier
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'leads' 
      AND column_name = 'campaign_id';
    `);
    
    if (result.rows.length > 0) {
      console.log('\n SUCCÈS ! Colonne campaign_id existe maintenant');
      console.log('Type:', result.rows[0].data_type);
    }
    
    // Maintenant assigner les leads aux campagnes
    console.log('\n Association des leads aux campagnes...');
    
    const updated = await pool.query(`
      UPDATE leads l
      SET campaign_id = c.id
      FROM campaigns c
      WHERE l.database_id = c.database_id
      AND l.campaign_id IS NULL
      AND c.status = 'active';
    `);
    
    console.log(` ${updated.rowCount} leads associés aux campagnes !`);
    
    // Stats finales
    const stats = await pool.query(`
      SELECT 
        campaign_id,
        COUNT(*) as total
      FROM leads
      GROUP BY campaign_id
      ORDER BY campaign_id NULLS FIRST;
    `);
    
    console.log('\n Répartition finale:');
    console.table(stats.rows);
    
    process.exit(0);
  } catch (error) {
    console.error(' Erreur:', error.message);
    process.exit(1);
  }
}

addCampaignId();
