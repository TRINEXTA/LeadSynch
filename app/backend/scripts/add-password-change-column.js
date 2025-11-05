import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL
});

async function addColumn() {
  try {
    console.log('🔧 Ajout de la colonne requires_password_change...');
    
    const query = `
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS requires_password_change BOOLEAN DEFAULT false
    `;
    
    await pool.query(query);
    
    console.log('✅ Colonne ajoutée avec succès !');
    
    // Vérifier
    const checkQuery = `
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'requires_password_change'
    `;
    
    const result = await pool.query(checkQuery);
    
    if (result.rows.length > 0) {
      console.log('📋 Colonne trouvée:', result.rows[0]);
    } else {
      console.log('⚠️  Colonne non trouvée');
    }
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    await pool.end();
    process.exit(1);
  }
}

addColumn();
