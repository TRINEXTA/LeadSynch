import { log, error as logError, warn } from "../lib/logger.js";
import express from 'express';
import { authMiddleware as authenticateToken } from '../middleware/auth.js';
import db from '../config/db.js';

const router = express.Router();
const q = (text, params=[]) => db.query(text, params);

// =============================
// GET /follow-ups - Liste des rappels (avec filtrage par rôle)
// =============================
// - Commercial/User: Voit SEULEMENT ses propres rappels
// - Manager/Supervisor: Voit ses rappels + ceux des commerciaux/users
// - Admin: Voit TOUS les rappels
// =============================
router.get('/', authenticateToken, async (req, res) => {
  try {
    const tenant_id = req.user.tenant_id;
    const user_id = req.user.id;
    const user_role = req.user.role;
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

    // =============================
    // FILTRAGE PAR RÔLE (SÉCURITÉ)
    // =============================
    if (user_role === 'admin') {
      // Admin: Voit TOUS les rappels du tenant
      // Pas de filtre supplémentaire sur user_id
      log(`🔐 Admin ${user_id} - Accès à tous les rappels`);
    } else if (user_role === 'manager' || user_role === 'supervisor') {
      // Manager/Supervisor: Voit ses rappels + ceux des commerciaux/users
      query += ` AND (
        f.user_id = $${paramIndex}
        OR f.user_id IN (
          SELECT id FROM users
          WHERE tenant_id = $1
          AND role IN ('commercial', 'user')
        )
      )`;
      params.push(user_id);
      paramIndex++;
      log(`🔐 Manager/Supervisor ${user_id} - Accès aux rappels équipe`);
    } else {
      // Commercial/User: Voit SEULEMENT ses propres rappels
      query += ` AND f.user_id = $${paramIndex}`;
      params.push(user_id);
      paramIndex++;
      log(`🔐 Commercial ${user_id} - Accès limité à ses rappels`);
    }

    // Filtre: mes tâches assignées (optionnel, pour tous les rôles)
    if (assigned_to_me === 'true') {
      query += ` AND f.user_id = $${paramIndex++}`;
      params.push(user_id);
    }

    // Filtre optionnel par user_id (seulement si admin/manager a le droit)
    if (filter_user_id && filter_user_id !== 'all') {
      // Vérifier que l'utilisateur a le droit de voir les rappels de cet utilisateur
      if (user_role === 'admin') {
        // Admin peut filtrer sur n'importe quel utilisateur
        query += ` AND f.user_id = $${paramIndex++}`;
        params.push(filter_user_id);
      } else if (user_role === 'manager' || user_role === 'supervisor') {
        // Manager peut filtrer sur les commerciaux/users seulement
        const { rows: targetUser } = await q(
          'SELECT role FROM users WHERE id = $1 AND tenant_id = $2',
          [filter_user_id, tenant_id]
        );
        if (targetUser.length > 0 && ['commercial', 'user'].includes(targetUser[0].role)) {
          query += ` AND f.user_id = $${paramIndex++}`;
          params.push(filter_user_id);
        } else if (filter_user_id === user_id) {
          // Manager peut aussi voir ses propres rappels
          query += ` AND f.user_id = $${paramIndex++}`;
          params.push(filter_user_id);
        }
        // Sinon ignore le filtre (sécurité)
      }
      // Commercial: ignore le filtre user_id (il ne peut voir que les siens)
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

    log(`📅 Rappels trouvés: ${rows.length} pour user ${user_id} (role: ${user_role})`);

    return res.status(200).json({ success: true, followups: rows || [] });
  } catch (err) {
    logError('❌ Erreur GET follow-ups:', err);
    return res.status(500).json({ error: err.message });
  }
});

// =============================
// GET /follow-ups/team-members - Liste des membres accessibles pour le filtre
// =============================
router.get('/team-members', authenticateToken, async (req, res) => {
  try {
    const tenant_id = req.user.tenant_id;
    const user_id = req.user.id;
    const user_role = req.user.role;

    let query;
    let params = [tenant_id];

    if (user_role === 'admin') {
      // Admin voit tous les utilisateurs
      query = `
        SELECT id, first_name, last_name, email, role
        FROM users
        WHERE tenant_id = $1
        ORDER BY role, first_name
      `;
    } else if (user_role === 'manager' || user_role === 'supervisor') {
      // Manager voit lui-même + commerciaux/users
      query = `
        SELECT id, first_name, last_name, email, role
        FROM users
        WHERE tenant_id = $1
        AND (id = $2 OR role IN ('commercial', 'user'))
        ORDER BY role, first_name
      `;
      params.push(user_id);
    } else {
      // Commercial ne voit que lui-même
      query = `
        SELECT id, first_name, last_name, email, role
        FROM users
        WHERE tenant_id = $1 AND id = $2
      `;
      params.push(user_id);
    }

    const { rows } = await q(query, params);

    return res.status(200).json({
      success: true,
      members: rows,
      canViewAll: user_role === 'admin',
      canViewTeam: ['admin', 'manager', 'supervisor'].includes(user_role)
    });
  } catch (err) {
    logError('❌ Erreur GET team-members:', err);
    return res.status(500).json({ error: err.message });
  }
});

// =============================
// POST /follow-ups - Créer un rappel
// =============================
router.post('/', authenticateToken, async (req, res) => {
  try {
    const tenant_id = req.user.tenant_id;
    const user_role = req.user.role;
    const {
      lead_id,
      user_id,
      type,
      priority,
      title,
      notes,
      scheduled_date,
      // Nouveaux champs pour informations de contact
      contact_name,
      contact_phone,
      contact_method
    } = req.body;

    // Déterminer l'utilisateur assigné
    let assigned_user_id = req.user.id; // Par défaut, auto-assignation

    // Seulement admin/manager/supervisor peuvent assigner à quelqu'un d'autre
    if (user_id && user_id !== req.user.id) {
      if (['admin', 'manager', 'supervisor'].includes(user_role)) {
        // Vérifier que l'utilisateur cible existe et est dans le même tenant
        const { rows: targetUser } = await q(
          'SELECT id, role FROM users WHERE id = $1 AND tenant_id = $2',
          [user_id, tenant_id]
        );

        if (targetUser.length === 0) {
          return res.status(400).json({ error: 'Utilisateur cible non trouvé' });
        }

        // Manager/Supervisor ne peuvent assigner qu'aux commerciaux/users
        if (user_role !== 'admin' && !['commercial', 'user'].includes(targetUser[0].role)) {
          return res.status(403).json({ error: 'Vous ne pouvez assigner qu\'aux commerciaux' });
        }

        assigned_user_id = user_id;
      } else {
        // Commercial ne peut pas assigner à quelqu'un d'autre
        return res.status(403).json({ error: 'Vous ne pouvez créer des rappels que pour vous-même' });
      }
    }

    // scheduled_date requis, mais lead_id optionnel (tâches générales sans lead)
    if (!scheduled_date) {
      return res.status(400).json({ error: 'scheduled_date requis' });
    }

    const { rows } = await q(
      `INSERT INTO follow_ups
       (tenant_id, lead_id, user_id, type, priority, title, notes, scheduled_date, created_by,
        contact_name, contact_phone, contact_method, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
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
        req.user.id, // Qui a créé la tâche
        contact_name || null,
        contact_phone || null,
        contact_method || 'phone'
      ]
    );

    log('✅ Rappel créé:', rows[0].id, 'par', req.user.id, 'pour', assigned_user_id);
    return res.status(201).json({ success: true, followup: rows[0] });
  } catch (err) {
    logError('❌ Erreur POST follow-ups:', err);
    return res.status(500).json({ error: err.message });
  }
});

// =============================
// PUT /follow-ups/:id/complete - Marquer comme terminé
// =============================
router.put('/:id/complete', authenticateToken, async (req, res) => {
  try {
    const tenant_id = req.user.tenant_id;
    const user_id = req.user.id;
    const user_role = req.user.role;
    const followupId = req.params.id;
    const { completed_notes } = req.body;

    // Vérifier l'accès à ce rappel
    const accessCheck = await checkFollowupAccess(followupId, tenant_id, user_id, user_role);
    if (!accessCheck.allowed) {
      return res.status(accessCheck.status).json({ error: accessCheck.error });
    }

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

    log('✅ Rappel complété:', followupId, 'par', user_id);
    return res.status(200).json({ success: true, followup: rows[0] });
  } catch (err) {
    logError('❌ Erreur complete:', err);
    return res.status(500).json({ error: err.message });
  }
});

// =============================
// PUT/PATCH /follow-ups/:id/reschedule - Repousser la date
// =============================
const rescheduleHandler = async (req, res) => {
  try {
    const tenant_id = req.user.tenant_id;
    const user_id = req.user.id;
    const user_role = req.user.role;
    const followupId = req.params.id;
    const { scheduled_date } = req.body;

    if (!scheduled_date) {
      return res.status(400).json({ error: 'scheduled_date requis' });
    }

    // Vérifier l'accès à ce rappel
    const accessCheck = await checkFollowupAccess(followupId, tenant_id, user_id, user_role);
    if (!accessCheck.allowed) {
      return res.status(accessCheck.status).json({ error: accessCheck.error });
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

    log('✅ Rappel reprogrammé:', followupId, 'par', user_id);
    return res.status(200).json({ success: true, followup: rows[0] });
  } catch (err) {
    logError('❌ Erreur reschedule:', err);
    return res.status(500).json({ error: err.message });
  }
};

// Supporter PUT et PATCH pour reschedule
router.put('/:id/reschedule', authenticateToken, rescheduleHandler);
router.patch('/:id/reschedule', authenticateToken, rescheduleHandler);

// =============================
// DELETE /follow-ups/:id - Supprimer un rappel
// =============================
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const tenant_id = req.user.tenant_id;
    const user_id = req.user.id;
    const user_role = req.user.role;
    const followupId = req.params.id;

    // Vérifier l'accès à ce rappel
    const accessCheck = await checkFollowupAccess(followupId, tenant_id, user_id, user_role, true);
    if (!accessCheck.allowed) {
      return res.status(accessCheck.status).json({ error: accessCheck.error });
    }

    const { rows } = await q(
      'DELETE FROM follow_ups WHERE id = $1 AND tenant_id = $2 RETURNING id',
      [followupId, tenant_id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Rappel non trouvé' });
    }

    log('✅ Rappel supprimé:', followupId, 'par', user_id);
    return res.status(200).json({ success: true, message: 'Rappel supprimé' });
  } catch (err) {
    logError('❌ Erreur delete:', err);
    return res.status(500).json({ error: err.message });
  }
});

// =============================
// HELPER: Vérifier l'accès à un rappel
// =============================
async function checkFollowupAccess(followupId, tenantId, userId, userRole, isDelete = false) {
  // Récupérer le rappel
  const { rows } = await q(
    `SELECT f.*, u.role as owner_role
     FROM follow_ups f
     LEFT JOIN users u ON f.user_id = u.id
     WHERE f.id = $1 AND f.tenant_id = $2`,
    [followupId, tenantId]
  );

  if (rows.length === 0) {
    return { allowed: false, status: 404, error: 'Rappel non trouvé' };
  }

  const followup = rows[0];

  // Admin a accès à tout
  if (userRole === 'admin') {
    return { allowed: true };
  }

  // L'utilisateur peut toujours modifier/supprimer son propre rappel
  if (followup.user_id === userId) {
    return { allowed: true };
  }

  // Manager/Supervisor peut modifier les rappels des commerciaux/users
  if (['manager', 'supervisor'].includes(userRole)) {
    if (['commercial', 'user'].includes(followup.owner_role)) {
      return { allowed: true };
    }
  }

  // Commercial ne peut pas modifier les rappels des autres
  return {
    allowed: false,
    status: 403,
    error: 'Vous n\'avez pas accès à ce rappel'
  };
}

export default router;
