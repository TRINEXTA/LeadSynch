import { authMiddleware } from '../middleware/auth.js';
import { queryAll, execute } from '../lib/db.js';

async function handler(req, res) {
  const tenant_id = req.user.tenant_id;

  try {
    // GET - Liste des bases
    if (req.method === 'GET' && !req.url.includes('/api/lead-databases/')) {
      const databases = await queryAll(
        `SELECT * FROM lead_databases 
         WHERE tenant_id = $1 
         AND (archived = false OR archived IS NULL)
         ORDER BY created_at DESC`,
        [tenant_id]
      );

      return res.json({
        success: true,
        databases
      });
    }

    // POST - Créer une base
    if (req.method === 'POST') {
      const { name, description, source, tags, segmentation, total_leads } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Nom requis' });
      }

      const result = await execute(
        `INSERT INTO lead_databases 
        (tenant_id, name, description, source, tags, segmentation, total_leads)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [
          tenant_id,
          name,
          description || null,
          source || 'import_manuel',
          JSON.stringify(tags || []),
          JSON.stringify(segmentation || {}),
          total_leads || 0
        ]
      );

      return res.json({
        success: true,
        database: result
      });
    }

    // PATCH - Archiver une base
    if (req.method === 'PATCH') {
      const urlParts = req.url.split('/');
      const databaseId = urlParts[urlParts.length - 1];

      const { archived } = req.body;

      const existing = await queryAll(
        'SELECT id FROM lead_databases WHERE id = $1 AND tenant_id = $2',
        [databaseId, tenant_id]
      );

      if (existing.length === 0) {
        return res.status(404).json({ error: 'Base non trouvée' });
      }

      await execute(
        'UPDATE lead_databases SET archived = $1, updated_at = NOW() WHERE id = $2',
        [archived, databaseId]
      );

      return res.json({
        success: true,
        message: archived ? 'Base archivée' : 'Base restaurée'
      });
    }

    // DELETE - Supprimer une base
    if (req.method === 'DELETE') {
      const urlParts = req.url.split('/');
      const databaseId = urlParts[urlParts.length - 1];

      const existing = await queryAll(
        'SELECT id FROM lead_databases WHERE id = $1 AND tenant_id = $2',
        [databaseId, tenant_id]
      );

      if (existing.length === 0) {
        return res.status(404).json({ error: 'Base non trouvée' });
      }

      await execute('DELETE FROM leads WHERE database_id = $1', [databaseId]);
      await execute('DELETE FROM lead_databases WHERE id = $1', [databaseId]);

      return res.json({
        success: true,
        message: 'Base supprimée définitivement'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Lead databases error:', error);
    return res.status(500).json({ 
      error: 'Server error',
      details: error.message 
    });
  }
}

export default authMiddleware(handler);