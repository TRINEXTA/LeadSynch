import express from 'express';
import { authMiddleware as authenticateToken } from '../middleware/auth.js';
import db from '../config/db.js';

const router = express.Router();
const q = (text, params=[]) => db.query(text, params);

// =============================
// GET /follow-ups - Liste des rappels
// =============================
router.get('/', authenticateToken, async (req, res) => {
  try {
    const tenant_id = req.user.tenant_id;
    const user_id = req.user.id;
    const { user_id: filter_user_id, assigned_to_me, status, lead_id } = req.query;

    let query = `
      SELECT f.*,
             l.company_name, l.email AS lead_email, l.phone AS lead_phone, l.industry,
             u.first_name || ' ' || u.last_name AS user_name,
             u.role as user_role,
             c.first_name || ' ' || c.last_name AS created_by_name
      FROM follow_ups f
      LEFT JOIN leads l ON f.lead_id = l.id
      LEFT JOIN users u ON f.user_id = u.id
      LEFT JOIN users c ON f.created_by = c.id
      WHERE f.tenant_id = $1
    `;
    const params = [tenant_id];
    let paramIndex = 2;

    // Filtre: mes tâches assignées
    if (assigned_to_me === 'true') {
      query += ` AND f.user_id = $${paramIndex++}`;
      params.push(user_id);
    }

    // Filtre optionnel par user_id si spécifié dans le dropdown
    if (filter_user_id && filter_user_id !== 'all') {
      query += ` AND f.user_id = $${paramIndex++}`;
      params.push(filter_user_id);
    }

    // Filtre par lead_id
    if (lead_id) {
      query += ` AND f.lead_id = $${paramIndex++}`;
      params.push(lead_id);
    }

    // Filtre par statut (pending = non complété)
    if (status === 'pending') {
      query += ' AND (f.completed = FALSE OR f.completed IS NULL)';
    } else if (status === 'completed') {
      query += ' AND f.completed = TRUE';
    }

    query += ' ORDER BY f.scheduled_date ASC';

    const { rows } = await q(query, params);

    console.log(`📅 Rappels trouvés: ${rows.length} pour tenant ${tenant_id}`);

    return res.status(200).json({ success: true, followups: rows || [] });
  } catch (error) {
    console.error('❌ Erreur GET follow-ups:', error);
    return res.status(500).json({ error: error.message });
  }
});

// =============================
// POST /follow-ups - Créer un rappel
// =============================
router.post('/', authenticateToken, async (req, res) => {
  try {
    const tenant_id = req.user.tenant_id;
    const { lead_id, user_id, type, priority, title, notes, scheduled_date } = req.body;

    // Utiliser user_id du body (attribution) OU req.user.id (auto-assignation)
    const assigned_user_id = user_id || req.user.id;

    // scheduled_date requis, mais lead_id optionnel (tâches générales sans lead)
    if (!scheduled_date) {
      return res.status(400).json({ error: 'scheduled_date requis' });
    }

    const { rows } = await q(
      `INSERT INTO follow_ups
       (tenant_id, lead_id, user_id, type, priority, title, notes, scheduled_date, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
       RETURNING *`,
      [
        tenant_id,
        lead_id,
        assigned_user_id,
        type || 'call',
        priority || 'medium',
        title || null,
        notes || null,
        scheduled_date,
        req.user.id // Qui a créé la tâche
      ]
    );

    console.log('✅ Rappel créé:', rows[0].id);
    return res.status(201).json({ success: true, followup: rows[0] });
  } catch (error) {
    console.error('❌ Erreur POST follow-ups:', error);
    return res.status(500).json({ error: error.message });
  }
});

// =============================
// PUT /follow-ups/:id/complete - Marquer comme terminé
// =============================
router.put('/:id/complete', authenticateToken, async (req, res) => {
  try {
    const tenant_id = req.user.tenant_id;
    const followupId = parseInt(req.params.id);
    const { completed_notes } = req.body;

    const { rows } = await q(
      `UPDATE follow_ups
       SET completed = TRUE,
           completed_at = NOW(),
           completed_notes = $1,
           updated_at = NOW()
       WHERE id = $2 AND tenant_id = $3
       RETURNING *`,
      [completed_notes || null, followupId, tenant_id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Rappel non trouvé' });
    }

    console.log('✅ Rappel complété:', followupId);
    return res.status(200).json({ success: true, followup: rows[0] });
  } catch (error) {
    console.error('❌ Erreur complete:', error);
    return res.status(500).json({ error: error.message });
  }
});

// =============================
// PUT /follow-ups/:id/reschedule - Repousser la date
// =============================
router.put('/:id/reschedule', authenticateToken, async (req, res) => {
  try {
    const tenant_id = req.user.tenant_id;
    const followupId = parseInt(req.params.id);
    const { scheduled_date } = req.body;

    if (!scheduled_date) {
      return res.status(400).json({ error: 'scheduled_date requis' });
    }

    const { rows } = await q(
      `UPDATE follow_ups
       SET scheduled_date = $1,
           updated_at = NOW()
       WHERE id = $2 AND tenant_id = $3
       RETURNING *`,
      [scheduled_date, followupId, tenant_id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Rappel non trouvé' });
    }

    console.log('✅ Rappel reprogrammé:', followupId);
    return res.status(200).json({ success: true, followup: rows[0] });
  } catch (error) {
    console.error('❌ Erreur reschedule:', error);
    return res.status(500).json({ error: error.message });
  }
});

// =============================
// DELETE /follow-ups/:id - Supprimer un rappel
// =============================
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const tenant_id = req.user.tenant_id;
    const followupId = parseInt(req.params.id);

    const { rows } = await q(
      'DELETE FROM follow_ups WHERE id = $1 AND tenant_id = $2 RETURNING id',
      [followupId, tenant_id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Rappel non trouvé' });
    }

    console.log('✅ Rappel supprimé:', followupId);
    return res.status(200).json({ success: true, message: 'Rappel supprimé' });
  } catch (error) {
    console.error('❌ Erreur delete:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;