/**
 * Script de migration automatique pour Neon PostgreSQL
 * Exécuter avec: node apply-migration.js
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: './app/backend/.env' });

const { Pool } = pg;

async function applyMigration() {
  console.log('🔄 Connexion à Neon PostgreSQL...');

  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    // Test connexion
    await pool.query('SELECT NOW()');
    console.log('✅ Connecté à Neon');

    // Ajouter colonnes company_name et company_address
    console.log('📝 Ajout des colonnes company_name et company_address...');

    await pool.query(`
      ALTER TABLE mailing_settings
      ADD COLUMN IF NOT EXISTS company_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS company_address VARCHAR(500)
    `);

    console.log('✅ Migration appliquée avec succès !');
    console.log('');
    console.log('Colonnes ajoutées:');
    console.log('  - company_name (VARCHAR 255)');
    console.log('  - company_address (VARCHAR 500)');
    console.log('');
    console.log('🚀 Vous pouvez maintenant démarrer le backend avec: npm run dev');

  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('ℹ️  Les colonnes existent déjà - Migration déjà appliquée');
      console.log('✅ Aucune action nécessaire');
    } else {
      console.error('❌ Erreur lors de la migration:', error.message);
      process.exit(1);
    }
  } finally {
    await pool.end();
  }

  process.exit(0);
}

applyMigration();
