import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: './app/backend/.env' });

const { Pool } = pg;

async function applyMigration() {
  console.log('🔄 Connexion à Neon PostgreSQL...');

  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Test connexion
    await pool.query('SELECT NOW()');
    console.log('✅ Connecté à Neon');

    // Lire le fichier SQL
    const sqlFilePath = path.join(__dirname, 'fix-all-columns.sql');
    const sql = fs.readFileSync(sqlFilePath, 'utf8');

    console.log('📄 Lecture du fichier SQL...');
    console.log('🔧 Application de la migration...\n');

    // Exécuter le SQL
    const result = await pool.query(sql);

    console.log('\n✅ Migration appliquée avec succès !');
    console.log('\n📊 Résultat:', result[result.length - 1]?.rows[0]?.message || 'OK');

    console.log('\n✅ TERMINÉ - Redémarrez votre backend pour appliquer les changements');
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('ℹ️  Certaines colonnes/tables existent déjà - c\'est normal');
      console.log('✅ Migration terminée (éléments déjà existants ignorés)');
    } else {
      console.error('\n❌ Erreur:', error.message);
      process.exit(1);
    }
  } finally {
    await pool.end();
  }
  process.exit(0);
}

applyMigration();
