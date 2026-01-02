import { log, error, warn } from "./lib/logger.js";
import { readFileSync } from 'fs';
import pg from 'pg';
import dotenv from 'dotenv';
import { getSSLConfig } from './lib/ssl-config.js';

dotenv.config();

log('========================================');
log('🚀 EXÉCUTION DE LA MIGRATION COMPLÈTE');
log('========================================\n');

const client = new pg.Client({
  connectionString: process.env.POSTGRES_URL,
  ssl: getSSLConfig()
});

async function runSetupMigration() {
  try {
    log('🔄 Connexion à PostgreSQL (Neon)...');
    await client.connect();
    log('✅ Connecté !\n');

    log('📂 Lecture de 00_COMPLETE_SETUP.sql...');
    const sql = readFileSync('./migrations/00_COMPLETE_SETUP.sql', 'utf8');
    log(`✅ Script chargé (${sql.length} caractères)\n`);

    log('⚙️  Création des tables...');
    log('   - lead_credits');
    log('   - credit_purchases');
    log('   - credit_usage');
    log('   - services');
    log('   - subscriptions');
    log('   - subscription_invoices');
    log('   - subscription_history');
    log('   - invoices');
    log('   - billing_info\n');

    await client.query(sql);

    log('========================================');
    log('✅ MIGRATION RÉUSSIE !');
    log('========================================\n');
    log('📋 Prochaines étapes :');
    log('   1. Redémarrez le backend : npm start');
    log('   2. Testez les pages Statistics, Billing, Users');
    log('   3. Vérifiez qu\'il n\'y a plus d\'erreurs "relation does not exist"\n');

  } catch (error) {
    error('\n❌ ERREUR :');
    error('========================================');
    error(error.message);
    error('========================================\n');
    process.exit(1);
  } finally {
    await client.end();
  }
}

runSetupMigration();
