import express from 'express';
import db from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';
import leadPoolManager from '../services/leadPoolManager.js';

console.log('🔥 FICHIER lead-databases.js CHARGÉ');

const router = express.Router();

// GET /api/lead-databases - Liste toutes les bases
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { tenant_id } = req.user;

    const query = `
      SELECT 
        ld.*,
        COUNT(DISTINCT ldr.lead_id) as total_leads
      FROM lead_databases ld
      LEFT JOIN lead_database_relations ldr ON ld.id = ldr.database_id
      WHERE ld.tenant_id = $1
      GROUP BY ld.id
      ORDER BY ld.created_at DESC
    `;

    const result = await db.query(query, [tenant_id]);

    res.json({
      success: true,
      databases: result.rows
    });
  } catch (error) {
    console.error('❌ Erreur GET /lead-databases:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur'
    });
  }
});

// GET /api/lead-databases/:id - Détails d'une base
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { tenant_id } = req.user;

    const dbQuery = `SELECT * FROM lead_databases WHERE id = $1 AND tenant_id = $2`;
    const dbResult = await db.query(dbQuery, [id, tenant_id]);

    if (dbResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Base introuvable' });
    }

    const database = dbResult.rows[0];
    const leads = await leadPoolManager.getDatabaseLeads(id, tenant_id);

    res.json({
      success: true,
      database: { ...database, leads }
    });
  } catch (error) {
    console.error('❌ Erreur GET /:id:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// POST /api/lead-databases - Créer une nouvelle base
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { tenant_id, id: user_id } = req.user;
    const { name, description, source, segmentation } = req.body;

    console.log('📊 Création base:', name);

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Nom requis' });
    }

    // ✅ Vérifier que le nom n'existe pas déjà pour ce tenant
    const existingDB = await db.query(
      'SELECT id FROM lead_databases WHERE tenant_id = $1 AND LOWER(TRIM(name)) = LOWER(TRIM($2))',
      [tenant_id, name]
    );

    if (existingDB.rows.length > 0) {
      return res.status(409).json({ 
        success: false, 
        error: 'Une base avec ce nom existe déjà' 
      });
    }

    const query = `
      INSERT INTO lead_databases (tenant_id, name, description, source, segmentation, created_by, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *
    `;

    const result = await db.query(query, [
      tenant_id,
      name.trim(),
      description || null,
      source || 'import_csv',
      JSON.stringify(segmentation || {}),
      user_id
    ]);

    console.log('✅ Base créée:', result.rows[0].id);

    res.json({
      success: true,
      database: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Erreur POST /lead-databases:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// DELETE /api/lead-databases/:id - Supprimer une base
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { tenant_id } = req.user;

    console.log(`🗑️ Suppression base ${id} pour tenant ${tenant_id}`);

    // Vérifier que la base appartient au tenant
    const dbCheck = await db.query(
      'SELECT id FROM lead_databases WHERE id = $1 AND tenant_id = $2',
      [id, tenant_id]
    );

    if (dbCheck.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Base introuvable' 
      });
    }

    // Supprimer les relations
    await db.query('DELETE FROM lead_database_relations WHERE database_id = $1', [id]);
    
    // Supprimer la base
    await db.query('DELETE FROM lead_databases WHERE id = $1 AND tenant_id = $2', [id, tenant_id]);

    console.log(`✅ Base ${id} supprimée`);

    res.json({ success: true, message: 'Base supprimée avec succès' });
  } catch (error) {
    console.error('❌ Erreur DELETE:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/lead-databases/:id/archive - Archiver une base
router.patch('/:id/archive', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { tenant_id } = req.user;

    await db.query(
      'UPDATE lead_databases SET archived = true, updated_at = NOW() WHERE id = $1 AND tenant_id = $2',
      [id, tenant_id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('❌ Erreur ARCHIVE:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;