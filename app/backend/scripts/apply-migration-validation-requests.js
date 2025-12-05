import { log, error, warn } from "../lib/logger.js";
// Script pour appliquer la migration validation_requests sur Neon
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { pool } from '../lib/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function applyMigration() {
  try {
    log('📂 Lecture du fichier de migration...');

    const migrationPath = join(__dirname, '../migrations/create_validation_requests.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    log('🔄 Application de la migration sur Neon...');

    // Exécuter la migration
    await pool.query(migrationSQL);

    log('✅ Migration appliquée avec succès !');
    log('✅ Table créée: validation_requests');
    log('✅ Indexes créés pour performances optimales');
    log('✅ Triggers créés pour updated_at et resolved_at');
    log('');
    log('📋 Système de demandes de validation et d\'aide prêt !');
    log('   - Les commerciaux peuvent demander validation ou aide');
    log('   - Les managers reçoivent les demandes dans leur dashboard');
    log('   - Support de la priorité (low, normal, high, urgent)');
    log('   - Workflow complet: pending → approved/rejected/resolved');

    await pool.end();
    process.exit(0);
  } catch (error) {
    error('❌ Erreur lors de la migration:', error);
    await pool.end();
    process.exit(1);
  }
}

applyMigration();
