import { authMiddleware } from '../middleware/auth.js';
import { queryAll, execute } from '../lib/db.js';

async function handler(req, res) {
  const tenant_id = req.user.tenant_id;
  const user_id = req.user.id;
  const user_role = req.user.role;
  const urlPath = req.url.split('?')[0];

  try {
    // GET /api/follow-ups - Liste des rappels
    if (req.method === 'GET' && urlPath === '/api/follow-ups') {
      const { user_id: filter_user_id } = req.query;

      let query = `
        SELECT f.*, 
               l.company_name, l.email AS lead_email, l.phone AS lead_phone, l.industry,
               u.first_name || ' ' || u.last_name AS user_name
        FROM follow_ups f
        LEFT JOIN leads l ON f.lead_id = l.id
        LEFT JOIN users u ON f.user_id = u.id
        WHERE f.tenant_id = $1
      `;
      const params = [tenant_id];

      // Si commercial, voir uniquement ses rappels
      if (user_role === 'commercial') {
        query += ' AND f.user_id = $2';
        params.push(user_id);
      }
      // Si manager filtre par commercial spécifique
      else if (filter_user_id && filter_user_id !== 'all') {
        query += ' AND f.user_id = $2';
        params.push(parseInt(filter_user_id));
      }

      query += ' ORDER BY f.scheduled_date ASC';

      const followups = await queryAll(query, params);
      return res.status(200).json({ success: true, followups: followups || [] });
    }

    // POST /api/follow-ups - Créer un rappel
    if (req.method === 'POST' && urlPath === '/api/follow-ups') {
      const { lead_id, type, priority, title, notes, scheduled_date } = req.body;

      if (!lead_id || !scheduled_date) {
        return res.status(400).json({ error: 'lead_id et scheduled_date requis' });
      }

      const followup = await execute(
        `INSERT INTO follow_ups 
         (tenant_id, lead_id, user_id, type, priority, title, notes, scheduled_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          tenant_id,
          parseInt(lead_id),
          user_id,
          type || 'call',
          priority || 'medium',
          title || null,
          notes || null,
          scheduled_date
        ]
      );

      console.log(' Rappel créé:', followup.id);
      return res.status(201).json({ success: true, followup });
    }

    // PUT /api/follow-ups/:id/complete - Marquer comme terminé
    if (req.method === 'PUT' && urlPath.includes('/complete')) {
      const followupId = parseInt(urlPath.split('/')[3]);
      const { completed_notes } = req.body;

      const followup = await execute(
        `UPDATE follow_ups 
         SET completed = TRUE, 
             completed_at = CURRENT_TIMESTAMP,
             completed_notes = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND tenant_id = $3 AND user_id = $4
         RETURNING *`,
        [completed_notes || null, followupId, tenant_id, user_id]
      );

      if (!followup) {
        return res.status(404).json({ error: 'Rappel non trouvé' });
      }

      console.log(' Rappel complété:', followupId);
      return res.status(200).json({ success: true, followup });
    }

    // PUT /api/follow-ups/:id/reschedule - Repousser la date
    if (req.method === 'PUT' && urlPath.includes('/reschedule')) {
      const followupId = parseInt(urlPath.split('/')[3]);
      const { scheduled_date } = req.body;

      if (!scheduled_date) {
        return res.status(400).json({ error: 'scheduled_date requis' });
      }

      const followup = await execute(
        `UPDATE follow_ups 
         SET scheduled_date = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND tenant_id = $3 AND user_id = $4
         RETURNING *`,
        [scheduled_date, followupId, tenant_id, user_id]
      );

      if (!followup) {
        return res.status(404).json({ error: 'Rappel non trouvé' });
      }

      console.log(' Rappel reprogrammé:', followupId);
      return res.status(200).json({ success: true, followup });
    }

    // DELETE /api/follow-ups/:id - Supprimer un rappel
    if (req.method === 'DELETE') {
      const followupId = parseInt(urlPath.split('/')[3]);

      const result = await execute(
        'DELETE FROM follow_ups WHERE id = $1 AND tenant_id = $2 AND user_id = $3 RETURNING id',
        [followupId, tenant_id, user_id]
      );

      if (!result) {
        return res.status(404).json({ error: 'Rappel non trouvé' });
      }

      console.log(' Rappel supprimé:', followupId);
      return res.status(200).json({ success: true, message: 'Rappel supprimé' });
    }

    // PUT /api/follow-ups/:id - Modifier un rappel
    if (req.method === 'PUT' && !urlPath.includes('/complete') && !urlPath.includes('/reschedule')) {
      const followupId = parseInt(urlPath.split('/')[3]);
      const { type, priority, title, notes, scheduled_date } = req.body;

      const followup = await execute(
        `UPDATE follow_ups 
         SET type = COALESCE($1, type),
             priority = COALESCE($2, priority),
             title = COALESCE($3, title),
             notes = COALESCE($4, notes),
             scheduled_date = COALESCE($5, scheduled_date),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $6 AND tenant_id = $7 AND user_id = $8
         RETURNING *`,
        [
          type,
          priority,
          title,
          notes,
          scheduled_date,
          followupId,
          tenant_id,
          user_id
        ]
      );

      if (!followup) {
        return res.status(404).json({ error: 'Rappel non trouvé' });
      }

      console.log(' Rappel modifié:', followupId);
      return res.status(200).json({ success: true, followup });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Erreur follow-ups:', error);
    return res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
}

export default authMiddleware(handler);
