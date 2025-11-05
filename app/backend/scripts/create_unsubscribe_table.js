import db from '../lib/db.js';

async function createUnsubscribeTable() {
  try {
    console.log('🔄 Création de la table email_unsubscribes...');
    
    await db.query(`
      CREATE TABLE IF NOT EXISTS email_unsubscribes (
        id VARCHAR(36) PRIMARY KEY,
        lead_id VARCHAR(36) NOT NULL,
        email VARCHAR(255) NOT NULL,
        reason TEXT,
        unsubscribed_at TIMESTAMP DEFAULT NOW(),
        ip_address VARCHAR(45),
        user_agent TEXT,
        UNIQUE(lead_id)
      )
    `);
    
    console.log('✅ Table email_unsubscribes créée !');

    await db.query(`CREATE INDEX IF NOT EXISTS idx_unsubscribe_lead ON email_unsubscribes(lead_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_unsubscribe_email ON email_unsubscribes(email)`);
    
    console.log('✅ Index créés !');

    console.log('🔄 Ajout colonne unsubscribed dans leads...');
    
    await db.query(`
      ALTER TABLE leads 
      ADD COLUMN IF NOT EXISTS unsubscribed BOOLEAN DEFAULT false
    `);
    
    await db.query(`
      ALTER TABLE leads 
      ADD COLUMN IF NOT EXISTS unsubscribed_at TIMESTAMP
    `);
    
    console.log('✅ Colonnes ajoutées !');
    console.log('🎉 Migration terminée !');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

createUnsubscribeTable();
