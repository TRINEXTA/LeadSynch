import { log, error, warn } from "../lib/logger.js";
import express from 'express';
import { query as q } from '../lib/db.js';
import { authMiddleware } from '../middleware/auth.js';
import subscriptionService from '../services/subscriptionService.js';

const router = express.Router();

// Toutes les routes nécessitent l'authentification
router.use(authMiddleware);

/**
 * GET /api/subscriptions
 * Récupère tous les abonnements du tenant
 */
router.get('/', async (req, res) => {
  try {
    const { tenant_id: tenantId } = req.user;
    const { lead_id, status, service_id } = req.query;

    let query = `
      SELECT
        sub.*,
        s.name as service_name,
        s.category as service_category,
        l.company_name,
        l.contact_name,
        l.email,
        u.first_name as created_by_first_name,
        u.last_name as created_by_last_name
      FROM subscriptions sub
      LEFT JOIN services s ON sub.service_id = s.id
      LEFT JOIN leads l ON sub.lead_id = l.id
      LEFT JOIN users u ON sub.created_by = u.id
      WHERE sub.tenant_id = $1
    `;

    const params = [tenantId];
    let paramIndex = 2;

    if (lead_id) {
      query += ` AND sub.lead_id = $${paramIndex}`;
      params.push(lead_id);
      paramIndex++;
    }

    if (status) {
      query += ` AND sub.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (service_id) {
      query += ` AND sub.service_id = $${paramIndex}`;
      params.push(service_id);
      paramIndex++;
    }

    query += ' ORDER BY sub.created_at DESC';

    const { rows } = await q(query, params);

    res.json({ subscriptions: rows });
  } catch (error) {
    error('Erreur récupération abonnements:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
});

/**
 * GET /api/subscriptions/:id
 * Récupère un abonnement spécifique
 */
router.get('/:id', async (req, res) => {
  try {
    const { tenant_id: tenantId } = req.user;
    const { id } = req.params;

    const { rows } = await q(
      `SELECT
        sub.*,
        s.name as service_name,
        s.category as service_category,
        s.features as service_features,
        l.company_name,
        l.contact_name,
        l.email,
        l.phone
      FROM subscriptions sub
      LEFT JOIN services s ON sub.service_id = s.id
      LEFT JOIN leads l ON sub.lead_id = l.id
      WHERE sub.id = $1 AND sub.tenant_id = $2`,
      [id, tenantId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Abonnement non trouvé' });
    }

    // Récupérer l'historique
    const { rows: history } = await q(
      `SELECT
        sh.*,
        u.first_name,
        u.last_name
      FROM subscription_history sh
      LEFT JOIN users u ON sh.changed_by = u.id
      WHERE sh.subscription_id = $1
      ORDER BY sh.created_at DESC`,
      [id]
    );

    res.json({
      subscription: rows[0],
      history
    });
  } catch (error) {
    error('Erreur récupération abonnement:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
});

/**
 * POST /api/subscriptions
 * Créer un nouvel abonnement
 */
router.post('/', async (req, res) => {
  try {
    const { tenant_id: tenantId, id: userId } = req.user;
    const {
      lead_id,
      service_id,
      subscription_name,
      price,
      billing_cycle,
      currency = 'EUR',
      start_date,
      end_date,
      quantity = 1,
      discount_percent = 0,
      discount_amount = 0,
      notes,
      custom_fields
    } = req.body;

    if (!lead_id || !subscription_name || !price) {
      return res.status(400).json({
        error: 'Données manquantes',
        message: 'lead_id, subscription_name et price sont requis'
      });
    }

    // Créer l'abonnement
    const { rows } = await q(
      `INSERT INTO subscriptions (
        tenant_id, lead_id, service_id, subscription_name,
        status, price, billing_cycle, currency,
        start_date, end_date, quantity,
        discount_percent, discount_amount, notes,
        custom_fields, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        tenantId,
        lead_id,
        service_id,
        subscription_name,
        'active',
        price,
        billing_cycle,
        currency,
        start_date,
        end_date,
        quantity,
        discount_percent,
        discount_amount,
        notes,
        custom_fields ? JSON.stringify(custom_fields) : null,
        userId
      ]
    );

    const subscription = rows[0];

    // Créer l'historique
    await q(
      `INSERT INTO subscription_history (
        tenant_id, subscription_id, change_type,
        new_status, new_price, changed_by
      ) VALUES ($1, $2, 'created', 'active', $3, $4)`,
      [tenantId, subscription.id, price, userId]
    );

    res.status(201).json({
      message: 'Abonnement créé avec succès',
      subscription
    });
  } catch (error) {
    error('Erreur création abonnement:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
});

/**
 * PATCH /api/subscriptions/:id
 * Mettre à jour un abonnement
 */
router.patch('/:id', async (req, res) => {
  try {
    const { tenant_id: tenantId, id: userId } = req.user;
    const { id } = req.params;

    // Récupérer l'abonnement actuel
    const { rows: current } = await q(
      'SELECT * FROM subscriptions WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    if (current.length === 0) {
      return res.status(404).json({ error: 'Abonnement non trouvé' });
    }

    const currentSubscription = current[0];
    const updates = [];
    const values = [];
    let paramIndex = 1;

    const allowedFields = [
      'subscription_name', 'status', 'price', 'billing_cycle',
      'currency', 'start_date', 'end_date', 'next_billing_date',
      'quantity', 'discount_percent', 'discount_amount',
      'notes', 'custom_fields'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = $${paramIndex}`);

        if (field === 'custom_fields') {
          values.push(JSON.stringify(req.body[field]));
        } else {
          values.push(req.body[field]);
        }

        paramIndex++;
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });
    }

    values.push(id, tenantId);

    const { rows } = await q(
      `UPDATE subscriptions
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
       RETURNING *`,
      values
    );

    const updatedSubscription = rows[0];

    // Créer l'historique si le statut ou le prix a changé
    if (req.body.status || req.body.price) {
      let changeType = 'updated';
      if (req.body.status === 'cancelled') changeType = 'cancelled';
      if (req.body.status === 'paused') changeType = 'paused';
      if (req.body.status === 'active' && currentSubscription.status !== 'active') changeType = 'activated';
      if (req.body.price && req.body.price !== currentSubscription.price) changeType = 'price_changed';

      await q(
        `INSERT INTO subscription_history (
          tenant_id, subscription_id, change_type,
          old_status, new_status, old_price, new_price,
          changed_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          tenantId,
          id,
          changeType,
          currentSubscription.status,
          updatedSubscription.status,
          currentSubscription.price,
          updatedSubscription.price,
          userId
        ]
      );
    }

    res.json({
      message: 'Abonnement mis à jour avec succès',
      subscription: updatedSubscription
    });
  } catch (error) {
    error('Erreur mise à jour abonnement:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
});

/**
 * DELETE /api/subscriptions/:id
 * Supprimer un abonnement
 */
router.delete('/:id', async (req, res) => {
  try {
    const { tenant_id: tenantId } = req.user;
    const { id } = req.params;

    await q(
      'DELETE FROM subscriptions WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    res.json({ message: 'Abonnement supprimé avec succès' });
  } catch (error) {
    error('Erreur suppression abonnement:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
});

/**
 * GET /api/subscriptions/stats/summary
 * Statistiques des abonnements
 */
router.get('/stats/summary', async (req, res) => {
  try {
    const { tenant_id: tenantId } = req.user;

    // MRR (Monthly Recurring Revenue)
    const { rows: mrrData } = await q(
      `SELECT
        SUM(CASE
          WHEN billing_cycle = 'monthly' THEN price
          WHEN billing_cycle = 'yearly' THEN price / 12
          WHEN billing_cycle = 'quarterly' THEN price / 3
          ELSE 0
        END) as mrr
       FROM subscriptions
       WHERE tenant_id = $1 AND status = 'active'`,
      [tenantId]
    );

    // Abonnements par statut
    const { rows: byStatus } = await q(
      `SELECT status, COUNT(*) as count
       FROM subscriptions
       WHERE tenant_id = $1
       GROUP BY status`,
      [tenantId]
    );

    // Abonnements par service
    const { rows: byService } = await q(
      `SELECT
        s.name as service_name,
        s.category,
        COUNT(sub.id) as count,
        SUM(sub.price) as total_value
       FROM subscriptions sub
       LEFT JOIN services s ON sub.service_id = s.id
       WHERE sub.tenant_id = $1 AND sub.status = 'active'
       GROUP BY s.name, s.category
       ORDER BY count DESC`,
      [tenantId]
    );

    // Prochains renouvellements
    const { rows: upcomingRenewals } = await q(
      `SELECT
        sub.id,
        sub.subscription_name,
        sub.next_billing_date,
        sub.price,
        l.company_name
       FROM subscriptions sub
       LEFT JOIN leads l ON sub.lead_id = l.id
       WHERE sub.tenant_id = $1
         AND sub.status = 'active'
         AND sub.next_billing_date IS NOT NULL
         AND sub.next_billing_date <= CURRENT_DATE + INTERVAL '30 days'
       ORDER BY sub.next_billing_date ASC
       LIMIT 10`,
      [tenantId]
    );

    res.json({
      mrr: parseFloat(mrrData[0]?.mrr || 0),
      by_status: byStatus,
      by_service: byService,
      upcoming_renewals: upcomingRenewals
    });
  } catch (error) {
    error('Erreur stats abonnements:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
});

// ============================================
// NOUVELLES ROUTES - Quotas et Plans Tenant
// ============================================

/**
 * GET /api/subscriptions/quota
 * Récupérer le résumé des quotas du tenant connecté
 */
router.get('/quota', async (req, res) => {
  try {
    const quota = await subscriptionService.getQuotaSummary(req.user.tenant_id);

    if (!quota) {
      return res.status(404).json({
        success: false,
        error: 'Aucun abonnement trouvé'
      });
    }

    res.json({ success: true, data: quota });
  } catch (err) {
    error('Error getting quota:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/subscriptions/plans
 * Récupérer tous les plans disponibles
 */
router.get('/plans', async (req, res) => {
  try {
    const plans = await subscriptionService.getAvailablePlans();
    res.json({ success: true, data: plans });
  } catch (err) {
    error('Error getting plans:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/subscriptions/check-prospects
 * Vérifier si le tenant peut générer X prospects
 */
router.post('/check-prospects', async (req, res) => {
  try {
    const { quantity } = req.body;
    if (!quantity || quantity < 1) {
      return res.status(400).json({ success: false, error: 'Quantité invalide' });
    }

    const result = await subscriptionService.canGenerateProspects(req.user.tenant_id, quantity);
    res.json({ success: true, data: result });
  } catch (err) {
    error('Error checking prospects:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/subscriptions/check-emails
 * Vérifier si le tenant peut envoyer X emails
 */
router.post('/check-emails', async (req, res) => {
  try {
    const { quantity, type = 'campaign' } = req.body;
    if (!quantity || quantity < 1) {
      return res.status(400).json({ success: false, error: 'Quantité invalide' });
    }

    let result;
    if (type === 'followup') {
      result = await subscriptionService.canSendFollowupEmails(req.user.tenant_id, quantity);
    } else {
      result = await subscriptionService.canSendCampaignEmails(req.user.tenant_id, quantity);
    }

    res.json({ success: true, data: result });
  } catch (err) {
    error('Error checking emails:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/subscriptions/usage-mode
 * Changer le mode d'utilisation (our_base, own_base, mixed)
 */
router.put('/usage-mode', async (req, res) => {
  try {
    const { mode } = req.body;
    const result = await subscriptionService.setUsageMode(req.user.tenant_id, mode);
    res.json({ success: true, data: result });
  } catch (err) {
    error('Error setting usage mode:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/subscriptions/credits
 * Récupérer le solde de crédits
 */
router.get('/credits', async (req, res) => {
  try {
    const balance = await subscriptionService.getCreditsBalance(req.user.tenant_id);
    res.json({ success: true, data: { balance } });
  } catch (err) {
    error('Error getting credits:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/subscriptions/credits/history
 * Récupérer l'historique des transactions de crédits
 */
router.get('/credits/history', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const transactions = await subscriptionService.getCreditTransactions(req.user.tenant_id, parseInt(limit));
    res.json({ success: true, data: transactions });
  } catch (err) {
    error('Error getting credit history:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/subscriptions/credits/purchase
 * Acheter des crédits (0.05€/prospect)
 */
router.post('/credits/purchase', async (req, res) => {
  try {
    const { quantity } = req.body;
    if (!quantity || quantity < 100) {
      return res.status(400).json({ success: false, error: 'Minimum 100 crédits' });
    }

    // Calcul du prix avec réductions volume
    let pricePerProspect = 0.05;
    if (quantity >= 10000) pricePerProspect = 0.04;
    else if (quantity >= 5000) pricePerProspect = 0.045;

    const totalPrice = quantity * pricePerProspect;

    // TODO: Intégrer Stripe ici
    const result = await subscriptionService.addCredits(
      req.user.tenant_id,
      quantity,
      totalPrice,
      `manual_${Date.now()}`
    );

    res.json({
      success: true,
      data: { ...result, price_per_prospect: pricePerProspect, total_price: totalPrice }
    });
  } catch (err) {
    error('Error purchasing credits:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/subscriptions/pricing
 * Récupérer les tarifs des crédits
 */
router.get('/pricing', async (req, res) => {
  try {
    const pricing = {
      credits: [
        { quantity: 100, price: 5.00, price_per_prospect: 0.05 },
        { quantity: 500, price: 25.00, price_per_prospect: 0.05 },
        { quantity: 1000, price: 50.00, price_per_prospect: 0.05 },
        { quantity: 5000, price: 225.00, price_per_prospect: 0.045, discount: '10%' },
        { quantity: 10000, price: 400.00, price_per_prospect: 0.04, discount: '20%' }
      ],
      currency: 'EUR'
    };
    res.json({ success: true, data: pricing });
  } catch (err) {
    error('Error getting pricing:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
