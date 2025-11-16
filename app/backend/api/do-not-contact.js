import { query as q } from '../lib/db.js';

/**
 * API de gestion "Ne pas contacter"
 * Permet de marquer des leads comme non-contactables automatiquement
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
      case 'POST':
        return await markDoNotContact(req, res, tenantId, userId);
      case 'PATCH':
        return await managerOverride(req, res, tenantId, userId, role);
      case 'DELETE':
        return await removeDoNotContact(req, res, tenantId, userId, role);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('❌ Erreur do-not-contact:', error);
    return res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
}

/**
 * POST /api/do-not-contact
 * Marquer un lead comme "ne pas contacter"
 */
async function markDoNotContact(req, res, tenantId, userId) {
  const { lead_id, reason, note } = req.body;

  if (!lead_id || !reason) {
    return res.status(400).json({
      error: 'Paramètres manquants',
      message: 'lead_id et reason sont requis'
    });
  }

  // Valider reason
  const validReasons = ['no_phone', 'after_click_no_interest', 'called_no_interest', 'other'];
  if (!validReasons.includes(reason)) {
    return res.status(400).json({
      error: 'Raison invalide',
      message: `reason doit être: ${validReasons.join(', ')}`
    });
  }

  // Vérifier que le lead existe et appartient au tenant
  const leadCheck = await q(
    'SELECT id, company_name FROM leads WHERE id = $1 AND tenant_id = $2',
    [lead_id, tenantId]
  );

  if (leadCheck.rows.length === 0) {
    return res.status(404).json({
      error: 'Lead introuvable',
      message: 'Ce lead n\'existe pas ou n\'appartient pas à votre tenant'
    });
  }

  // Marquer le lead comme "ne pas contacter"
  const { rows } = await q(
    `UPDATE leads
     SET do_not_contact = true,
         do_not_contact_reason = $1,
         do_not_contact_since = NOW(),
         do_not_contact_by = $2,
         do_not_contact_note = $3,
         manager_override_contact = false,
         manager_override_by = NULL,
         manager_override_at = NULL,
         manager_override_reason = NULL,
         updated_at = NOW()
     WHERE id = $4 AND tenant_id = $5
     RETURNING id, company_name, do_not_contact, do_not_contact_reason`,
    [reason, userId, note, lead_id, tenantId]
  );

  if (process.env.NODE_ENV !== 'production') {
    console.log(`🚫 Lead ${lead_id} marqué comme "ne pas contacter" (raison: ${reason})`);
  }

  return res.json({
    success: true,
    message: 'Lead marqué comme "ne pas contacter"',
    lead: rows[0]
  });
}

/**
 * PATCH /api/do-not-contact/override
 * Manager override: autoriser le contact malgré "ne pas contacter"
 */
async function managerOverride(req, res, tenantId, userId, role) {
  const { lead_id, override_reason } = req.body;

  // Seuls les managers/admins peuvent override
  if (role === 'user') {
    return res.status(403).json({
      error: 'Accès refusé',
      message: 'Seuls les managers peuvent autoriser le contact'
    });
  }

  if (!lead_id || !override_reason) {
    return res.status(400).json({
      error: 'Paramètres manquants',
      message: 'lead_id et override_reason sont requis'
    });
  }

  // Vérifier que le lead est bien marqué "ne pas contacter"
  const leadCheck = await q(
    'SELECT id, company_name, do_not_contact FROM leads WHERE id = $1 AND tenant_id = $2',
    [lead_id, tenantId]
  );

  if (leadCheck.rows.length === 0) {
    return res.status(404).json({
      error: 'Lead introuvable'
    });
  }

  if (!leadCheck.rows[0].do_not_contact) {
    return res.status(400).json({
      error: 'Lead non concerné',
      message: 'Ce lead n\'est pas marqué comme "ne pas contacter"'
    });
  }

  // Autoriser le contact via manager override
  const { rows } = await q(
    `UPDATE leads
     SET manager_override_contact = true,
         manager_override_by = $1,
         manager_override_at = NOW(),
         manager_override_reason = $2,
         updated_at = NOW()
     WHERE id = $3 AND tenant_id = $4
     RETURNING id, company_name, manager_override_contact`,
    [userId, override_reason, lead_id, tenantId]
  );

  if (process.env.NODE_ENV !== 'production') {
    console.log(`✅ Manager ${userId} a autorisé le contact pour lead ${lead_id}`);
  }

  return res.json({
    success: true,
    message: 'Contact autorisé par le manager',
    lead: rows[0]
  });
}

/**
 * DELETE /api/do-not-contact/:lead_id
 * Retirer le statut "ne pas contacter" (managers seulement)
 */
async function removeDoNotContact(req, res, tenantId, userId, role) {
  const { lead_id } = req.query;

  // Seuls les managers/admins peuvent retirer le statut
  if (role === 'user') {
    return res.status(403).json({
      error: 'Accès refusé',
      message: 'Seuls les managers peuvent retirer le statut "ne pas contacter"'
    });
  }

  if (!lead_id) {
    return res.status(400).json({
      error: 'Paramètre manquant',
      message: 'lead_id est requis'
    });
  }

  // Retirer tous les marqueurs
  const { rows } = await q(
    `UPDATE leads
     SET do_not_contact = false,
         do_not_contact_reason = NULL,
         do_not_contact_since = NULL,
         do_not_contact_by = NULL,
         do_not_contact_note = NULL,
         manager_override_contact = false,
         manager_override_by = NULL,
         manager_override_at = NULL,
         manager_override_reason = NULL,
         updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2
     RETURNING id, company_name, do_not_contact`,
    [lead_id, tenantId]
  );

  if (rows.length === 0) {
    return res.status(404).json({
      error: 'Lead introuvable'
    });
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log(`🔄 Statut "ne pas contacter" retiré pour lead ${lead_id}`);
  }

  return res.json({
    success: true,
    message: 'Statut "ne pas contacter" retiré',
    lead: rows[0]
  });
}
