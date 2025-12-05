import { log, error, warn } from "../lib/logger.js";
import express from 'express';
import { query as q } from '../lib/db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Toutes les routes nécessitent l'authentification
router.use(authMiddleware);

/**
 * GET /api/billing/subscription
 * Récupère l'abonnement actuel du tenant
 */
router.get('/subscription', async (req, res) => {
  try {
    const { tenant_id: tenantId } = req.user;

    const { rows: tenantRows } = await q(
      `SELECT plan, stripe_customer_id, stripe_subscription_id, subscription_status
       FROM tenants
       WHERE id = $1`,
      [tenantId]
    );

    if (tenantRows.length === 0) {
      return res.status(404).json({ error: 'Tenant non trouvé' });
    }

    const tenant = tenantRows[0];

    // Récupérer l'historique des abonnements
    const { rows: history } = await q(
      `SELECT * FROM subscription_history
       WHERE tenant_id = $1
       ORDER BY created_at DESC
       LIMIT 10`,
      [tenantId]
    );

    res.json({
      subscription: {
        plan: tenant.plan || 'FREE',
        status: tenant.subscription_status || 'active',
        stripe_customer_id: tenant.stripe_customer_id,
        stripe_subscription_id: tenant.stripe_subscription_id
      },
      history
    });
  } catch (error) {
    error('Erreur récupération abonnement:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
});

/**
 * GET /api/billing/invoices
 * Récupère les factures du tenant
 */
router.get('/invoices', async (req, res) => {
  try {
    const { tenant_id: tenantId } = req.user;

    const { rows } = await q(
      `SELECT * FROM invoices
       WHERE tenant_id = $1
       ORDER BY created_at DESC`,
      [tenantId]
    );

    res.json({ invoices: rows });
  } catch (error) {
    error('Erreur récupération factures:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
});

/**
 * GET /api/billing/info
 * Récupère les informations de facturation
 */
router.get('/info', async (req, res) => {
  try {
    const { tenant_id: tenantId } = req.user;

    const { rows } = await q(
      `SELECT * FROM billing_info
       WHERE tenant_id = $1`,
      [tenantId]
    );

    if (rows.length === 0) {
      return res.json({ billing_info: null });
    }

    res.json({ billing_info: rows[0] });
  } catch (error) {
    error('Erreur récupération info facturation:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
});

/**
 * POST /api/billing/info
 * Met à jour les informations de facturation
 */
router.post('/info', async (req, res) => {
  try {
    const { tenant_id: tenantId } = req.user;
    const {
      company_name,
      siret,
      vat_number,
      address,
      postal_code,
      city,
      country
    } = req.body;

    // Validation
    if (!company_name || !address || !postal_code || !city) {
      return res.status(400).json({
        error: 'Paramètres invalides',
        message: 'Nom de société, adresse, code postal et ville sont requis'
      });
    }

    // Vérifier si des infos existent déjà
    const { rows: existing } = await q(
      `SELECT id FROM billing_info WHERE tenant_id = $1`,
      [tenantId]
    );

    let result;

    if (existing.length > 0) {
      // Mise à jour
      const { rows } = await q(
        `UPDATE billing_info
         SET company_name = $1, siret = $2, vat_number = $3,
             address = $4, postal_code = $5, city = $6, country = $7,
             updated_at = NOW()
         WHERE tenant_id = $8
         RETURNING *`,
        [
          company_name,
          siret || null,
          vat_number || null,
          address,
          postal_code,
          city,
          country || 'FR',
          tenantId
        ]
      );
      result = rows[0];
    } else {
      // Création
      const { rows } = await q(
        `INSERT INTO billing_info (
          tenant_id, company_name, siret, vat_number, address,
          postal_code, city, country
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          tenantId,
          company_name,
          siret || null,
          vat_number || null,
          address,
          postal_code,
          city,
          country || 'FR'
        ]
      );
      result = rows[0];
    }

    res.json({
      message: 'Informations de facturation enregistrées',
      billing_info: result
    });
  } catch (error) {
    error('Erreur mise à jour billing info:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
});

/**
 * POST /api/billing/create-checkout-session
 * Crée une session Stripe Checkout pour upgrader un plan
 */
router.post('/create-checkout-session', async (req, res) => {
  try {
    const { tenant_id: tenantId, email } = req.user;
    const { plan } = req.body;

    if (!['BASIC', 'PRO', 'ENTERPRISE'].includes(plan)) {
      return res.status(400).json({ error: 'Plan invalide' });
    }

    // Prix en fonction du plan (en centimes)
    const prices = {
      BASIC: 4900, // 49€
      PRO: 14900, // 149€
      ENTERPRISE: 49900 // 499€
    };

    // TODO: Intégrer réellement Stripe
    // Pour l'instant, simuler la création d'une session
    const checkoutSessionId = `cs_test_${Date.now()}`;

    res.json({
      sessionId: checkoutSessionId,
      url: `https://checkout.stripe.com/pay/${checkoutSessionId}`,
      message: 'Session Stripe créée (simulation)'
    });
  } catch (error) {
    error('Erreur création session Stripe:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
});

/**
 * POST /api/billing/webhook
 * Webhook Stripe pour gérer les événements de paiement
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    // TODO: Vérifier la signature Stripe
    const event = req.body;

    log('📥 Stripe webhook reçu:', event.type);

    switch (event.type) {
      case 'checkout.session.completed':
        // Mise à jour du plan après paiement réussi
        log('✅ Paiement réussi');
        break;

      case 'customer.subscription.updated':
        log('🔄 Abonnement mis à jour');
        break;

      case 'customer.subscription.deleted':
        log('❌ Abonnement annulé');
        break;

      default:
        log('❓ Événement non géré:', event.type);
    }

    res.json({ received: true });
  } catch (error) {
    error('Erreur webhook Stripe:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
});

/**
 * POST /api/billing/cancel-subscription
 * Annule l'abonnement Stripe
 */
router.post('/cancel-subscription', async (req, res) => {
  try {
    const { tenant_id: tenantId } = req.user;

    const { rows } = await q(
      `SELECT stripe_subscription_id FROM tenants WHERE id = $1`,
      [tenantId]
    );

    if (rows.length === 0 || !rows[0].stripe_subscription_id) {
      return res.status(404).json({ error: 'Aucun abonnement actif' });
    }

    // TODO: Annuler réellement l'abonnement Stripe
    log('🚫 Annulation abonnement Stripe (simulation)');

    // Enregistrer dans l'historique
    await q(
      `INSERT INTO subscription_history (
        tenant_id, plan, action, metadata
      ) VALUES ($1, $2, $3, $4)`,
      [tenantId, 'FREE', 'cancelled', JSON.stringify({ reason: 'user_request' })]
    );

    // Rétrograder au plan FREE
    await q(
      `UPDATE tenants
       SET plan = 'FREE',
           subscription_status = 'cancelled',
           stripe_subscription_id = NULL
       WHERE id = $1`,
      [tenantId]
    );

    res.json({
      message: 'Abonnement annulé avec succès',
      new_plan: 'FREE'
    });
  } catch (error) {
    error('Erreur annulation abonnement:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
});

export default router;
