import { log, error, warn } from "../lib/logger.js";
/**
 * API Validation Requests - Demandes de validation et d'aide
 * Permet aux commerciaux de demander validation ou aide aux managers
 */

import { query, queryOne, queryAll, execute } from '../lib/db.js';
import { verifyAuth } from '../middleware/auth.js';

export default async function handler(req, res) {
  // Vérifier authentification
  const authResult = await verifyAuth(req);
  if (!authResult.authenticated) {
    return res.status(401).json({ error: 'Non authentifié' });
  }

  const { userId, tenantId, role } = authResult;

  try {
    // GET - Liste des demandes
    if (req.method === 'GET' && !req.url.includes('/validation-requests/')) {
      const { status, type, assigned_to_me, my_requests } = req.query;

      let sqlQuery = `
        SELECT
          vr.*,
          u_requester.first_name as requester_first_name,
          u_requester.last_name as requester_last_name,
          u_requester.email as requester_email,
          u_reviewer.first_name as reviewer_first_name,
          u_reviewer.last_name as reviewer_last_name,
          l.company_name,
          l.contact_name,
          c.name as campaign_name
        FROM validation_requests vr
        LEFT JOIN users u_requester ON vr.requester_id = u_requester.id
        LEFT JOIN users u_reviewer ON vr.reviewed_by = u_reviewer.id
        LEFT JOIN leads l ON vr.lead_id = l.id
        LEFT JOIN campaigns c ON vr.campaign_id = c.id
        WHERE vr.tenant_id = $1
      `;

      const params = [tenantId];
      let paramIndex = 2;

      // Filtrer par statut
      if (status) {
        sqlQuery += ` AND vr.status = $${paramIndex++}`;
        params.push(status);
      }

      // Filtrer par type
      if (type) {
        sqlQuery += ` AND vr.type = $${paramIndex++}`;
        params.push(type);
      }

      // Assignées à moi (manager)
      if (assigned_to_me === 'true') {
        sqlQuery += ` AND vr.assigned_to = $${paramIndex++}`;
        params.push(userId);
      }

      // Mes demandes (commercial)
      if (my_requests === 'true') {
        sqlQuery += ` AND vr.requester_id = $${paramIndex++}`;
        params.push(userId);
      }

      sqlQuery += ` ORDER BY
        CASE vr.priority
          WHEN 'urgent' THEN 1
          WHEN 'high' THEN 2
          WHEN 'normal' THEN 3
          WHEN 'low' THEN 4
        END,
        vr.created_at DESC
      `;

      const requests = await queryAll(sqlQuery, params);

      return res.json({
        success: true,
        requests,
        total: requests.length
      });
    }

    // GET - Détail d'une demande
    if (req.method === 'GET' && req.url !== '/' && req.url.includes('/')) {
      const requestId = req.url.replace('/', '').split('?')[0];

      const request = await queryOne(
        `SELECT
          vr.*,
          u_requester.first_name as requester_first_name,
          u_requester.last_name as requester_last_name,
          u_requester.email as requester_email,
          u_reviewer.first_name as reviewer_first_name,
          u_reviewer.last_name as reviewer_last_name,
          u_assigned.first_name as assigned_first_name,
          u_assigned.last_name as assigned_last_name,
          l.company_name,
          l.contact_name,
          l.email as lead_email,
          l.phone as lead_phone,
          c.name as campaign_name
        FROM validation_requests vr
        LEFT JOIN users u_requester ON vr.requester_id = u_requester.id
        LEFT JOIN users u_reviewer ON vr.reviewed_by = u_reviewer.id
        LEFT JOIN users u_assigned ON vr.assigned_to = u_assigned.id
        LEFT JOIN leads l ON vr.lead_id = l.id
        LEFT JOIN campaigns c ON vr.campaign_id = c.id
        WHERE vr.id = $1 AND vr.tenant_id = $2`,
        [requestId, tenantId]
      );

      if (!request) {
        return res.status(404).json({ error: 'Demande introuvable' });
      }

      return res.json({
        success: true,
        request
      });
    }

    // POST - Créer une demande
    if (req.method === 'POST') {
      const {
        type,
        lead_id,
        campaign_id,
        subject,
        message,
        priority = 'normal'
      } = req.body;

      // Validation
      if (!type || !['validation', 'help', 'leadshow'].includes(type)) {
        return res.status(400).json({ error: 'Type requis: validation, help ou leadshow' });
      }

      if (!subject || subject.trim().length === 0) {
        return res.status(400).json({ error: 'Sujet requis' });
      }

      // Trouver automatiquement le manager de l'utilisateur
      const manager = await queryOne(
        `SELECT manager_id
         FROM users
         WHERE id = $1 AND tenant_id = $2`,
        [userId, tenantId]
      );

      const assigned_to = manager?.manager_id || null;

      // Créer la demande
      const newRequest = await queryOne(
        `INSERT INTO validation_requests (
          tenant_id, type, requester_id, lead_id, campaign_id,
          subject, message, priority, assigned_to, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
        RETURNING *`,
        [
          tenantId,
          type,
          userId,
          lead_id || null,
          campaign_id || null,
          subject.trim(),
          message?.trim() || null,
          priority,
          assigned_to
        ]
      );

      log(`✅ Demande ${type} créée:`, newRequest.id);

      const messages = {
        validation: 'validation',
        help: 'd\'aide',
        leadshow: 'd\'escalade (Lead Show)'
      };

      return res.status(201).json({
        success: true,
        request: newRequest,
        message: `Demande de ${messages[type] || type} créée avec succès`
      });
    }

    // PATCH - Mettre à jour une demande (répondre, approuver, rejeter)
    if (req.method === 'PATCH') {
      const requestId = req.url.replace('/', '').split('?')[0];

      const {
        status: newStatus,
        manager_response,
        resolution_notes,
        assigned_to
      } = req.body;

      // Vérifier que la demande existe et appartient au tenant
      const existingRequest = await queryOne(
        `SELECT * FROM validation_requests WHERE id = $1 AND tenant_id = $2`,
        [requestId, tenantId]
      );

      if (!existingRequest) {
        return res.status(404).json({ error: 'Demande introuvable' });
      }

      // Vérifier les permissions (manager ou créateur)
      const isManager = role === 'manager' || role === 'admin';
      const isRequester = existingRequest.requester_id === userId;

      if (!isManager && !isRequester) {
        return res.status(403).json({ error: 'Permission refusée' });
      }

      // Construire la requête UPDATE
      const updates = [];
      const params = [];
      let paramIndex = 1;

      if (newStatus) {
        updates.push(`status = $${paramIndex++}`);
        params.push(newStatus);

        // Si approuvé/rejeté, enregistrer qui a reviewé
        if (['approved', 'rejected', 'resolved'].includes(newStatus)) {
          updates.push(`reviewed_by = $${paramIndex++}`);
          params.push(userId);
          updates.push(`reviewed_at = NOW()`);
        }
      }

      if (manager_response !== undefined) {
        updates.push(`manager_response = $${paramIndex++}`);
        params.push(manager_response);
      }

      if (resolution_notes !== undefined) {
        updates.push(`resolution_notes = $${paramIndex++}`);
        params.push(resolution_notes);
      }

      if (assigned_to !== undefined) {
        updates.push(`assigned_to = $${paramIndex++}`);
        params.push(assigned_to);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'Aucune mise à jour fournie' });
      }

      params.push(requestId, tenantId);
      const updateQuery = `
        UPDATE validation_requests
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex++}
        RETURNING *
      `;

      const updatedRequest = await queryOne(updateQuery, params);

      log(`✅ Demande ${requestId} mise à jour:`, newStatus);

      return res.json({
        success: true,
        request: updatedRequest,
        message: 'Demande mise à jour avec succès'
      });
    }

    // DELETE - Annuler une demande
    if (req.method === 'DELETE') {
      const requestId = req.url.replace('/', '').split('?')[0];

      // Vérifier que c'est bien le créateur ou un manager
      const existingRequest = await queryOne(
        `SELECT * FROM validation_requests WHERE id = $1 AND tenant_id = $2`,
        [requestId, tenantId]
      );

      if (!existingRequest) {
        return res.status(404).json({ error: 'Demande introuvable' });
      }

      const isManager = role === 'manager' || role === 'admin';
      const isRequester = existingRequest.requester_id === userId;

      if (!isManager && !isRequester) {
        return res.status(403).json({ error: 'Permission refusée' });
      }

      await execute(
        `DELETE FROM validation_requests WHERE id = $1 AND tenant_id = $2`,
        [requestId, tenantId]
      );

      log(`✅ Demande ${requestId} supprimée`);

      return res.json({
        success: true,
        message: 'Demande supprimée avec succès'
      });
    }

    return res.status(405).json({ error: 'Méthode non autorisée' });

  } catch (error) {
    error('❌ Erreur validation-requests:', error);
    return res.status(500).json({ error: error.message });
  }
}
