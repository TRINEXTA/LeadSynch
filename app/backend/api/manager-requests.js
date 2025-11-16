import { query as q } from '../lib/db.js';

/**
 * API des demandes manager
 * Permet aux commerciaux de demander l'aide/validation d'un manager
 */
export default async function handler(req, res) {
  const { method } = req;
  const { user } = req;

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { tenant_id: tenantId, id: userId, role } = user;

  try {
    switch (method) {
      case 'GET':
        return await getManagerRequests(req, res, tenantId, userId, role);
      case 'POST':
        return await createManagerRequest(req, res, tenantId, userId);
      case 'PATCH':
        return await updateRequestStatus(req, res, tenantId, userId, role);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('❌ Erreur manager-requests:', error);
    return res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
}

/**
 * GET /api/manager-requests
 * Liste toutes les demandes (pour managers) ou mes demandes (pour users)
 */
async function getManagerRequests(req, res, tenantId, userId, role) {
  const { status, type } = req.query;

  let query = `
    SELECT
      mr.*,
      l.company_name,
      l.contact_name,
      l.email,
      l.deal_value,
      l.stage,
      u.first_name || ' ' || u.last_name as requested_by_name,
      u.email as requested_by_email
    FROM manager_requests mr
    JOIN leads l ON mr.lead_id = l.id
    JOIN users u ON mr.requested_by = u.id
    WHERE mr.tenant_id = $1
  `;
  const params = [tenantId];
  let paramIndex = 2;

  // Si user normal, voir seulement ses propres demandes
  if (role === 'user') {
    query += ` AND mr.requested_by = $${paramIndex}`;
    params.push(userId);
    paramIndex++;
  }

  // Filtrer par statut
  if (status) {
    query += ` AND mr.status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  // Filtrer par type
  if (type) {
    query += ` AND mr.request_type = $${paramIndex}`;
    params.push(type);
    paramIndex++;
  }

  query += ` ORDER BY
    CASE mr.urgency
      WHEN 'urgent' THEN 1
      WHEN 'normal' THEN 2
      WHEN 'low' THEN 3
    END,
    mr.created_at DESC
  `;

  const { rows } = await q(query, params);

  return res.json({
    success: true,
    requests: rows,
    count: rows.length
  });
}

/**
 * POST /api/manager-requests
 * Créer une nouvelle demande manager
 */
async function createManagerRequest(req, res, tenantId, userId) {
  const { lead_id, request_type, message, urgency = 'normal' } = req.body;

  if (!lead_id || !request_type || !message) {
    return res.status(400).json({
      error: 'Paramètres manquants',
      message: 'lead_id, request_type et message sont requis'
    });
  }

  // Valider request_type
  const validTypes = ['help', 'validation', 'show'];
  if (!validTypes.includes(request_type)) {
    return res.status(400).json({
      error: 'Type invalide',
      message: `request_type doit être: ${validTypes.join(', ')}`
    });
  }

  // Valider urgency
  const validUrgencies = ['low', 'normal', 'urgent'];
  if (!validUrgencies.includes(urgency)) {
    return res.status(400).json({
      error: 'Urgence invalide',
      message: `urgency doit être: ${validUrgencies.join(', ')}`
    });
  }

  // Vérifier que le lead existe et appartient au tenant
  const leadCheck = await q(
    'SELECT id FROM leads WHERE id = $1 AND tenant_id = $2',
    [lead_id, tenantId]
  );

  if (leadCheck.rows.length === 0) {
    return res.status(404).json({
      error: 'Lead introuvable',
      message: 'Ce lead n\'existe pas ou n\'appartient pas à votre tenant'
    });
  }

  // Créer la demande
  const { rows } = await q(
    `INSERT INTO manager_requests (
      tenant_id,
      lead_id,
      requested_by,
      request_type,
      message,
      urgency,
      status,
      created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW())
    RETURNING *`,
    [tenantId, lead_id, userId, request_type, message, urgency]
  );

  // TODO: Envoyer notification au manager (email, push, etc.)
  // await sendManagerNotification(rows[0]);

  return res.status(201).json({
    success: true,
    message: 'Demande créée avec succès',
    request: rows[0]
  });
}

/**
 * PATCH /api/manager-requests/:id
 * Mettre à jour le statut d'une demande (pour managers)
 */
async function updateRequestStatus(req, res, tenantId, userId, role) {
  const { id } = req.query;
  const { status, response_message } = req.body;

  // Seuls les managers/admins peuvent modifier le statut
  if (role === 'user') {
    return res.status(403).json({
      error: 'Accès refusé',
      message: 'Seuls les managers peuvent traiter les demandes'
    });
  }

  // Valider statut
  const validStatuses = ['pending', 'in_progress', 'resolved', 'rejected'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      error: 'Statut invalide',
      message: `status doit être: ${validStatuses.join(', ')}`
    });
  }

  // Mettre à jour
  const { rows } = await q(
    `UPDATE manager_requests
     SET status = $1,
         response_message = $2,
         resolved_by = $3,
         resolved_at = CASE WHEN $1 IN ('resolved', 'rejected') THEN NOW() ELSE NULL END,
         updated_at = NOW()
     WHERE id = $4 AND tenant_id = $5
     RETURNING *`,
    [status, response_message, userId, id, tenantId]
  );

  if (rows.length === 0) {
    return res.status(404).json({
      error: 'Demande introuvable'
    });
  }

  // TODO: Notifier le demandeur du changement de statut
  // await sendUserNotification(rows[0]);

  return res.json({
    success: true,
    message: 'Demande mise à jour',
    request: rows[0]
  });
}
