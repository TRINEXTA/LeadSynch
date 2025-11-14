import { readFileSync } from 'fs';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

console.log('========================================');
console.log('🚀 EXÉCUTION DE LA MIGRATION COMPLÈTE');
console.log('========================================\n');

const client = new pg.Client({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

async function runSetupMigration() {
  try {
    console.log('🔄 Connexion à PostgreSQL (Neon)...');
    await client.connect();
    console.log('✅ Connecté !\n');

    console.log('📂 Lecture de 00_COMPLETE_SETUP.sql...');
    const sql = readFileSync('./migrations/00_COMPLETE_SETUP.sql', 'utf8');
    console.log(`✅ Script chargé (${sql.length} caractères)\n`);

    console.log('⚙️  Création des tables...');
    console.log('   - lead_credits');
    console.log('   - credit_purchases');
    console.log('   - credit_usage');
    console.log('   - services');
    console.log('   - subscriptions');
    console.log('   - subscription_invoices');
    console.log('   - subscription_history');
    console.log('   - invoices');
    console.log('   - billing_info\n');

    await client.query(sql);

    console.log('========================================');
    console.log('✅ MIGRATION RÉUSSIE !');
    console.log('========================================\n');
    console.log('📋 Prochaines étapes :');
    console.log('   1. Redémarrez le backend : npm start');
    console.log('   2. Testez les pages Statistics, Billing, Users');
    console.log('   3. Vérifiez qu\'il n\'y a plus d\'erreurs "relation does not exist"\n');

  } catch (error) {
    console.error('\n❌ ERREUR :');
    console.error('========================================');
    console.error(error.message);
    console.error('========================================\n');
    process.exit(1);
  } finally {
    await client.end();
  }
}

runSetupMigration();
