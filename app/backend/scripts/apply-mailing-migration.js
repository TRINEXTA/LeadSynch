#!/usr/bin/env node
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { pool } from '../lib/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function applyMigration() {
  const client = await pool.connect();

  try {
    console.log('📦 Connexion à la base de données...');

    // Lire le fichier de migration
    const migrationPath = join(__dirname, '../migrations/013_fix_mailing_settings_columns.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('🔄 Application de la migration...');

    // Exécuter la migration
    await client.query(migrationSQL);

    console.log('✅ Migration appliquée avec succès !');

    // Vérifier la structure de la table
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'mailing_settings'
      ORDER BY ordinal_position
    `);

    console.log('\n📋 Structure de la table mailing_settings :');
    console.table(result.rows);

  } catch (error) {
    console.error('❌ Erreur lors de l\'application de la migration :', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

applyMigration()
  .then(() => {
    console.log('\n✨ Migration terminée !');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Échec de la migration :', error.message);
    process.exit(1);
  });
