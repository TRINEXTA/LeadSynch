import { log, error, warn } from "../lib/logger.js";
// Script pour appliquer la migration lead sectors sur Neon
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { pool } from '../lib/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function applyMigration() {
  try {
    log('📂 Lecture du fichier de migration...');

    const migrationPath = join(__dirname, '../migrations/add_geographic_sector_to_leads.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    log('🔄 Application de la migration sur Neon...');

    // Exécuter la migration
    await pool.query(migrationSQL);

    log('✅ Migration appliquée avec succès !');
    log('');
    log('📋 Modifications effectuées:');
    log('   ✅ Colonne geographic_sector_id ajoutée à la table leads');
    log('   ✅ Index créés pour performances optimales');
    log('   ✅ Fonction assign_geographic_sector_to_lead() créée');
    log('   ✅ Fonction assign_geographic_sector_by_prefix() créée');
    log('   ✅ Trigger auto_assign_geographic_sector créé');
    log('');
    log('🎯 Comportement:');
    log('   - Leads assignés AUTOMATIQUEMENT au secteur via code postal');
    log('   - Match exact d\'abord, puis par préfixe (ex: 75xxx → Paris)');
    log('   - Trigger s\'exécute à chaque INSERT/UPDATE de code postal');
    log('');
    log('🔧 Optionnel - Réassigner les leads existants:');
    log('   UPDATE leads');
    log('   SET geographic_sector_id = assign_geographic_sector_by_prefix(tenant_id, postal_code)');
    log('   WHERE postal_code IS NOT NULL AND geographic_sector_id IS NULL;');

    await pool.end();
    process.exit(0);
  } catch (error) {
    error('❌ Erreur lors de la migration:', error);
    await pool.end();
    process.exit(1);
  }
}

applyMigration();
