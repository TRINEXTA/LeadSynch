const mysql = require('mysql2/promise');

async function createEmailEventsTable() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Diabolo2001@',
    database: 'leadsynch'
  });

  try {
    console.log('🔄 Création de la table email_events...');
    
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS email_events (
        id VARCHAR(36) PRIMARY KEY,
        lead_id VARCHAR(36) NOT NULL,
        campaign_id VARCHAR(36),
        event_type VARCHAR(50) NOT NULL,
        event_data JSON,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL,
        INDEX idx_lead_id (lead_id),
        INDEX idx_campaign_id (campaign_id),
        INDEX idx_event_type (event_type),
        INDEX idx_created_at (created_at)
      )
    `);
    
    console.log('✅ Table email_events créée !');

    console.log('🔄 Ajout colonnes dans leads...');
    
    await connection.execute(`
      ALTER TABLE leads 
      ADD COLUMN IF NOT EXISTS last_activity_date TIMESTAMP NULL
    `);
    
    await connection.execute(`
      ALTER TABLE leads 
      ADD COLUMN IF NOT EXISTS last_activity_type VARCHAR(50) NULL
    `);
    
    console.log('✅ Colonnes ajoutées dans leads !');
    console.log('🎉 Migration terminée avec succès !');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await connection.end();
  }
}

createEmailEventsTable();
