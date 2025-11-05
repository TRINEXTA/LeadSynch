import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Charger le .env depuis le dossier backend
dotenv.config({ path: join(__dirname, '../.env') });

const { Client } = pg;

async function migrateQuotas() {
  const client = new Client({
    connectionString: process.env.POSTGRES_URL
  });

  try {
    console.log('?? Connexion à Neon...');
    await client.connect();
    console.log('? Connecté !');

    console.log('?? Création table tenant_quotas...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS tenant_quotas (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER UNIQUE NOT NULL,
        plan VARCHAR(50) DEFAULT 'FREE',
        email_quota_limit INTEGER DEFAULT 100,
        email_quota_used INTEGER DEFAULT 0,
        users_quota_limit INTEGER DEFAULT 1,
        leads_quota_limit INTEGER DEFAULT 500,
        reset_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('? Table tenant_quotas créée');

    console.log('?? Ajout colonnes à campaigns...');
    await client.query(`
      ALTER TABLE campaigns 
      ADD COLUMN IF NOT EXISTS emails_sent INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS emails_opened INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS emails_clicked INTEGER DEFAULT 0
    `);
    console.log('? Colonnes ajoutées à campaigns');

    console.log('?? Création quotas par défaut...');
    await client.query(`
      INSERT INTO tenant_quotas (tenant_id, plan, email_quota_limit, users_quota_limit, leads_quota_limit)
      SELECT DISTINCT 1, 'FREE', 100, 1, 500
      WHERE NOT EXISTS (SELECT 1 FROM tenant_quotas WHERE tenant_id = 1)
    `);
    console.log('? Quotas par défaut créés');

    console.log('?? Migration terminée avec succès !');

  } catch (error) {
    console.error('? Erreur migration:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    process.exit(0);
  }
}

migrateQuotas();