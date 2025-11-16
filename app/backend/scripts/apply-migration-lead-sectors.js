// Script pour appliquer la migration lead sectors sur Neon
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { pool } from '../lib/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function applyMigration() {
  try {
    console.log('📂 Lecture du fichier de migration...');

    const migrationPath = join(__dirname, '../migrations/add_geographic_sector_to_leads.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('🔄 Application de la migration sur Neon...');

    // Exécuter la migration
    await pool.query(migrationSQL);

    console.log('✅ Migration appliquée avec succès !');
    console.log('');
    console.log('📋 Modifications effectuées:');
    console.log('   ✅ Colonne geographic_sector_id ajoutée à la table leads');
    console.log('   ✅ Index créés pour performances optimales');
    console.log('   ✅ Fonction assign_geographic_sector_to_lead() créée');
    console.log('   ✅ Fonction assign_geographic_sector_by_prefix() créée');
    console.log('   ✅ Trigger auto_assign_geographic_sector créé');
    console.log('');
    console.log('🎯 Comportement:');
    console.log('   - Leads assignés AUTOMATIQUEMENT au secteur via code postal');
    console.log('   - Match exact d\'abord, puis par préfixe (ex: 75xxx → Paris)');
    console.log('   - Trigger s\'exécute à chaque INSERT/UPDATE de code postal');
    console.log('');
    console.log('🔧 Optionnel - Réassigner les leads existants:');
    console.log('   UPDATE leads');
    console.log('   SET geographic_sector_id = assign_geographic_sector_by_prefix(tenant_id, postal_code)');
    console.log('   WHERE postal_code IS NOT NULL AND geographic_sector_id IS NULL;');

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    await pool.end();
    process.exit(1);
  }
}

applyMigration();
