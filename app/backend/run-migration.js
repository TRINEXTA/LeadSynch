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
    console.log('🔄 Connexion à PostgreSQL...');
    await client.connect();
    console.log('✅ Connecté à la base de données');

    console.log('📂 Lecture du script SQL...');
    const sqlPath = join(__dirname, 'migrations', '00_COMPLETE_SETUP.sql');
    const sql = readFileSync(sqlPath, 'utf8');
    console.log(`✅ Script chargé (${sql.length} caractères)`);

    console.log('⚙️  Exécution de la migration...');
    await client.query(sql);

    console.log('');
    console.log('========================================');
    console.log('✅ MIGRATION EXÉCUTÉE AVEC SUCCÈS !');
    console.log('========================================');
    console.log('');
    console.log('📋 Tables créées :');
    console.log('  - lead_credits');
    console.log('  - credit_purchases');
    console.log('  - credit_usage');
    console.log('  - services');
    console.log('  - subscriptions');
    console.log('  - subscription_invoices');
    console.log('  - subscription_history');
    console.log('  - invoices');
    console.log('  - billing_info');
    console.log('');
    console.log('🔄 Redémarrez maintenant votre serveur backend :');
    console.log('   npm start');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ ERREUR LORS DE LA MIGRATION');
    console.error('========================================');
    console.error('Message:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    console.error('========================================');
    process.exit(1);
  } finally {
    await client.end();
    console.log('👋 Connexion fermée');
  }
}

runMigration();
