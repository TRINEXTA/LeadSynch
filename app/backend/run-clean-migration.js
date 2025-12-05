import { log, error, warn } from "../lib/logger.js";
import { readFileSync } from 'fs';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

log('========================================');
log('🧹 MIGRATION PROPRE - NETTOYAGE COMPLET');
log('========================================\n');
log('⚠️  ATTENTION: Cette migration va :');
log('   - Supprimer les tables existantes');
log('   - Recréer toutes les tables proprement');
log('   - Initialiser les données par défaut\n');

const client = new pg.Client({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

async function runCleanMigration() {
  try {
    log('🔄 Connexion à PostgreSQL (Neon)...');
    await client.connect();
    log('✅ Connecté !\n');

    log('📂 Lecture de 00_CLEAN_SETUP.sql...');
    const sql = readFileSync('./migrations/00_CLEAN_SETUP.sql', 'utf8');
    log(`✅ Script chargé (${sql.length} caractères)\n`);

    log('🧹 Nettoyage et recréation des tables...');
    await client.query(sql);

    log('\n========================================');
    log('✅ MIGRATION RÉUSSIE !');
    log('========================================\n');
    log('📋 Tables créées (10) :');
    log('   ✓ lead_credits');
    log('   ✓ credit_purchases');
    log('   ✓ credit_usage');
    log('   ✓ services');
    log('   ✓ subscriptions');
    log('   ✓ subscription_invoices');
    log('   ✓ subscription_history');
    log('   ✓ invoices');
    log('   ✓ billing_info');
    log('   ✓ mailing_settings\n');
    log('🔄 Prochaines étapes :');
    log('   1. Redémarrez le backend : npm start');
    log('   2. Testez les pages Statistics, Billing, Users');
    log('   3. Vérifiez qu\'il n\'y a plus d\'erreurs\n');

  } catch (error) {
    error('\n❌ ERREUR :');
    error('========================================');
    error(error.message);
    if (error.detail) error('Détail:', error.detail);
    if (error.hint) error('Indice:', error.hint);
    error('========================================\n');
    process.exit(1);
  } finally {
    await client.end();
  }
}

runCleanMigration();
