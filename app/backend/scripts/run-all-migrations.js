import { query as q } from '../lib/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  const migrationsDir = path.join(__dirname, '..', 'migrations');

  console.log('🔧 Exécution des migrations SQL...\n');

  const migrations = [
    'create_billing_tables.sql',
    'add_tenant_owner.sql',
    'add_payment_link_to_contracts.sql',
    'create_mailing_settings.sql'
  ];

  for (const migration of migrations) {
    const filePath = path.join(migrationsDir, migration);

    if (!fs.existsSync(filePath)) {
      console.log(`⏭️  ${migration} - fichier non trouvé, ignoré`);
      continue;
    }

    console.log(`📄 Exécution: ${migration}`);

    try {
      const sql = fs.readFileSync(filePath, 'utf8');
      await q(sql);
      console.log(`✅ ${migration} - OK\n`);
    } catch (error) {
      console.error(`❌ ${migration} - ERREUR:`, error.message);
      // Continue avec les autres migrations
    }
  }

  console.log('🎉 Migrations terminées!\n');
  process.exit(0);
}

runMigrations().catch(error => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});
