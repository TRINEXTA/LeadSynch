import db from '../lib/db.js';

async function createImagesTable() {
  try {
    console.log('🔄 Création de la table email_images...');
    
    await db.query(`
      CREATE TABLE IF NOT EXISTS email_images (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        filename VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_url VARCHAR(500) NOT NULL,
        mime_type VARCHAR(100),
        file_size INTEGER,
        width INTEGER,
        height INTEGER,
        uploaded_by UUID,
        uploaded_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    
    console.log('✅ Table email_images créée !');

    await db.query(`CREATE INDEX IF NOT EXISTS idx_images_user ON email_images(uploaded_by)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_images_date ON email_images(uploaded_at DESC)`);
    
    console.log('✅ Index créés !');
    console.log('🎉 Migration terminée !');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

createImagesTable();
