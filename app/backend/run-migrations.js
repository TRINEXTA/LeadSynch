import { log, error, warn } from "./lib/logger.js";
// ================================================================
// Script : Exécution des migrations SQL sur Neon
// Usage : node run-migrations.js
// ================================================================

import { readFile } from 'fs/promises';
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getSSLConfig } from './lib/ssl-config.js';

dotenv.config();

const { Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration(migrationFile) {
  log(`\n🔄 Exécution de la migration: ${migrationFile}`);

  const client = new Client({
    connectionString: process.env.POSTGRES_URL,
    ssl: getSSLConfig()
  });

  try {
    await client.connect();
    log('✅ Connecté à Neon');

    // Lire le fichier SQL
    const sqlPath = join(__dirname, 'migrations', migrationFile);
    const sql = await readFile(sqlPath, 'utf-8');

    log('📝 Exécution du SQL...');

    // Exécuter la migration
    await client.query(sql);

    log(`✅ Migration ${migrationFile} exécutée avec succès !`);

  } catch (error) {
    error(`❌ Erreur lors de la migration ${migrationFile}:`, error.message);
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
  log('🚀 Démarrage des migrations Neon');
  log('=====================================\n');

  for (const migration of migrations) {
    try {
      await runMigration(migration);
    } catch (error) {
      error(`\n❌ Migration ${migration} échouée. Arrêt.`);
      process.exit(1);
    }
  }

  log('\n=====================================');
  log('✅ Toutes les migrations sont terminées !');
  log('=====================================\n');
}

// Exécuter
runAllMigrations().catch(error => {
  error('❌ Erreur fatale:', error);
  process.exit(1);
});
