import { log, error, warn } from "../lib/logger.js";
import express from 'express';
import { query as q } from '../lib/db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Toutes les routes nécessitent l'authentification
router.use(authMiddleware);

/**
 * GET /api/services
 * Récupère tous les services disponibles du tenant
 */
router.get('/', async (req, res) => {
  try {
    const { tenant_id: tenantId } = req.user;
    const { category, is_active } = req.query;

    let query = 'SELECT * FROM services WHERE tenant_id = $1';
    const params = [tenantId];

    if (category) {
      query += ' AND category = $2';
      params.push(category);
    }

    if (is_active !== undefined) {
      query += ` AND is_active = $${params.length + 1}`;
      params.push(is_active === 'true');
    }

    query += ' ORDER BY category, name';

    const { rows } = await q(query, params);

    res.json({ services: rows });
  } catch (error) {
    error('Erreur récupération services:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
});

/**
 * GET /api/services/:id
 * Récupère un service spécifique
 */
router.get('/:id', async (req, res) => {
  try {
    const { tenant_id: tenantId } = req.user;
    const { id } = req.params;

    const { rows } = await q(
      'SELECT * FROM services WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Service non trouvé' });
    }

    res.json({ service: rows[0] });
  } catch (error) {
    error('Erreur récupération service:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
});

/**
 * POST /api/services
 * Créer un nouveau service
 */
router.post('/', async (req, res) => {
  try {
    const { tenant_id: tenantId } = req.user;
    const {
      name,
      description,
      category,
      price_type,
      base_price,
      currency = 'EUR',
      billing_cycle,
      features,
      metadata
    } = req.body;

    if (!name || !price_type) {
      return res.status(400).json({
        error: 'Données manquantes',
        message: 'Le nom et le type de prix sont requis'
      });
    }

    const { rows } = await q(
      `INSERT INTO services (
        tenant_id, name, description, category, price_type,
        base_price, currency, billing_cycle, features, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        tenantId,
        name,
        description,
        category,
        price_type,
        base_price,
        currency,
        billing_cycle,
        features ? JSON.stringify(features) : null,
        metadata ? JSON.stringify(metadata) : null
      ]
    );

    res.status(201).json({
      message: 'Service créé avec succès',
      service: rows[0]
    });
  } catch (error) {
    error('Erreur création service:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
});

/**
 * PATCH /api/services/:id
 * Mettre à jour un service
 */
router.patch('/:id', async (req, res) => {
  try {
    const { tenant_id: tenantId } = req.user;
    const { id } = req.params;

    // Vérifier que le service appartient au tenant
    const { rows: existing } = await q(
      'SELECT id FROM services WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Service non trouvé' });
    }

    const updates = [];
    const values = [];
    let paramIndex = 1;

    const allowedFields = [
      'name', 'description', 'category', 'price_type', 'base_price',
      'currency', 'billing_cycle', 'is_active', 'features', 'metadata'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = $${paramIndex}`);

        if (field === 'features' || field === 'metadata') {
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
      `UPDATE services
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
       RETURNING *`,
      values
    );

    res.json({
      message: 'Service mis à jour avec succès',
      service: rows[0]
    });
  } catch (error) {
    error('Erreur mise à jour service:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
});

/**
 * DELETE /api/services/:id
 * Supprimer un service
 */
router.delete('/:id', async (req, res) => {
  try {
    const { tenant_id: tenantId } = req.user;
    const { id } = req.params;

    // Vérifier s'il y a des abonnements actifs liés à ce service
    const { rows: activeSubscriptions } = await q(
      `SELECT COUNT(*) as count
       FROM subscriptions
       WHERE service_id = $1 AND status = 'active'`,
      [id]
    );

    if (parseInt(activeSubscriptions[0].count) > 0) {
      return res.status(400).json({
        error: 'Impossible de supprimer',
        message: 'Ce service a des abonnements actifs. Désactivez-le plutôt que de le supprimer.'
      });
    }

    await q(
      'DELETE FROM services WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    res.json({ message: 'Service supprimé avec succès' });
  } catch (error) {
    error('Erreur suppression service:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
});

/**
 * GET /api/services/stats/summary
 * Statistiques des services
 */
router.get('/stats/summary', async (req, res) => {
  try {
    const { tenant_id: tenantId } = req.user;

    // Nombre total de services
    const { rows: totalServices } = await q(
      'SELECT COUNT(*) as count, category FROM services WHERE tenant_id = $1 GROUP BY category',
      [tenantId]
    );

    // Nombre d'abonnements par service
    const { rows: subscriptionsByService } = await q(
      `SELECT
        s.id,
        s.name,
        s.category,
        COUNT(sub.id) as active_subscriptions,
        SUM(sub.price) as monthly_revenue
       FROM services s
       LEFT JOIN subscriptions sub ON s.id = sub.service_id AND sub.status = 'active'
       WHERE s.tenant_id = $1
       GROUP BY s.id, s.name, s.category
       ORDER BY active_subscriptions DESC`,
      [tenantId]
    );

    res.json({
      total_services: totalServices,
      subscriptions_by_service: subscriptionsByService
    });
  } catch (error) {
    error('Erreur stats services:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
});

export default router;
