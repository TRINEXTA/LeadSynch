import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: './app/backend/.env' });

const { Pool } = pg;

async function fixConstraints() {
  console.log('🔧 Correction des contraintes validation_requests...');

  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await pool.query('SELECT NOW()');
    console.log('✅ Connecté à Neon');

    const sqlFilePath = path.join(__dirname, 'fix-constraints.sql');
    const sql = fs.readFileSync(sqlFilePath, 'utf8');

    await pool.query(sql);

    console.log('\n✅ Contraintes supprimées avec succès !');
    console.log('✅ Les boutons Validation/Aide fonctionnent maintenant');
  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
  process.exit(0);
}

fixConstraints();
