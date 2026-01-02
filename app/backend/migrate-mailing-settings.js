import { log, error, warn } from "./lib/logger.js";
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import pg from 'pg';
import { getSSLConfig } from './lib/ssl-config.js';

// Charger les variables d'environnement
dotenv.config();

const { Pool } = pg;

// Configuration de la connexion
const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!connectionString) {
  error('❌ ERREUR: Variable POSTGRES_URL ou DATABASE_URL non définie');
  error('📝 Veuillez créer un fichier .env avec votre connexion PostgreSQL');
  error('   Exemple: POSTGRES_URL=postgresql://user:password@host:port/database');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: getSSLConfig()
});

async function applyMigration() {
  const client = await pool.connect();

  try {
    log('📦 Connexion à la base de données...');
    log(`🔗 Host: ${client.host}`);

    // Lire le fichier de migration
    const migrationSQL = readFileSync('./migrations/013_fix_mailing_settings_columns.sql', 'utf-8');

    log('\n🔄 Application de la migration pour mailing_settings...\n');

    // Exécuter la migration
    await client.query(migrationSQL);

    log('✅ Migration appliquée avec succès !\n');

    // Vérifier la structure de la table
    const result = await client.query(`
      SELECT column_name, data_type, character_maximum_length, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'mailing_settings'
      ORDER BY ordinal_position
    `);

    log('📋 Structure de la table mailing_settings :');
    log('━'.repeat(80));
    result.rows.forEach(col => {
      const maxLength = col.character_maximum_length ? ` (${col.character_maximum_length})` : '';
      const nullable = col.is_nullable === 'YES' ? ' NULL' : ' NOT NULL';
      log(`  ${col.column_name.padEnd(25)} ${col.data_type}${maxLength}${nullable}`);
    });
    log('━'.repeat(80));

  } catch (error) {
    error('\n❌ Erreur lors de l\'application de la migration :');
    error(error.message);
    if (error.code) {
      error(`Code: ${error.code}`);
    }
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

log('🚀 Script de migration mailing_settings');
log('━'.repeat(80));

applyMigration()
  .then(() => {
    log('\n✨ Migration terminée avec succès !');
    process.exit(0);
  })
  .catch((error) => {
    error('\n💥 Échec de la migration');
    process.exit(1);
  });
