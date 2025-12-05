import { log, error, warn } from "../lib/logger.js";
// Script pour appliquer la migration des secteurs géographiques sur Neon
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { pool } from '../lib/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function applyMigration() {
  try {
    log('📂 Lecture du fichier de migration...');

    const migrationPath = join(__dirname, '../migrations/create_geographic_sectors.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    log('🔄 Application de la migration sur Neon...');

    // Exécuter la migration
    await pool.query(migrationSQL);

    log('✅ Migration appliquée avec succès !');
    log('✅ Tables créées:');
    log('   - geographic_sectors');
    log('   - sector_assignments');
    log('   - management_hierarchy');
    log('✅ Secteurs démo créés: Paris Nord/Sud/Est/Ouest, HDS Nord/Sud');

    await pool.end();
    process.exit(0);
  } catch (error) {
    error('❌ Erreur lors de la migration:', error);
    await pool.end();
    process.exit(1);
  }
}

applyMigration();
