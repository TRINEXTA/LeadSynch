// Script pour appliquer la migration des secteurs géographiques sur Neon
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { pool } from '../lib/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function applyMigration() {
  try {
    console.log('📂 Lecture du fichier de migration...');

    const migrationPath = join(__dirname, '../migrations/create_geographic_sectors.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('🔄 Application de la migration sur Neon...');

    // Exécuter la migration
    await pool.query(migrationSQL);

    console.log('✅ Migration appliquée avec succès !');
    console.log('✅ Tables créées:');
    console.log('   - geographic_sectors');
    console.log('   - sector_assignments');
    console.log('   - management_hierarchy');
    console.log('✅ Secteurs démo créés: Paris Nord/Sud/Est/Ouest, HDS Nord/Sud');

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    await pool.end();
    process.exit(1);
  }
}

applyMigration();
