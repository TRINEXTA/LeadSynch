import { log, error, warn } from "../lib/logger.js";
﻿import db from '../lib/db.js';

async function createEmailEventsTable() {
  try {
    log('🔄 Création de la table email_events...');
    
    await db.query(`
      CREATE TABLE IF NOT EXISTS email_events (
        id VARCHAR(36) PRIMARY KEY,
        lead_id VARCHAR(36) NOT NULL,
        campaign_id VARCHAR(36),
        event_type VARCHAR(50) NOT NULL,
        event_data JSONB,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    log('✅ Table email_events créée !');

    log('🔄 Ajout des index...');
    
    await db.query(`CREATE INDEX IF NOT EXISTS idx_email_events_lead_id ON email_events(lead_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_email_events_campaign_id ON email_events(campaign_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_email_events_type ON email_events(event_type)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_email_events_created ON email_events(created_at)`);
    
    log('✅ Index créés !');

    log('🔄 Ajout colonnes dans leads...');
    
    await db.query(`
      ALTER TABLE leads 
      ADD COLUMN IF NOT EXISTS last_activity_date TIMESTAMP
    `);
    
    await db.query(`
      ALTER TABLE leads 
      ADD COLUMN IF NOT EXISTS last_activity_type VARCHAR(50)
    `);
    
    log('✅ Colonnes ajoutées !');
    log('🎉 Migration terminée !');
    
    process.exit(0);
  } catch (error) {
    error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

createEmailEventsTable();
