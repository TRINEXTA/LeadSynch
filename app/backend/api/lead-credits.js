import { log, error, warn } from "../lib/logger.js";
import express from 'express';
import { query as q } from '../lib/db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Toutes les routes nécessitent l'authentification
router.use(authMiddleware);

// Prix par lead - TARIF UNIQUE
const PRICE_PER_LEAD = 0.10; // Prix unique par lead (peu importe la source)

/**
 * GET /api/lead-credits
 * Récupère les crédits disponibles du tenant
 */
router.get('/', async (req, res) => {
  try {
    const { tenant_id: tenantId } = req.user;

    const { rows } = await q(
      `SELECT * FROM lead_credits WHERE tenant_id = $1`,
      [tenantId]
    );

    if (rows.length === 0) {
      // Initialiser si n'existe pas
      const { rows: newRows } = await q(
        `INSERT INTO lead_credits (tenant_id, credits_remaining)
         VALUES ($1, 0)
         RETURNING *`,
        [tenantId]
      );
      return res.json({ credits: newRows[0] });
    }

    res.json({ credits: rows[0] });
  } catch (error) {
    error('Erreur récupération crédits:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
});

/**
 * GET /api/lead-credits/history
 * Historique des achats de crédits
 */
router.get('/history', async (req, res) => {
  try {
    const { tenant_id: tenantId } = req.user;

    const { rows } = await q(
      `SELECT * FROM credit_purchases
       WHERE tenant_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [tenantId]
    );

    res.json({ purchases: rows });
  } catch (error) {
    error('Erreur historique crédits:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
});

/**
 * GET /api/lead-credits/usage
 * Historique de consommation des crédits
 */
router.get('/usage', async (req, res) => {
  try {
    const { tenant_id: tenantId } = req.user;
    const { limit = 100 } = req.query;

    const { rows } = await q(
      `SELECT
        cu.*,
        l.company_name,
        l.email,
        l.city
       FROM credit_usage cu
       LEFT JOIN leads l ON cu.lead_id = l.id
       WHERE cu.tenant_id = $1
       ORDER BY cu.created_at DESC
       LIMIT $2`,
      [tenantId, limit]
    );

    // Statistiques
    const { rows: stats } = await q(
      `SELECT
        source,
        COUNT(*) as count,
        SUM(cost_euros) as total_cost
       FROM credit_usage
       WHERE tenant_id = $1
       GROUP BY source`,
      [tenantId]
    );

    res.json({
      usage: rows,
      stats: stats.reduce((acc, stat) => {
        acc[stat.source] = {
          count: parseInt(stat.count),
          total_cost: parseFloat(stat.total_cost)
        };
        return acc;
      }, {})
    });
  } catch (error) {
    error('Erreur usage crédits:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
});

/**
 * POST /api/lead-credits/purchase
 * Acheter des crédits supplémentaires
 */
router.post('/purchase', async (req, res) => {
  try {
    const { tenant_id: tenantId } = req.user;
    const { credits_amount, payment_method = 'stripe' } = req.body;

    if (!credits_amount || credits_amount <= 0) {
      return res.status(400).json({
        error: 'Montant invalide',
        message: 'Le nombre de crédits doit être supérieur à 0'
      });
    }

    // Prix dégressif par quantité
    let pricePerLead = 0.05; // Prix moyen
    if (credits_amount >= 5000) pricePerLead = 0.035;
    else if (credits_amount >= 1000) pricePerLead = 0.04;
    else if (credits_amount >= 500) pricePerLead = 0.045;

    const totalPrice = credits_amount * pricePerLead;

    // TODO: Intégrer Stripe pour le paiement réel
    // Pour l'instant, auto-compléter l'achat en mode démo

    // Créer l'achat
    const { rows } = await q(
      `INSERT INTO credit_purchases (
        tenant_id, amount_credits, amount_euros, price_per_lead,
        payment_method, status, payment_id
      ) VALUES ($1, $2, $3, $4, $5, 'completed', $6)
      RETURNING *`,
      [tenantId, credits_amount, totalPrice, pricePerLead, payment_method, `demo_${Date.now()}`]
    );

    const purchase = rows[0];

    // Ajouter les crédits au tenant
    // D'abord vérifier si le tenant a déjà un enregistrement de crédits
    const { rows: existingCredits } = await q(
      `SELECT * FROM lead_credits WHERE tenant_id = $1`,
      [tenantId]
    );

    if (existingCredits.length > 0) {
      // Mettre à jour l'enregistrement existant
      await q(
        `UPDATE lead_credits
         SET credits_remaining = credits_remaining + $1,
             credits_purchased = credits_purchased + $1,
             last_purchase_at = NOW(),
             updated_at = NOW()
         WHERE tenant_id = $2`,
        [credits_amount, tenantId]
      );
    } else {
      // Créer un nouvel enregistrement
      await q(
        `INSERT INTO lead_credits (tenant_id, credits_remaining, credits_purchased, last_purchase_at)
         VALUES ($1, $2, $2, NOW())`,
        [tenantId, credits_amount]
      );
    }

    // Récupérer les crédits mis à jour
    const { rows: updatedCredits } = await q(
      `SELECT * FROM lead_credits WHERE tenant_id = $1`,
      [tenantId]
    );

    res.json({
      message: 'Achat complété avec succès',
      purchase: purchase,
      total_price: totalPrice,
      credits_added: credits_amount,
      credits_remaining: updatedCredits[0].credits_remaining
    });
  } catch (error) {
    error('Erreur achat crédits:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
});

/**
 * POST /api/lead-credits/complete-purchase
 * Finaliser un achat après paiement Stripe
 */
router.post('/complete-purchase/:purchase_id', async (req, res) => {
  try {
    const { tenant_id: tenantId } = req.user;
    const { purchase_id } = req.params;
    const { payment_id } = req.body;

    // Vérifier que l'achat appartient au tenant
    const { rows: purchases } = await q(
      `SELECT * FROM credit_purchases WHERE id = $1 AND tenant_id = $2`,
      [purchase_id, tenantId]
    );

    if (purchases.length === 0) {
      return res.status(404).json({ error: 'Achat non trouvé' });
    }

    const purchase = purchases[0];

    if (purchase.status === 'completed') {
      return res.status(400).json({ error: 'Achat déjà finalisé' });
    }

    // Marquer comme payé
    await q(
      `UPDATE credit_purchases
       SET status = 'completed', payment_id = $1
       WHERE id = $2`,
      [payment_id, purchase_id]
    );

    // Ajouter les crédits au tenant
    await q(
      `UPDATE lead_credits
       SET credits_remaining = credits_remaining + $1,
           credits_purchased = credits_purchased + $1,
           last_purchase_at = NOW(),
           updated_at = NOW()
       WHERE tenant_id = $2`,
      [purchase.amount_credits, tenantId]
    );

    // Créer si n'existe pas
    await q(
      `INSERT INTO lead_credits (tenant_id, credits_remaining, credits_purchased, last_purchase_at)
       VALUES ($1, $2, $2, NOW())
       ON CONFLICT (tenant_id) DO NOTHING`,
      [tenantId, purchase.amount_credits]
    );

    res.json({
      message: 'Achat finalisé avec succès',
      credits_added: purchase.amount_credits
    });
  } catch (error) {
    error('Erreur finalisation achat:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
});

/**
 * POST /api/lead-credits/consume
 * Consommer des crédits (utilisé en interne par generate-leads)
 */
router.post('/consume', async (req, res) => {
  try {
    const { tenant_id: tenantId } = req.user;
    const { lead_id, source } = req.body; // source: 'database' ou 'google_maps'

    if (!['database', 'google_maps'].includes(source)) {
      return res.status(400).json({ error: 'Source invalide' });
    }

    const cost = PRICE_PER_LEAD; // Tarif unique quelle que soit la source

    // Vérifier les crédits disponibles
    const { rows: credits } = await q(
      `SELECT * FROM lead_credits WHERE tenant_id = $1`,
      [tenantId]
    );

    if (credits.length === 0 || credits[0].credits_remaining <= 0) {
      return res.status(402).json({
        error: 'Crédits insuffisants',
        message: 'Vous n\'avez plus de crédits. Veuillez acheter des crédits supplémentaires.'
      });
    }

    // Consommer 1 crédit
    await q(
      `UPDATE lead_credits
       SET credits_remaining = credits_remaining - 1,
           credits_used = credits_used + 1,
           updated_at = NOW()
       WHERE tenant_id = $1`,
      [tenantId]
    );

    // Enregistrer l'usage
    await q(
      `INSERT INTO credit_usage (tenant_id, lead_id, credits_used, source, cost_euros)
       VALUES ($1, $2, 1, $3, $4)`,
      [tenantId, lead_id, source, cost]
    );

    res.json({
      message: 'Crédit consommé',
      credits_remaining: credits[0].credits_remaining - 1,
      cost_euros: cost
    });
  } catch (error) {
    error('Erreur consommation crédit:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
});

/**
 * GET /api/lead-credits/pricing
 * Récupère la grille tarifaire
 */
router.get('/pricing', (req, res) => {
  res.json({
    price_per_lead: PRICE_PER_LEAD,
    packs: [
      { credits: 100, price_per_lead: 0.10, total: 10, savings: 0 },
      { credits: 500, price_per_lead: 0.09, total: 45, savings: 10 },
      { credits: 1000, price_per_lead: 0.08, total: 80, savings: 20 },
      { credits: 5000, price_per_lead: 0.07, total: 350, savings: 30 }
    ]
  });
});

export default router;
