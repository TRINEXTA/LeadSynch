import express from 'express';
import { authMiddleware as authenticateToken } from '../middleware/auth.js';
import db from '../config/db.js';

const router = express.Router();
const q = (text, params=[]) => db.query(text, params);

console.log('🔥 FICHIER lead-databases.js CHARGÉ');

// GET /lead-databases - Liste toutes les bases
router.get('/', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;

    // Utiliser leads.database_id pour un comptage fiable
    // Vérifier le tenant via la base (pas via leads.tenant_id qui peut être null pour d'anciens imports)
    const { rows } = await q(
      `SELECT
        ld.*,
        (SELECT COUNT(*) FROM leads l WHERE l.database_id = ld.id) as lead_count
       FROM lead_databases ld
       WHERE ld.tenant_id = $1
       ORDER BY ld.created_at DESC`,
      [tenantId]
    );

    return res.json({ success: true, databases: rows });
  } catch (error) {
    console.error('❌ Erreur GET lead-databases:', error);
    return res.status(500).json({ error: error.message });
  }
});

// GET /lead-databases/:id - Détails d'une base AVEC ses leads
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    const { id } = req.params;

    // 1. Récupérer les infos de la base avec comptage via database_id
    // Vérifier le tenant via la base (pas via leads.tenant_id)
    const { rows: dbRows } = await q(
      `SELECT
        ld.*,
        (SELECT COUNT(*) FROM leads l WHERE l.database_id = ld.id) as lead_count
       FROM lead_databases ld
       WHERE ld.id = $1 AND ld.tenant_id = $2`,
      [id, tenantId]
    );

    if (!dbRows.length) {
      return res.status(404).json({ error: 'Base non trouvée' });
    }

    // 2. Récupérer les leads de cette base via database_id
    // Le tenant est vérifié via la base, pas directement sur les leads
    const { rows: leadRows } = await q(
      `SELECT *
       FROM leads
       WHERE database_id = $1
       ORDER BY created_at DESC`,
      [id]
    );

    console.log(`✅ Base ${id}: ${leadRows.length} leads trouvés`);

    // 3. Retourner la base avec ses leads
    const database = {
      ...dbRows[0],
      leads: leadRows
    };

    return res.json({ success: true, database });
  } catch (error) {
    console.error('❌ Erreur GET lead-database:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 🆕 GET /lead-databases/:id/sectors - Liste des secteurs avec comptage
router.get('/:id/sectors', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    const { id } = req.params;

    console.log(`📊 Récupération secteurs pour base ${id}`);

    // Récupérer la base avec son champ segmentation
    const { rows: dbRows } = await q(
      'SELECT id, segmentation FROM lead_databases WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    if (!dbRows.length) {
      return res.status(404).json({ error: 'Base non trouvée' });
    }

    const database = dbRows[0];

    // Si segmentation existe (JSON stocké lors de l'import), l'utiliser
    if (database.segmentation && Object.keys(database.segmentation).length > 0) {
      const sectors = Object.entries(database.segmentation).map(([sector, count]) => ({
        sector,
        lead_count: count
      })).sort((a, b) => b.lead_count - a.lead_count);

      console.log(`✅ ${sectors.length} secteurs trouvés via segmentation`);

      return res.json({
        success: true,
        sectors,
        total: sectors.reduce((sum, s) => sum + parseInt(s.lead_count), 0)
      });
    }

    // Sinon, essayer de compter depuis la table leads
    const { rows } = await q(
      `SELECT
        sector,
        COUNT(*) as lead_count
       FROM leads
       WHERE database_id = $1
         AND sector IS NOT NULL
         AND sector != ''
       GROUP BY sector
       ORDER BY lead_count DESC`,
      [id]
    );

    console.log(`✅ ${rows.length} secteurs trouvés via leads table`);

    return res.json({
      success: true,
      sectors: rows,
      total: rows.reduce((sum, s) => sum + parseInt(s.lead_count), 0)
    });
  } catch (error) {
    console.error('❌ Erreur GET sectors:', error);
    return res.status(500).json({ error: error.message });
  }
});

// POST /lead-databases - Créer une nouvelle base
router.post('/', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    const userId = req.user?.id;
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Nom requis' });
    }

    const { rows } = await q(
      `INSERT INTO lead_databases (tenant_id, name, description, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING *`,
      [tenantId, name, description || null, userId]
    );

    console.log('✅ Base créée:', rows[0].id);
    return res.status(201).json({ success: true, database: rows[0] });
  } catch (error) {
    console.error('❌ Erreur POST lead-database:', error);
    return res.status(500).json({ error: error.message });
  }
});

// PUT /lead-databases/:id - Modifier une base
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    const { id } = req.params;
    const { name, description } = req.body;

    const { rows } = await q(
      `UPDATE lead_databases 
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           updated_at = NOW()
       WHERE id = $3 AND tenant_id = $4
       RETURNING *`,
      [name, description, id, tenantId]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Base non trouvée' });
    }

    console.log('✅ Base mise à jour:', id);
    return res.json({ success: true, database: rows[0] });
  } catch (error) {
    console.error('❌ Erreur PUT lead-database:', error);
    return res.status(500).json({ error: error.message });
  }
});

// DELETE /lead-databases/:id - Supprimer une base
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    const { id } = req.params;

    // Supprimer d'abord les relations
    await q('DELETE FROM lead_database_relations WHERE database_id = $1', [id]);

    // Puis la base
    const { rows } = await q(
      'DELETE FROM lead_databases WHERE id = $1 AND tenant_id = $2 RETURNING id',
      [id, tenantId]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Base non trouvée' });
    }

    console.log('✅ Base supprimée:', id);
    return res.json({ success: true, message: 'Base supprimée' });
  } catch (error) {
    console.error('❌ Erreur DELETE lead-database:', error);
    return res.status(500).json({ error: error.message });
  }
});

// POST /lead-databases/:id/add-lead - Ajouter un lead à une base (migration)
router.post('/:id/add-lead', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    const { id: databaseId } = req.params;
    const { lead_id } = req.body;

    if (!lead_id) {
      return res.status(400).json({ error: 'lead_id requis' });
    }

    // Vérifier que la base existe et appartient au tenant
    const { rows: dbRows } = await q(
      'SELECT id FROM lead_databases WHERE id = $1 AND tenant_id = $2',
      [databaseId, tenantId]
    );

    if (!dbRows.length) {
      return res.status(404).json({ error: 'Base non trouvée' });
    }

    // Vérifier que le lead existe et appartient au tenant
    const { rows: leadRows } = await q(
      'SELECT id FROM leads WHERE id = $1 AND tenant_id = $2',
      [lead_id, tenantId]
    );

    if (!leadRows.length) {
      return res.status(404).json({ error: 'Lead non trouvé' });
    }

    // Ajouter la relation (ou ignorer si elle existe déjà)
    await q(
      `INSERT INTO lead_database_relations (lead_id, database_id, added_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (lead_id, database_id) DO NOTHING`,
      [lead_id, databaseId]
    );

    // Mettre à jour le compteur
    await q(
      `UPDATE lead_databases
       SET total_leads = (
         SELECT COUNT(DISTINCT lead_id)
         FROM lead_database_relations
         WHERE database_id = $1
       ),
       updated_at = NOW()
       WHERE id = $1`,
      [databaseId]
    );

    console.log(`✅ Lead ${lead_id} ajouté à la base ${databaseId}`);
    return res.json({ success: true, message: 'Lead ajouté à la base' });
  } catch (error) {
    console.error('❌ Erreur POST add-lead:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;