import express from 'express';
import db from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';
import leadPoolManager from '../services/leadPoolManager.js';

console.log('🔥🔥🔥 FICHIER lead-databases.js CHARGÉ !');

const router = express.Router();

// 🧪 ROUTE DE TEST
router.get('/test', (req, res) => {
  console.log('✅ Route test appelée !');
  res.json({ success: true, message: 'Test OK' });
});

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
    console.error('Erreur GET /lead-databases:', error);
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
    console.error('Erreur GET /:id:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

export default router;

