// ================================================================
// Script : Exécution des migrations SQL sur Neon
// Usage : node run-migrations.js
// ================================================================

import { readFile } from 'fs/promises';
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const { Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration(migrationFile) {
  console.log(`\n🔄 Exécution de la migration: ${migrationFile}`);

  const client = new Client({
    connectionString: process.env.POSTGRES_URL,
    ssl: {
      rejectUnauthorized: false // Neon nécessite SSL
    }
  });

  try {
    await client.connect();
    console.log('✅ Connecté à Neon');

    // Lire le fichier SQL
    const sqlPath = join(__dirname, 'migrations', migrationFile);
    const sql = await readFile(sqlPath, 'utf-8');

    console.log('📝 Exécution du SQL...');

    // Exécuter la migration
    await client.query(sql);

    console.log(`✅ Migration ${migrationFile} exécutée avec succès !`);

  } catch (error) {
    console.error(`❌ Erreur lors de la migration ${migrationFile}:`, error.message);
    throw error;
  } finally {
    await client.end();
  }
}

// Liste des migrations à exécuter
const migrations = [
  // Migration 1 : Configuration business clients
  'create_tenant_business_config.sql',

  // Migration 2 : Système super-admin
  'create_super_admin_system.sql'
];

async function runAllMigrations() {
  console.log('🚀 Démarrage des migrations Neon');
  console.log('=====================================\n');

  for (const migration of migrations) {
    try {
      await runMigration(migration);
    } catch (error) {
      console.error(`\n❌ Migration ${migration} échouée. Arrêt.`);
      process.exit(1);
    }
  }

  console.log('\n=====================================');
  console.log('✅ Toutes les migrations sont terminées !');
  console.log('=====================================\n');
}

// Exécuter
runAllMigrations().catch(error => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});
