// ================================================================
// API : Super-Admin TRINEXTA
// Description : Gestion complète des clients, abonnements, facturation
// Base path : /api/super-admin
// ================================================================

import express from 'express';
import { z } from 'zod';
import { query as q, queryAll, queryOne } from '../lib/db.js';
import { requireSuperAdmin } from '../middleware/super-admin-auth.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Middleware : Toutes les routes nécessitent super-admin
router.use(authMiddleware);
router.use(requireSuperAdmin);

// ========================================
// DASHBOARD & STATS GLOBALES
// ========================================

// GET /super-admin/dashboard/stats
// Statistiques globales pour le dashboard
router.get('/dashboard/stats', async (req, res) => {
  try {
    // Statistiques clients
    const { rows: tenantStats } = await q(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'trial') as trial_count,
        COUNT(*) FILTER (WHERE status = 'active') as active_count,
        COUNT(*) FILTER (WHERE status = 'suspended') as suspended_count,
        COUNT(*) FILTER (WHERE status = 'expired') as expired_count,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count,
        COUNT(*) as total_count
      FROM tenants
    `);

    // MRR & ARR
    const { rows: revenueStats } = await q(`
      SELECT
        COALESCE(SUM(mrr), 0) as total_mrr,
        COALESCE(SUM(arr), 0) as total_arr,
        COUNT(*) FILTER (WHERE status = 'active' AND auto_renew = true) as auto_renew_count
      FROM tenant_subscriptions
      WHERE status = 'active'
    `);

    // Factures impayées
    const { rows: invoiceStats } = await q(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'overdue') as overdue_count,
        COALESCE(SUM(total) FILTER (WHERE status = 'overdue'), 0) as overdue_amount,
        COUNT(*) FILTER (WHERE status = 'paid') as paid_count,
        COALESCE(SUM(total) FILTER (WHERE status = 'paid' AND EXTRACT(MONTH FROM paid_at) = EXTRACT(MONTH FROM CURRENT_DATE)), 0) as paid_this_month
      FROM invoices
    `);

    // Abonnements expirant sous 7 jours
    const { rows: expiringSubscriptions } = await q(`
      SELECT COUNT(*) as expiring_soon_count
      FROM tenant_subscriptions
      WHERE status = 'active'
        AND end_date IS NOT NULL
        AND end_date <= CURRENT_DATE + INTERVAL '7 days'
        AND end_date >= CURRENT_DATE
    `);

    // Nouveaux clients ce mois
    const { rows: newThisMonth } = await q(`
      SELECT COUNT(*) as new_tenants_this_month
      FROM tenants
      WHERE EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
    `);

    res.json({
      success: true,
      stats: {
        tenants: tenantStats[0],
        revenue: revenueStats[0],
        invoices: invoiceStats[0],
        alerts: {
          expiring_subscriptions: parseInt(expiringSubscriptions[0].expiring_soon_count || 0),
          overdue_invoices: parseInt(invoiceStats[0].overdue_count || 0)
        },
        growth: {
          new_tenants_this_month: parseInt(newThisMonth[0].new_tenants_this_month || 0)
        }
      }
    });

  } catch (error) {
    console.error('❌ Erreur stats dashboard super-admin:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /super-admin/dashboard/revenue-chart
// Données pour graphique de revenus mensuels (12 derniers mois)
router.get('/dashboard/revenue-chart', async (req, res) => {
  try {
    const { rows } = await q(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', paid_at), 'YYYY-MM') as month,
        COALESCE(SUM(total), 0) as revenue,
        COUNT(*) as invoices_count
      FROM invoices
      WHERE status = 'paid'
        AND paid_at >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', paid_at)
      ORDER BY month DESC
      LIMIT 12
    `);

    res.json({ success: true, data: rows });

  } catch (error) {
    console.error('❌ Erreur revenue chart:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// GESTION TENANTS (CLIENTS)
// ========================================

// GET /super-admin/tenants
// Liste tous les clients avec filtres
router.get('/tenants', async (req, res) => {
  try {
    const { status, search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '1=1';
    const params = [];
    let paramIndex = 1;

    if (status) {
      whereClause += ` AND t.status = $${paramIndex++}`;
      params.push(status);
    }

    if (search) {
      whereClause += ` AND (t.name ILIKE $${paramIndex++} OR t.billing_email ILIKE $${paramIndex++})`;
      params.push(`%${search}%`, `%${search}%`);
    }

    const { rows } = await q(
      `SELECT
        t.*,
        sp.name as plan_name,
        sp.slug as plan_slug,
        ts.status as subscription_status,
        ts.end_date as subscription_end_date,
        (SELECT COUNT(*) FROM users WHERE tenant_id = t.id) as users_count,
        (SELECT COUNT(*) FROM leads WHERE tenant_id = t.id) as leads_count
       FROM tenants t
       LEFT JOIN subscription_plans sp ON t.current_plan_id = sp.id
       LEFT JOIN tenant_subscriptions ts ON t.id = ts.tenant_id AND ts.status = 'active'
       WHERE ${whereClause}
       ORDER BY t.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, limit, offset]
    );

    const { rows: countRows } = await q(
      `SELECT COUNT(*) as total FROM tenants t WHERE ${whereClause}`,
      params
    );

    res.json({
      success: true,
      tenants: rows,
      total: parseInt(countRows[0].total),
      page: parseInt(page),
      limit: parseInt(limit)
    });

  } catch (error) {
    console.error('❌ Erreur liste tenants:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /super-admin/tenants/:id
// Détails complets d'un client
router.get('/tenants/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const tenant = await queryOne(
      `SELECT t.*, sp.name as plan_name
       FROM tenants t
       LEFT JOIN subscription_plans sp ON t.current_plan_id = sp.id
       WHERE t.id = $1`,
      [id]
    );

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant non trouvé' });
    }

    // Abonnements
    const subscriptions = await queryAll(
      `SELECT ts.*, sp.name as plan_name
       FROM tenant_subscriptions ts
       LEFT JOIN subscription_plans sp ON ts.plan_id = sp.id
       WHERE ts.tenant_id = $1
       ORDER BY ts.created_at DESC`,
      [id]
    );

    // Factures
    const invoices = await queryAll(
      `SELECT * FROM invoices
       WHERE tenant_id = $1
       ORDER BY issue_date DESC
       LIMIT 10`,
      [id]
    );

    // Utilisateurs
    const users = await queryAll(
      `SELECT id, email, first_name, last_name, role, is_active, created_at
       FROM users
       WHERE tenant_id = $1
       ORDER BY created_at`,
      [id]
    );

    // Stats
    const stats = await queryOne(
      `SELECT
        (SELECT COUNT(*) FROM leads WHERE tenant_id = $1) as leads_count,
        (SELECT COUNT(*) FROM campaigns WHERE tenant_id = $1) as campaigns_count,
        (SELECT COUNT(*) FROM email_templates WHERE tenant_id = $1) as templates_count
      `,
      [id]
    );

    res.json({
      success: true,
      tenant,
      subscriptions,
      invoices,
      users,
      stats
    });

  } catch (error) {
    console.error('❌ Erreur détails tenant:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /super-admin/tenants
// Créer un nouveau client avec trial 30 jours
const createTenantSchema = z.object({
  name: z.string().min(1, 'Nom requis'),
  billing_email: z.string().email('Email invalide'),
  company_siret: z.string().optional(),
  company_address: z.string().optional(),
  admin_email: z.string().email('Email admin invalide'),
  admin_first_name: z.string().min(1, 'Prénom admin requis'),
  admin_last_name: z.string().min(1, 'Nom admin requis'),
  start_with_trial: z.boolean().default(true)
});

router.post('/tenants', async (req, res) => {
  try {
    const data = createTenantSchema.parse(req.body);

    // Récupérer le plan trial
    const trialPlan = await queryOne(
      `SELECT * FROM subscription_plans WHERE slug = 'trial'`
    );

    if (!trialPlan) {
      return res.status(500).json({ error: 'Plan trial non configuré' });
    }

    // 1. Créer le tenant
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 30); // 30 jours

    const tenant = await queryOne(
      `INSERT INTO tenants
       (name, billing_email, company_siret, company_address, status, trial_ends_at, current_plan_id)
       VALUES ($1, $2, $3, $4, 'trial', $5, $6)
       RETURNING *`,
      [data.name, data.billing_email, data.company_siret, data.company_address, trialEndsAt, trialPlan.id]
    );

    // 2. Créer l'admin user
    const tempPassword = Math.random().toString(36).slice(-8) + 'A1!'; // Mot de passe temporaire
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const adminUser = await queryOne(
      `INSERT INTO users
       (tenant_id, email, first_name, last_name, password_hash, role, is_active)
       VALUES ($1, $2, $3, $4, $5, 'admin', true)
       RETURNING id, email, first_name, last_name, role`,
      [tenant.id, data.admin_email, data.admin_first_name, data.admin_last_name, hashedPassword]
    );

    // 3. Créer l'abonnement trial
    const subscription = await queryOne(
      `INSERT INTO tenant_subscriptions
       (tenant_id, plan_id, status, start_date, end_date, trial_ends_at, billing_cycle, price, mrr, arr, auto_renew)
       VALUES ($1, $2, 'active', CURRENT_DATE, $3, $3, 'monthly', 0, 0, 0, false)
       RETURNING *`,
      [tenant.id, trialPlan.id, trialEndsAt]
    );

    // Log l'action
    await req.logSuperAdminAction('create_tenant', 'tenant', tenant.id, {
      tenant_name: data.name,
      admin_email: data.admin_email
    });

    res.status(201).json({
      success: true,
      tenant,
      admin_user: adminUser,
      subscription,
      temp_password: tempPassword,
      message: 'Client créé avec succès. Envoyez les identifiants à l\'admin.'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation échouée', details: error.errors });
    }
    console.error('❌ Erreur création tenant:', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /super-admin/tenants/:id
// Modifier un client
router.patch('/tenants/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      billing_email,
      company_siret,
      company_vat,
      company_address,
      company_postal_code,
      company_city,
      company_country,
      notes,
      tags
    } = req.body;

    const updateFields = [];
    const updateParams = [];
    let paramIndex = 1;

    if (name) {
      updateFields.push(`name = $${paramIndex++}`);
      updateParams.push(name);
    }
    if (billing_email) {
      updateFields.push(`billing_email = $${paramIndex++}`);
      updateParams.push(billing_email);
    }
    if (company_siret !== undefined) {
      updateFields.push(`company_siret = $${paramIndex++}`);
      updateParams.push(company_siret);
    }
    if (company_vat !== undefined) {
      updateFields.push(`company_vat = $${paramIndex++}`);
      updateParams.push(company_vat);
    }
    if (company_address !== undefined) {
      updateFields.push(`company_address = $${paramIndex++}`);
      updateParams.push(company_address);
    }
    if (company_postal_code !== undefined) {
      updateFields.push(`company_postal_code = $${paramIndex++}`);
      updateParams.push(company_postal_code);
    }
    if (company_city !== undefined) {
      updateFields.push(`company_city = $${paramIndex++}`);
      updateParams.push(company_city);
    }
    if (company_country !== undefined) {
      updateFields.push(`company_country = $${paramIndex++}`);
      updateParams.push(company_country);
    }
    if (notes !== undefined) {
      updateFields.push(`notes = $${paramIndex++}`);
      updateParams.push(notes);
    }
    if (tags !== undefined) {
      updateFields.push(`tags = $${paramIndex++}`);
      updateParams.push(JSON.stringify(tags));
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'Aucun champ à mettre à jour' });
    }

    updateFields.push(`updated_at = NOW()`);
    updateParams.push(id);

    const { rows } = await q(
      `UPDATE tenants SET ${updateFields.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      updateParams
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Tenant non trouvé' });
    }

    await req.logSuperAdminAction('update_tenant', 'tenant', id, req.body);

    res.json({ success: true, tenant: rows[0] });

  } catch (error) {
    console.error('❌ Erreur modification tenant:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /super-admin/tenants/:id/suspend
// Suspendre un client
router.post('/tenants/:id/suspend', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const { rows } = await q(
      `UPDATE tenants
       SET status = 'suspended',
           notes = COALESCE(notes || E'\\n\\n', '') || $2,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, `[${new Date().toISOString()}] Suspendu: ${reason || 'Non spécifié'}`]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Tenant non trouvé' });
    }

    // Désactiver abonnements actifs
    await q(
      `UPDATE tenant_subscriptions
       SET status = 'suspended'
       WHERE tenant_id = $1 AND status = 'active'`,
      [id]
    );

    await req.logSuperAdminAction('suspend_tenant', 'tenant', id, { reason });

    res.json({ success: true, tenant: rows[0], message: 'Client suspendu' });

  } catch (error) {
    console.error('❌ Erreur suspension tenant:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /super-admin/tenants/:id/activate
// Réactiver un client
router.post('/tenants/:id/activate', async (req, res) => {
  try {
    const { id } = req.params;

    const { rows } = await q(
      `UPDATE tenants
       SET status = 'active',
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Tenant non trouvé' });
    }

    // Réactiver abonnements
    await q(
      `UPDATE tenant_subscriptions
       SET status = 'active'
       WHERE tenant_id = $1 AND status = 'suspended'`,
      [id]
    );

    await req.logSuperAdminAction('activate_tenant', 'tenant', id);

    res.json({ success: true, tenant: rows[0], message: 'Client réactivé' });

  } catch (error) {
    console.error('❌ Erreur activation tenant:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /super-admin/tenants/:id
// Mettre à jour les informations d'un client
router.put('/tenants/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, billing_email, phone, address, city, postal_code, country } = req.body;

    const { rows } = await q(
      `UPDATE tenants
       SET name = COALESCE($1, name),
           billing_email = COALESCE($2, billing_email),
           phone = COALESCE($3, phone),
           address = COALESCE($4, address),
           city = COALESCE($5, city),
           postal_code = COALESCE($6, postal_code),
           country = COALESCE($7, country),
           updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [name, billing_email, phone, address, city, postal_code, country, id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Tenant non trouvé' });
    }

    await req.logSuperAdminAction('update_tenant', 'tenant', id);

    res.json({ success: true, tenant: rows[0], message: 'Client mis à jour' });

  } catch (error) {
    console.error('❌ Erreur mise à jour tenant:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /super-admin/tenants/:id
// Supprimer définitivement un client et toutes ses données
router.delete('/tenants/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier que le tenant existe
    const tenant = await queryOne('SELECT * FROM tenants WHERE id = $1', [id]);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant non trouvé' });
    }

    // Supprimer le tenant (CASCADE supprimera toutes les données liées)
    await q('DELETE FROM tenants WHERE id = $1', [id]);

    await req.logSuperAdminAction('delete_tenant', 'tenant', id, {
      tenant_name: tenant.name,
      tenant_email: tenant.billing_email
    });

    res.json({ success: true, message: 'Client supprimé définitivement' });

  } catch (error) {
    console.error('❌ Erreur suppression tenant:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /super-admin/tenants/:id/gift-credits
// Offrir des crédits gratuits à un client
router.post('/tenants/:id/gift-credits', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Montant invalide' });
    }

    // Vérifier que le tenant existe
    const tenant = await queryOne('SELECT * FROM tenants WHERE id = $1', [id]);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant non trouvé' });
    }

    // Ajouter les crédits
    const { rows } = await q(
      `UPDATE tenant_lead_credits
       SET remaining_credits = remaining_credits + $1,
           total_credits = total_credits + $1,
           updated_at = NOW()
       WHERE tenant_id = $2
       RETURNING *`,
      [amount, id]
    );

    // Si pas de ligne existante, créer
    if (!rows.length) {
      await q(
        `INSERT INTO tenant_lead_credits (tenant_id, total_credits, remaining_credits, expires_at)
         VALUES ($1, $2, $2, NOW() + INTERVAL '1 year')`,
        [id, amount]
      );
    }

    await req.logSuperAdminAction('gift_credits', 'tenant', id, {
      amount,
      tenant_name: tenant.name
    });

    res.json({ success: true, message: `${amount} crédits offerts à ${tenant.name}` });

  } catch (error) {
    console.error('❌ Erreur cadeau crédits:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /super-admin/tenants/:id/refund
// Créer un remboursement pour un client
router.post('/tenants/:id/refund', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, reason } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Montant invalide' });
    }

    // Vérifier que le tenant existe
    const tenant = await queryOne('SELECT * FROM tenants WHERE id = $1', [id]);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant non trouvé' });
    }

    // Créer un paiement de remboursement
    await q(
      `INSERT INTO payments (tenant_id, amount, currency, method, status, notes, paid_at)
       VALUES ($1, $2, 'EUR', 'refund', 'completed', $3, NOW())`,
      [id, -Math.abs(amount), reason || 'Remboursement manuel']
    );

    await req.logSuperAdminAction('refund_client', 'tenant', id, {
      amount,
      reason,
      tenant_name: tenant.name
    });

    res.json({ success: true, message: `Remboursement de ${amount}€ créé pour ${tenant.name}` });

  } catch (error) {
    console.error('❌ Erreur remboursement:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// GESTION PLANS D'ABONNEMENT
// ========================================

// GET /super-admin/plans
router.get('/plans', async (req, res) => {
  try {
    const plans = await queryAll(
      `SELECT * FROM subscription_plans ORDER BY sort_order, created_at`
    );
    res.json({ success: true, plans });
  } catch (error) {
    console.error('❌ Erreur liste plans:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /super-admin/plans
const createPlanSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  price_monthly: z.number().min(0).optional(),
  price_yearly: z.number().min(0).optional(),
  features: z.object({}).passthrough(),
  is_public: z.boolean().default(true),
  sort_order: z.number().default(0)
});

router.post('/plans', async (req, res) => {
  try {
    const data = createPlanSchema.parse(req.body);

    const plan = await queryOne(
      `INSERT INTO subscription_plans
       (name, slug, description, price_monthly, price_yearly, features, is_public, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [data.name, data.slug, data.description, data.price_monthly, data.price_yearly,
       JSON.stringify(data.features), data.is_public, data.sort_order]
    );

    await req.logSuperAdminAction('create_plan', 'subscription_plan', plan.id, data);

    res.status(201).json({ success: true, plan });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation échouée', details: error.errors });
    }
    console.error('❌ Erreur création plan:', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /super-admin/plans/:id
router.patch('/plans/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price_monthly, price_yearly, features, is_active, is_public, sort_order } = req.body;

    const updateFields = [];
    const updateParams = [];
    let paramIndex = 1;

    if (name) {
      updateFields.push(`name = $${paramIndex++}`);
      updateParams.push(name);
    }
    if (description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      updateParams.push(description);
    }
    if (price_monthly !== undefined) {
      updateFields.push(`price_monthly = $${paramIndex++}`);
      updateParams.push(price_monthly);
    }
    if (price_yearly !== undefined) {
      updateFields.push(`price_yearly = $${paramIndex++}`);
      updateParams.push(price_yearly);
    }
    if (features) {
      updateFields.push(`features = $${paramIndex++}`);
      updateParams.push(JSON.stringify(features));
    }
    if (is_active !== undefined) {
      updateFields.push(`is_active = $${paramIndex++}`);
      updateParams.push(is_active);
    }
    if (is_public !== undefined) {
      updateFields.push(`is_public = $${paramIndex++}`);
      updateParams.push(is_public);
    }
    if (sort_order !== undefined) {
      updateFields.push(`sort_order = $${paramIndex++}`);
      updateParams.push(sort_order);
    }

    updateFields.push(`updated_at = NOW()`);
    updateParams.push(id);

    const { rows } = await q(
      `UPDATE subscription_plans SET ${updateFields.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      updateParams
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Plan non trouvé' });
    }

    await req.logSuperAdminAction('update_plan', 'subscription_plan', id, req.body);

    res.json({ success: true, plan: rows[0] });

  } catch (error) {
    console.error('❌ Erreur modification plan:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// GESTION ABONNEMENTS
// ========================================

// GET /super-admin/subscriptions
router.get('/subscriptions', async (req, res) => {
  try {
    const { status, plan, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '1=1';
    const params = [];
    let paramIndex = 1;

    if (status) {
      whereClause += ` AND ts.status = $${paramIndex++}`;
      params.push(status);
    }

    if (plan) {
      whereClause += ` AND sp.slug = $${paramIndex++}`;
      params.push(plan);
    }

    const { rows } = await q(
      `SELECT
        ts.*,
        t.name as tenant_name,
        t.billing_email as tenant_email,
        sp.name as plan_name
       FROM tenant_subscriptions ts
       LEFT JOIN tenants t ON ts.tenant_id = t.id
       LEFT JOIN subscription_plans sp ON ts.plan_id = sp.id
       WHERE ${whereClause}
       ORDER BY ts.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    const { rows: countRows } = await q(
      `SELECT COUNT(*) as total
       FROM tenant_subscriptions ts
       LEFT JOIN subscription_plans sp ON ts.plan_id = sp.id
       WHERE ${whereClause}`,
      params
    );

    res.json({
      success: true,
      subscriptions: rows,
      total: parseInt(countRows[0].total),
      page: parseInt(page),
      limit: parseInt(limit)
    });

  } catch (error) {
    console.error('❌ Erreur liste abonnements:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /super-admin/subscriptions
// Créer un abonnement pour un tenant
const createSubscriptionSchema = z.object({
  tenant_id: z.string().uuid(),
  plan_id: z.string().uuid(),
  billing_cycle: z.enum(['monthly', 'yearly']),
  start_date: z.string().optional(),
  price: z.number().min(0).optional(), // Si négocié
  auto_renew: z.boolean().default(true)
});

router.post('/subscriptions', async (req, res) => {
  try {
    const data = createSubscriptionSchema.parse(req.body);

    // Récupérer le plan
    const plan = await queryOne(
      `SELECT * FROM subscription_plans WHERE id = $1`,
      [data.plan_id]
    );

    if (!plan) {
      return res.status(404).json({ error: 'Plan non trouvé' });
    }

    // Calculer le prix
    const price = data.price || (data.billing_cycle === 'monthly' ? plan.price_monthly : plan.price_yearly);

    // Calculer MRR/ARR
    const mrr = data.billing_cycle === 'monthly' ? price : price / 12;
    const arr = data.billing_cycle === 'yearly' ? price : price * 12;

    // Calculer end_date
    const startDate = data.start_date || new Date().toISOString().split('T')[0];
    const endDate = new Date(startDate);
    if (data.billing_cycle === 'monthly') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    const subscription = await queryOne(
      `INSERT INTO tenant_subscriptions
       (tenant_id, plan_id, status, start_date, end_date, billing_cycle, price, mrr, arr, auto_renew)
       VALUES ($1, $2, 'active', $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [data.tenant_id, data.plan_id, startDate, endDate, data.billing_cycle, price, mrr, arr, data.auto_renew]
    );

    // Mettre à jour le tenant
    await q(
      `UPDATE tenants
       SET status = 'active', current_plan_id = $1
       WHERE id = $2`,
      [data.plan_id, data.tenant_id]
    );

    await req.logSuperAdminAction('create_subscription', 'subscription', subscription.id, data);

    res.status(201).json({ success: true, subscription });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation échouée', details: error.errors });
    }
    console.error('❌ Erreur création abonnement:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /super-admin/subscriptions/:id/cancel
router.post('/subscriptions/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;

    const { rows } = await q(
      `UPDATE tenant_subscriptions
       SET status = 'cancelled',
           cancelled_at = NOW(),
           auto_renew = false,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Abonnement non trouvé' });
    }

    await req.logSuperAdminAction('cancel_subscription', 'subscription', id);

    res.json({ success: true, subscription: rows[0] });

  } catch (error) {
    console.error('❌ Erreur annulation abonnement:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// GESTION FACTURES
// ========================================

// GET /super-admin/invoices
router.get('/invoices', async (req, res) => {
  try {
    const { status, tenant_id, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '1=1';
    const params = [];
    let paramIndex = 1;

    if (status) {
      whereClause += ` AND i.status = $${paramIndex++}`;
      params.push(status);
    }

    if (tenant_id) {
      whereClause += ` AND i.tenant_id = $${paramIndex++}`;
      params.push(tenant_id);
    }

    const { rows } = await q(
      `SELECT
        i.*,
        t.name as tenant_name,
        t.billing_email as tenant_email,
        sp.name as plan_name
       FROM invoices i
       LEFT JOIN tenant_subscriptions ts ON i.subscription_id = ts.id
       LEFT JOIN tenants t ON ts.tenant_id = t.id
       LEFT JOIN subscription_plans sp ON ts.plan_id = sp.id
       WHERE ${whereClause}
       ORDER BY i.issue_date DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, limit, offset]
    );

    const { rows: countRows } = await q(
      `SELECT COUNT(*) as total FROM invoices i WHERE ${whereClause}`,
      params
    );

    res.json({
      success: true,
      invoices: rows,
      total: parseInt(countRows[0].total),
      page: parseInt(page),
      limit: parseInt(limit)
    });

  } catch (error) {
    console.error('❌ Erreur liste factures:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /super-admin/invoices
// Créer une facture
const createInvoiceSchema = z.object({
  tenant_id: z.string().uuid(),
  subscription_id: z.string().uuid().optional(),
  items: z.array(z.object({
    description: z.string(),
    quantity: z.number(),
    unit_price: z.number(),
    total: z.number()
  })),
  tax_rate: z.number().default(20),
  due_days: z.number().default(30)
});

router.post('/invoices', async (req, res) => {
  try {
    const data = createInvoiceSchema.parse(req.body);

    // Calculer totaux
    const subtotal = data.items.reduce((sum, item) => sum + item.total, 0);
    const tax_amount = subtotal * (data.tax_rate / 100);
    const total = subtotal + tax_amount;

    // Générer numéro de facture
    const { rows: invoiceNumRows } = await q(`SELECT generate_invoice_number() as num`);
    const invoice_number = invoiceNumRows[0].num;

    // Dates
    const issue_date = new Date().toISOString().split('T')[0];
    const due_date = new Date();
    due_date.setDate(due_date.getDate() + data.due_days);

    const invoice = await queryOne(
      `INSERT INTO invoices
       (tenant_id, subscription_id, invoice_number, subtotal, tax_rate, tax_amount, total,
        status, issue_date, due_date, items)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft', $8, $9, $10)
       RETURNING *`,
      [data.tenant_id, data.subscription_id, invoice_number, subtotal, data.tax_rate, tax_amount,
       total, issue_date, due_date, JSON.stringify(data.items)]
    );

    await req.logSuperAdminAction('create_invoice', 'invoice', invoice.id, data);

    res.status(201).json({ success: true, invoice });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation échouée', details: error.errors });
    }
    console.error('❌ Erreur création facture:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /super-admin/invoices/:id/mark-paid
router.post('/invoices/:id/mark-paid', async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_method, payment_reference } = req.body;

    const { rows } = await q(
      `UPDATE invoices
       SET status = 'paid',
           paid_at = NOW(),
           payment_method = $2,
           payment_reference = $3,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, payment_method, payment_reference]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Facture non trouvée' });
    }

    await req.logSuperAdminAction('mark_invoice_paid', 'invoice', id, { payment_method });

    res.json({ success: true, invoice: rows[0] });

  } catch (error) {
    console.error('❌ Erreur marquer facture payée:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// ENDPOINTS SUPPLÉMENTAIRES SUBSCRIPTIONS
// ========================================

// GET /super-admin/subscriptions/stats
router.get('/subscriptions/stats', async (req, res) => {
  try {
    const { rows } = await q(`
      SELECT
        COALESCE(SUM(CASE WHEN status = 'active' OR status = 'trial' THEN mrr ELSE 0 END), 0)::decimal as mrr,
        COALESCE(SUM(CASE WHEN status = 'active' OR status = 'trial' THEN arr ELSE 0 END), 0)::decimal as arr,
        COUNT(CASE WHEN status = 'active' THEN 1 END)::int as active,
        COUNT(CASE WHEN status = 'trial' THEN 1 END)::int as trial,
        COUNT(CASE WHEN status = 'suspended' THEN 1 END)::int as suspended,
        COUNT(CASE WHEN status = 'expired' THEN 1 END)::int as expired
      FROM tenant_subscriptions
    `);

    res.json({ success: true, stats: rows[0] });
  } catch (error) {
    console.error('❌ Erreur stats abonnements:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /super-admin/subscriptions/:id/renew
router.post('/subscriptions/:id/renew', async (req, res) => {
  try {
    const { id } = req.params;

    // Récupérer l'abonnement actuel
    const { rows: subs } = await q(
      'SELECT * FROM tenant_subscriptions WHERE id = $1',
      [id]
    );

    if (!subs.length) {
      return res.status(404).json({ error: 'Abonnement non trouvé' });
    }

    const sub = subs[0];
    const newStartDate = new Date();
    const newEndDate = new Date();

    if (sub.billing_cycle === 'monthly') {
      newEndDate.setMonth(newEndDate.getMonth() + 1);
    } else {
      newEndDate.setFullYear(newEndDate.getFullYear() + 1);
    }

    const { rows } = await q(
      `UPDATE tenant_subscriptions
       SET status = 'active',
           start_date = $1,
           end_date = $2,
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [newStartDate, newEndDate, id]
    );

    await req.logSuperAdminAction('renew_subscription', 'subscription', id);

    res.json({ success: true, subscription: rows[0] });

  } catch (error) {
    console.error('❌ Erreur renouvellement abonnement:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /super-admin/subscriptions/:id/suspend
router.post('/subscriptions/:id/suspend', async (req, res) => {
  try {
    const { id } = req.params;

    const { rows } = await q(
      `UPDATE tenant_subscriptions
       SET status = 'suspended',
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Abonnement non trouvé' });
    }

    await req.logSuperAdminAction('suspend_subscription', 'subscription', id);

    res.json({ success: true, subscription: rows[0] });

  } catch (error) {
    console.error('❌ Erreur suspension abonnement:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /super-admin/subscriptions/:id/activate
router.post('/subscriptions/:id/activate', async (req, res) => {
  try {
    const { id } = req.params;

    const { rows } = await q(
      `UPDATE tenant_subscriptions
       SET status = 'active',
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Abonnement non trouvé' });
    }

    await req.logSuperAdminAction('activate_subscription', 'subscription', id);

    res.json({ success: true, subscription: rows[0] });

  } catch (error) {
    console.error('❌ Erreur activation abonnement:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// ENDPOINTS SUPPLÉMENTAIRES FACTURES
// ========================================

// GET /super-admin/invoices/stats
router.get('/invoices/stats', async (req, res) => {
  try {
    const { rows } = await q(`
      SELECT
        COALESCE(SUM(total), 0)::decimal as total_billed,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN total ELSE 0 END), 0)::decimal as total_paid,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN total ELSE 0 END), 0)::decimal as total_pending,
        COALESCE(SUM(CASE WHEN status = 'overdue' THEN total ELSE 0 END), 0)::decimal as total_overdue,
        COUNT(CASE WHEN status = 'paid' THEN 1 END)::int as count_paid,
        COUNT(CASE WHEN status = 'pending' THEN 1 END)::int as count_pending,
        COUNT(CASE WHEN status = 'overdue' THEN 1 END)::int as count_overdue
      FROM invoices
    `);

    res.json({ success: true, stats: rows[0] });
  } catch (error) {
    console.error('❌ Erreur stats factures:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /super-admin/invoices/:id/send-reminder
router.post('/invoices/:id/send-reminder', async (req, res) => {
  try {
    const { id } = req.params;

    // Récupérer la facture avec infos tenant
    const { rows } = await q(
      `SELECT i.*, t.name as tenant_name, t.billing_email as tenant_email
       FROM invoices i
       JOIN tenant_subscriptions ts ON i.subscription_id = ts.id
       JOIN tenants t ON ts.tenant_id = t.id
       WHERE i.id = $1
       LIMIT 1`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Facture non trouvée' });
    }

    const invoice = rows[0];

    // TODO: Implémenter envoi email avec Nodemailer
    console.log('📧 Envoi rappel facture à:', invoice.tenant_email);

    await req.logSuperAdminAction('send_invoice_reminder', 'invoice', id);

    res.json({ success: true, message: 'Rappel envoyé' });

  } catch (error) {
    console.error('❌ Erreur envoi rappel:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /super-admin/invoices/:id/pdf
router.get('/invoices/:id/pdf', async (req, res) => {
  try {
    const { id } = req.params;

    // Récupérer la facture
    const { rows } = await q(
      `SELECT i.*, t.name as tenant_name, t.billing_email as tenant_email,
              sp.name as plan_name
       FROM invoices i
       JOIN tenant_subscriptions ts ON i.subscription_id = ts.id
       JOIN tenants t ON ts.tenant_id = t.id
       JOIN subscription_plans sp ON ts.plan_id = sp.id
       WHERE i.id = $1`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Facture non trouvée' });
    }

    const invoice = rows[0];

    // TODO: Générer PDF avec une bibliothèque comme PDFKit ou Puppeteer
    // Pour l'instant, retourner les données JSON
    res.json({
      success: true,
      invoice,
      message: 'Génération PDF à implémenter avec PDFKit ou Puppeteer'
    });

  } catch (error) {
    console.error('❌ Erreur génération PDF:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// ACTIVITY LOG
// ========================================

// GET /super-admin/activity-log
router.get('/activity-log', async (req, res) => {
  try {
    const { user_id, action, page = 1, limit = 100 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '1=1';
    const params = [];
    let paramIndex = 1;

    if (user_id) {
      whereClause += ` AND sal.user_id = $${paramIndex++}`;
      params.push(user_id);
    }

    if (action) {
      whereClause += ` AND sal.action ILIKE $${paramIndex++}`;
      params.push(`%${action}%`);
    }

    const { rows } = await q(
      `SELECT
        sal.*,
        u.email as user_email,
        u.first_name,
        u.last_name
       FROM super_admin_activity_log sal
       LEFT JOIN users u ON sal.user_id = u.id
       WHERE ${whereClause}
       ORDER BY sal.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, limit, offset]
    );

    res.json({ success: true, logs: rows });

  } catch (error) {
    console.error('❌ Erreur activity log:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
