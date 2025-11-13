import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import db from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigrations() {
  console.log('🔄 Exécution des migrations...\n');

  const migrations = [
    'add_tenant_owner.sql',
    'create_billing_tables.sql'
  ];

  for (const migration of migrations) {
    try {
      console.log(`📄 Exécution : ${migration}`);
      const sql = readFileSync(
        join(__dirname, '../migrations', migration),
        'utf-8'
      );

      // Exécuter le SQL
      await db.query(sql);
      console.log(`✅ ${migration} terminée\n`);
    } catch (error) {
      console.error(`❌ Erreur dans ${migration}:`, error.message);
      console.error(error);
      process.exit(1);
    }
  }

  console.log('✅ Toutes les migrations terminées avec succès !');
  process.exit(0);
}

runMigrations();
