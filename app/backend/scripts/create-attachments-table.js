import { execute } from '../lib/db.js';

async function createAttachmentsTable() {
  try {
    console.log('?? Création table attachments...');

    await execute(`
      CREATE TABLE IF NOT EXISTS attachments (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        filename VARCHAR(255) NOT NULL,
        original_filename VARCHAR(255) NOT NULL,
        filepath TEXT NOT NULL,
        size INTEGER NOT NULL,
        mimetype VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('? Table attachments créée');

    // Ajouter colonne attachment_ids aux campagnes
    await execute(`
      ALTER TABLE campaigns 
      ADD COLUMN IF NOT EXISTS attachment_ids INTEGER[]
    `);

    console.log('? Colonne attachment_ids ajoutée');

    // Créer table quota attachments
    await execute(`
      INSERT INTO quotas (tenant_id, quota_type, plan_type, quota_limit, quota_used)
      SELECT id, 'attachments', 'FREE', 3, 0 
      FROM tenants 
      WHERE NOT EXISTS (
        SELECT 1 FROM quotas WHERE tenant_id = tenants.id AND quota_type = 'attachments'
      )
    `);

    console.log('? Quotas attachments initialisés');
    console.log('?? Migration terminée !');

    process.exit(0);
  } catch (error) {
    console.error('? Erreur:', error);
    process.exit(1);
  }
}

createAttachmentsTable();
