import { readFileSync } from 'fs';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

console.log('========================================');
console.log('🧹 MIGRATION PROPRE - NETTOYAGE COMPLET');
console.log('========================================\n');
console.log('⚠️  ATTENTION: Cette migration va :');
console.log('   - Supprimer les tables existantes');
console.log('   - Recréer toutes les tables proprement');
console.log('   - Initialiser les données par défaut\n');

const client = new pg.Client({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

async function runCleanMigration() {
  try {
    console.log('🔄 Connexion à PostgreSQL (Neon)...');
    await client.connect();
    console.log('✅ Connecté !\n');

    console.log('📂 Lecture de 00_CLEAN_SETUP.sql...');
    const sql = readFileSync('./migrations/00_CLEAN_SETUP.sql', 'utf8');
    console.log(`✅ Script chargé (${sql.length} caractères)\n`);

    console.log('🧹 Nettoyage et recréation des tables...');
    await client.query(sql);

    console.log('\n========================================');
    console.log('✅ MIGRATION RÉUSSIE !');
    console.log('========================================\n');
    console.log('📋 Tables créées :');
    console.log('   ✓ lead_credits');
    console.log('   ✓ credit_purchases');
    console.log('   ✓ credit_usage');
    console.log('   ✓ services');
    console.log('   ✓ subscriptions');
    console.log('   ✓ subscription_invoices');
    console.log('   ✓ subscription_history');
    console.log('   ✓ invoices');
    console.log('   ✓ billing_info\n');
    console.log('🔄 Prochaines étapes :');
    console.log('   1. Redémarrez le backend : npm start');
    console.log('   2. Testez les pages Statistics, Billing, Users');
    console.log('   3. Vérifiez qu\'il n\'y a plus d\'erreurs\n');

  } catch (error) {
    console.error('\n❌ ERREUR :');
    console.error('========================================');
    console.error(error.message);
    if (error.detail) console.error('Détail:', error.detail);
    if (error.hint) console.error('Indice:', error.hint);
    console.error('========================================\n');
    process.exit(1);
  } finally {
    await client.end();
  }
}

runCleanMigration();
