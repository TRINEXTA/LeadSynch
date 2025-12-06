import { log, error, warn } from "./lib/logger.js";
import { readFileSync } from 'fs';
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const client = new pg.Client({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  try {
    log('🔄 Connexion à PostgreSQL...');
    await client.connect();
    log('✅ Connecté à la base de données');

    log('📂 Lecture du script SQL...');
    const sqlPath = join(__dirname, 'migrations', '00_COMPLETE_SETUP.sql');
    const sql = readFileSync(sqlPath, 'utf8');
    log(`✅ Script chargé (${sql.length} caractères)`);

    log('⚙️  Exécution de la migration...');
    await client.query(sql);

    log('');
    log('========================================');
    log('✅ MIGRATION EXÉCUTÉE AVEC SUCCÈS !');
    log('========================================');
    log('');
    log('📋 Tables créées :');
    log('  - lead_credits');
    log('  - credit_purchases');
    log('  - credit_usage');
    log('  - services');
    log('  - subscriptions');
    log('  - subscription_invoices');
    log('  - subscription_history');
    log('  - invoices');
    log('  - billing_info');
    log('');
    log('🔄 Redémarrez maintenant votre serveur backend :');
    log('   npm start');
    log('');

  } catch (error) {
    error('');
    error('❌ ERREUR LORS DE LA MIGRATION');
    error('========================================');
    error('Message:', error.message);
    if (error.stack) {
      error('Stack:', error.stack);
    }
    error('========================================');
    process.exit(1);
  } finally {
    await client.end();
    log('👋 Connexion fermée');
  }
}

runMigration();
