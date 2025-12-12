import { log, error, warn } from "../lib/logger.js";
import { query, queryOne, queryAll, execute } from '../lib/db.js';
import { verifyAuth } from '../middleware/auth.js';
import { z } from 'zod';

// Schéma de validation pour créer une commission
const createCommissionSchema = z.object({
  user_id: z.string().uuid(),
  contract_id: z.string().uuid().optional(),
  lead_id: z.string().uuid().optional(),
  contract_amount: z.number().min(0),
  rate: z.number().min(0).max(100),
  commission_type: z.enum(['personal', 'team', 'bonus']),
  contract_type: z.enum(['subscription', 'one_shot', 'recurring']).optional(),
  contract_reference: z.string().optional(),
  notes: z.string().optional()
});

// Schéma pour mettre à jour le statut
const updateStatusSchema = z.object({
  status: z.enum(['pending', 'validated', 'paid', 'cancelled']),
  notes: z.string().optional()
});

export default async function handler(req, res) {
  try {
    // Vérifier l'authentification
    const authResult = await verifyAuth(req);
    if (!authResult.authenticated) {
      return res.status(401).json({ error: 'Non autorisé' });
    }

    const { userId, tenantId, role } = authResult;

    // GET /api/commissions/my - Mes commissions
    if (req.method === 'GET' && req.url.includes('/my')) {
      return await getMyCommissions(req, res, userId, tenantId);
    }

    // GET /api/commissions/team - Commissions de mon équipe (managers uniquement)
    if (req.method === 'GET' && req.url.includes('/team')) {
      if (role !== 'manager' && role !== 'admin') {
        return res.status(403).json({ error: 'Accès réservé aux managers' });
      }
      return await getTeamCommissions(req, res, userId, tenantId, role);
    }

    // GET /api/commissions - Toutes les commissions (admin uniquement)
    if (req.method === 'GET') {
      if (role !== 'admin') {
        return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
      }
      return await getAllCommissions(req, res, tenantId);
    }

    // POST /api/commissions - Créer une commission (admin uniquement)
    if (req.method === 'POST') {
      if (role !== 'admin') {
        return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
      }
      return await createCommission(req, res, tenantId, userId);
    }

    // PUT /api/commissions/:id - Mettre à jour le statut (admin uniquement)
    if (req.method === 'PUT') {
      if (role !== 'admin') {
        return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
      }
      return await updateCommissionStatus(req, res, tenantId);
    }

    return res.status(405).json({ error: 'Méthode non autorisée' });

  } catch (err) {
    error('Erreur API commissions:', err);
    return res.status(500).json({ error: err.message });
  }
}

// Récupérer mes commissions
async function getMyCommissions(req, res, userId, tenantId) {
  const { period, status, type } = req.query;

  let dateFilter = '';
  const params = [tenantId, userId];
  let paramIndex = 3;

  // Filtre par période
  if (period && period !== 'all') {
    const now = new Date();
    let startDate;

    switch (period) {
      case 'this_month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'last_month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        dateFilter = ` AND c.created_at >= $${paramIndex} AND c.created_at <= $${paramIndex + 1}`;
        params.push(startDate.toISOString(), endLastMonth.toISOString());
        paramIndex += 2;
        break;
      case 'this_quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        dateFilter = ` AND c.created_at >= $${paramIndex}`;
        params.push(startDate.toISOString());
        paramIndex++;
        break;
      case 'this_year':
        startDate = new Date(now.getFullYear(), 0, 1);
        dateFilter = ` AND c.created_at >= $${paramIndex}`;
        params.push(startDate.toISOString());
        paramIndex++;
        break;
      default:
        if (period === 'this_month') {
          dateFilter = ` AND c.created_at >= $${paramIndex}`;
          params.push(new Date(now.getFullYear(), now.getMonth(), 1).toISOString());
          paramIndex++;
        }
    }

    if (period === 'this_month' && !dateFilter) {
      dateFilter = ` AND c.created_at >= $${paramIndex}`;
      params.push(new Date(now.getFullYear(), now.getMonth(), 1).toISOString());
      paramIndex++;
    }
  }

  // Filtre par statut
  let statusFilter = '';
  if (status && status !== 'all') {
    statusFilter = ` AND c.status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  // Filtre par type
  let typeFilter = '';
  if (type && type !== 'all') {
    typeFilter = ` AND c.commission_type = $${paramIndex}`;
    params.push(type);
    paramIndex++;
  }

  // Récupérer les commissions
  const commissions = await queryAll(`
    SELECT
      c.*,
      l.company_name as lead_company,
      l.first_name || ' ' || l.last_name as lead_name
    FROM commissions c
    LEFT JOIN leads l ON c.lead_id = l.id
    WHERE c.tenant_id = $1 AND c.user_id = $2
    ${dateFilter}${statusFilter}${typeFilter}
    ORDER BY c.created_at DESC
  `, params);

  // Calculer les statistiques
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  const stats = await queryOne(`
    SELECT
      COALESCE(SUM(CASE WHEN status IN ('validated', 'paid') THEN amount ELSE 0 END), 0) as total_earned,
      COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_amount,
      COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as paid_amount,
      COALESCE(SUM(CASE WHEN created_at >= $3 AND status IN ('validated', 'paid') THEN amount ELSE 0 END), 0) as this_month,
      COALESCE(SUM(CASE WHEN created_at >= $4 AND created_at <= $5 AND status IN ('validated', 'paid') THEN amount ELSE 0 END), 0) as last_month,
      COALESCE(SUM(CASE WHEN commission_type = 'team' AND status IN ('validated', 'paid') THEN amount ELSE 0 END), 0) as team_commissions
    FROM commissions
    WHERE tenant_id = $1 AND user_id = $2
  `, [tenantId, userId, startOfMonth.toISOString(), startOfLastMonth.toISOString(), endOfLastMonth.toISOString()]);

  return res.json({
    commissions,
    stats: {
      total_earned: parseFloat(stats?.total_earned || 0),
      pending_amount: parseFloat(stats?.pending_amount || 0),
      paid_amount: parseFloat(stats?.paid_amount || 0),
      this_month: parseFloat(stats?.this_month || 0),
      last_month: parseFloat(stats?.last_month || 0),
      team_commissions: parseFloat(stats?.team_commissions || 0)
    }
  });
}

// Récupérer les commissions de l'équipe
async function getTeamCommissions(req, res, userId, tenantId, role) {
  let teamFilter = '';
  const params = [tenantId];

  if (role === 'manager') {
    // Récupérer les IDs des membres de l'équipe
    const teamMembers = await queryAll(`
      SELECT id FROM users
      WHERE tenant_id = $1 AND manager_id = $2
    `, [tenantId, userId]);

    if (teamMembers.length === 0) {
      return res.json({ commissions: [], stats: {} });
    }

    const memberIds = teamMembers.map(m => m.id);
    teamFilter = ` AND c.user_id = ANY($2::uuid[])`;
    params.push(memberIds);
  }

  const commissions = await queryAll(`
    SELECT
      c.*,
      u.first_name || ' ' || u.last_name as user_name,
      l.company_name as lead_company
    FROM commissions c
    JOIN users u ON c.user_id = u.id
    LEFT JOIN leads l ON c.lead_id = l.id
    WHERE c.tenant_id = $1${teamFilter}
    ORDER BY c.created_at DESC
    LIMIT 100
  `, params);

  return res.json({ commissions });
}

// Récupérer toutes les commissions (admin)
async function getAllCommissions(req, res, tenantId) {
  const { page = 1, limit = 50, status, user_id } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let filters = '';
  const params = [tenantId, parseInt(limit), offset];
  let paramIndex = 4;

  if (status && status !== 'all') {
    filters += ` AND c.status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  if (user_id) {
    filters += ` AND c.user_id = $${paramIndex}`;
    params.push(user_id);
    paramIndex++;
  }

  const commissions = await queryAll(`
    SELECT
      c.*,
      u.first_name || ' ' || u.last_name as user_name,
      u.email as user_email,
      l.company_name as lead_company
    FROM commissions c
    JOIN users u ON c.user_id = u.id
    LEFT JOIN leads l ON c.lead_id = l.id
    WHERE c.tenant_id = $1${filters}
    ORDER BY c.created_at DESC
    LIMIT $2 OFFSET $3
  `, params);

  const countResult = await queryOne(`
    SELECT COUNT(*) as total FROM commissions c WHERE tenant_id = $1${filters}
  `, [tenantId, ...(status && status !== 'all' ? [status] : []), ...(user_id ? [user_id] : [])]);

  return res.json({
    commissions,
    total: parseInt(countResult?.total || 0),
    page: parseInt(page),
    limit: parseInt(limit)
  });
}

// Créer une commission
async function createCommission(req, res, tenantId, createdBy) {
  const data = createCommissionSchema.parse(req.body);

  // Calculer le montant de la commission
  const amount = (data.contract_amount * data.rate) / 100;

  const result = await queryOne(`
    INSERT INTO commissions (
      tenant_id, user_id, contract_id, lead_id, contract_amount,
      rate, amount, commission_type, contract_type, contract_reference,
      status, notes, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', $11, $12)
    RETURNING *
  `, [
    tenantId,
    data.user_id,
    data.contract_id || null,
    data.lead_id || null,
    data.contract_amount,
    data.rate,
    amount,
    data.commission_type,
    data.contract_type || 'one_shot',
    data.contract_reference || null,
    data.notes || null,
    createdBy
  ]);

  return res.status(201).json({
    success: true,
    commission: result
  });
}

// Mettre à jour le statut d'une commission
async function updateCommissionStatus(req, res, tenantId) {
  const commissionId = req.url.split('/').pop();
  const data = updateStatusSchema.parse(req.body);

  // Vérifier que la commission existe et appartient au tenant
  const existing = await queryOne(`
    SELECT * FROM commissions WHERE id = $1 AND tenant_id = $2
  `, [commissionId, tenantId]);

  if (!existing) {
    return res.status(404).json({ error: 'Commission non trouvée' });
  }

  // Mettre à jour
  let updateFields = 'status = $1';
  const params = [data.status];
  let paramIndex = 2;

  if (data.status === 'validated') {
    updateFields += `, validated_at = NOW()`;
  } else if (data.status === 'paid') {
    updateFields += `, paid_at = NOW()`;
  }

  if (data.notes) {
    updateFields += `, notes = $${paramIndex}`;
    params.push(data.notes);
    paramIndex++;
  }

  params.push(commissionId, tenantId);

  const result = await queryOne(`
    UPDATE commissions
    SET ${updateFields}, updated_at = NOW()
    WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
    RETURNING *
  `, params);

  return res.json({
    success: true,
    commission: result
  });
}
