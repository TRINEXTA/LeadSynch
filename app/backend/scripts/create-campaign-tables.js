import { log, error, warn } from "../lib/logger.js";
import { execute } from '../lib/db.js';

async function createTables() {
  try {
    log('?? Création des tables campagnes...');

    await execute(`
      CREATE TABLE IF NOT EXISTS campaign_assignments (
        id SERIAL PRIMARY KEY,
        campaign_id INTEGER NOT NULL,
        lead_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        tenant_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(campaign_id, lead_id)
      )
    `);

    log('? Table campaign_assignments créée');

    await execute(`
      ALTER TABLE campaigns 
      ADD COLUMN IF NOT EXISTS database_id INTEGER,
      ADD COLUMN IF NOT EXISTS sector VARCHAR(255),
      ADD COLUMN IF NOT EXISTS template_id INTEGER,
      ADD COLUMN IF NOT EXISTS scheduled_date DATE,
      ADD COLUMN IF NOT EXISTS scheduled_time TIME,
      ADD COLUMN IF NOT EXISTS leads_count INTEGER DEFAULT 0
    `);

    log('? Colonnes ajoutées à campaigns');
    log('?? Tables créées avec succès !');

    process.exit(0);
  } catch (error) {
    error('? Erreur:', error);
    process.exit(1);
  }
}

createTables();
