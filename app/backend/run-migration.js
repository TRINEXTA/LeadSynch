import pg from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL
});

async function runMigration() {
  try {
    console.log('Execution de la migration...');
    
    const sql = fs.readFileSync('./migrations/add_email_columns.sql', 'utf8')
      .replace(/^\uFEFF/, '') // Supprimer BOM
      .trim();
    
    // Séparer et exécuter chaque requête
    const queries = sql.split(';').filter(q => q.trim());
    
    for (const query of queries) {
      if (query.trim()) {
        console.log('Execution:', query.substring(0, 50) + '...');
        await pool.query(query);
      }
    }
    
    console.log('Migration reussie !');
    await pool.end();
    process.exit(0);
    
  } catch (error) {
    console.error('Erreur migration:', error.message);
    await pool.end();
    process.exit(1);
  }
}

runMigration();
