import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { pool } from '../lib/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * POST /api/apply-migration
 * Applique la migration pour corriger mailing_settings
 * ENDPOINT TEMPORAIRE - À SUPPRIMER APRÈS UTILISATION
 */
export default async function handler(req, res) {
  // Seulement en développement et pour les admins
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Not allowed in production' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

    res.json({
      success: true,
      message: 'Migration appliquée avec succès',
      columns: result.rows
    });

  } catch (error) {
    console.error('❌ Erreur lors de l\'application de la migration :', error);
    res.status(500).json({
      error: 'Erreur lors de l\'application de la migration',
      message: error.message
    });
  } finally {
    client.release();
  }
}
