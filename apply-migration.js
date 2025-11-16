/**
 * Script de migration automatique pour Neon
 * Exécuter avec: node apply-migration.js
 */

import { sql } from '@vercel/postgres';
import dotenv from 'dotenv';

dotenv.config({ path: './app/backend/.env' });

async function applyMigration() {
  console.log('🔄 Connexion à Neon PostgreSQL...');

  try {
    // Ajouter colonnes company_name et company_address
    console.log('📝 Ajout des colonnes company_name et company_address...');

    await sql`
      ALTER TABLE mailing_settings
      ADD COLUMN IF NOT EXISTS company_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS company_address VARCHAR(500)
    `;

    console.log('✅ Migration appliquée avec succès !');
    console.log('');
    console.log('Colonnes ajoutées:');
    console.log('  - company_name (VARCHAR 255)');
    console.log('  - company_address (VARCHAR 500)');
    console.log('');
    console.log('🚀 Vous pouvez maintenant démarrer le backend avec: npm run dev');

  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('ℹ️ Les colonnes existent déjà - Migration déjà appliquée');
      console.log('✅ Aucune action nécessaire');
    } else {
      console.error('❌ Erreur lors de la migration:', error.message);
      process.exit(1);
    }
  }

  process.exit(0);
}

applyMigration();
