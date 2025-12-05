import { log, error, warn } from "../lib/logger.js";
/**
 * API Business Configuration
 * Gestion des produits, CGV et liens de paiement pour les clients
 */

import { Router } from 'express';
import { z } from 'zod';
import { query as q } from '../lib/db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// ========== VALIDATION SCHEMAS ==========

const productSchema = z.object({
  name: z.string().min(1, 'Nom requis').max(255),
  description: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  type: z.enum(['subscription', 'one_time', 'hourly', 'quote']),
  price: z.number().min(0).optional().nullable(),
  currency: z.string().length(3).optional().default('EUR'),
  billing_cycle: z.string().optional().nullable(),
  has_commitment_options: z.boolean().optional().default(false),
  price_no_commitment: z.number().min(0).optional().nullable(),
  price_monthly_commitment: z.number().min(0).optional().nullable(),
  price_yearly_commitment: z.number().min(0).optional().nullable(),
  features: z.array(z.string()).optional().default([]),
  external_url: z.string().url().optional().nullable().or(z.literal('')),
  is_active: z.boolean().optional().default(true),
  display_order: z.number().optional().default(0)
});

const legalDocSchema = z.object({
  type: z.enum(['cgv', 'cgu', 'contract_template', 'privacy_policy']),
  title: z.string().min(1, 'Titre requis').max(255),
  content: z.string().min(1, 'Contenu requis'),
  notes: z.string().optional().nullable(),
  is_active: z.boolean().optional().default(true)
});

const paymentLinkSchema = z.object({
  name: z.string().min(1, 'Nom requis').max(255),
  provider: z.string().optional().nullable(),
  url: z.string().url().optional().nullable().or(z.literal('')),
  instructions: z.string().optional().nullable(),
  icon_name: z.string().optional().nullable(),
  display_in_contracts: z.boolean().optional().default(true),
  display_in_quotes: z.boolean().optional().default(true),
  display_order: z.number().optional().default(0),
  is_active: z.boolean().optional().default(true)
});

// ========================================
// PRODUITS
// ========================================

/**
 * GET /api/business-config/products
 * Liste des produits du tenant
 */
router.get('/products', async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const { active_only } = req.query;

    let query = 'SELECT * FROM tenant_products WHERE tenant_id = $1';
    const params = [tenant_id];

    if (active_only === 'true') {
      query += ' AND is_active = true';
    }

    query += ' ORDER BY display_order ASC, created_at DESC';

    const { rows } = await q(query, params);

    res.json({ success: true, products: rows });
  } catch (error) {
    error('❌ Erreur GET products:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/business-config/products/:id
 * Détails d'un produit
 */
router.get('/products/:id', async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const { id } = req.params;

    const { rows } = await q(
      'SELECT * FROM tenant_products WHERE id = $1 AND tenant_id = $2',
      [id, tenant_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Produit non trouvé' });
    }

    res.json({ success: true, product: rows[0] });
  } catch (error) {
    error('❌ Erreur GET product:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/business-config/products
 * Créer un produit
 */
router.post('/products', async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const data = productSchema.parse(req.body);

    const { rows } = await q(
      `INSERT INTO tenant_products
       (tenant_id, name, description, category, type, price, currency, billing_cycle,
        has_commitment_options, price_no_commitment, price_monthly_commitment, price_yearly_commitment,
        features, external_url, is_active, display_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING *`,
      [
        tenant_id,
        data.name,
        data.description,
        data.category,
        data.type,
        data.price,
        data.currency,
        data.billing_cycle,
        data.has_commitment_options,
        data.price_no_commitment,
        data.price_monthly_commitment,
        data.price_yearly_commitment,
        JSON.stringify(data.features),
        data.external_url,
        data.is_active,
        data.display_order
      ]
    );

    log(`✅ Produit créé: ${rows[0].id}`);
    res.status(201).json({ success: true, product: rows[0] });
  } catch (error) {
    error('❌ Erreur POST product:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation échouée', details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/business-config/products/:id
 * Mettre à jour un produit
 */
router.patch('/products/:id', async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const { id } = req.params;
    const data = productSchema.partial().parse(req.body);

    // Construire la requête de mise à jour dynamiquement
    const fields = [];
    const values = [];
    let idx = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (key === 'features' && Array.isArray(value)) {
        fields.push(`features = $${idx++}`);
        values.push(JSON.stringify(value));
      } else {
        fields.push(`${key} = $${idx++}`);
        values.push(value);
      }
    });

    if (fields.length === 0) {
      return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });
    }

    values.push(id, tenant_id);

    const { rows } = await q(
      `UPDATE tenant_products
       SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${idx++} AND tenant_id = $${idx++}
       RETURNING *`,
      values
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Produit non trouvé' });
    }

    log(`✅ Produit mis à jour: ${id}`);
    res.json({ success: true, product: rows[0] });
  } catch (error) {
    error('❌ Erreur PATCH product:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation échouée', details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/business-config/products/:id
 * Supprimer un produit
 */
router.delete('/products/:id', async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const { id } = req.params;

    const { rows } = await q(
      'DELETE FROM tenant_products WHERE id = $1 AND tenant_id = $2 RETURNING id',
      [id, tenant_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Produit non trouvé' });
    }

    log(`🗑️ Produit supprimé: ${id}`);
    res.json({ success: true, message: 'Produit supprimé' });
  } catch (error) {
    error('❌ Erreur DELETE product:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// DOCUMENTS LÉGAUX
// ========================================

/**
 * GET /api/business-config/legal-documents
 * Liste des documents légaux
 */
router.get('/legal-documents', async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const { type, active_only } = req.query;

    let query = 'SELECT * FROM tenant_legal_documents WHERE tenant_id = $1';
    const params = [tenant_id];
    let idx = 2;

    if (type) {
      query += ` AND type = $${idx++}`;
      params.push(type);
    }

    if (active_only === 'true') {
      query += ' AND is_active = true';
    }

    query += ' ORDER BY type, version DESC, created_at DESC';

    const { rows } = await q(query, params);

    res.json({ success: true, documents: rows });
  } catch (error) {
    error('❌ Erreur GET legal-documents:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/business-config/legal-documents
 * Créer un document légal
 */
router.post('/legal-documents', async (req, res) => {
  try {
    const { tenant_id, id: user_id } = req.user;
    const data = legalDocSchema.parse(req.body);

    // Si is_active = true, désactiver les autres documents du même type
    if (data.is_active) {
      await q(
        'UPDATE tenant_legal_documents SET is_active = false WHERE tenant_id = $1 AND type = $2',
        [tenant_id, data.type]
      );
    }

    // Déterminer la version (incrémenter la dernière version)
    const { rows: lastVersion } = await q(
      'SELECT MAX(version) as max_version FROM tenant_legal_documents WHERE tenant_id = $1 AND type = $2',
      [tenant_id, data.type]
    );

    const version = (lastVersion[0]?.max_version || 0) + 1;

    const { rows } = await q(
      `INSERT INTO tenant_legal_documents
       (tenant_id, type, title, content, version, is_active, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [tenant_id, data.type, data.title, data.content, version, data.is_active, data.notes, user_id]
    );

    log(`✅ Document légal créé: ${rows[0].id} (${data.type} v${version})`);
    res.status(201).json({ success: true, document: rows[0] });
  } catch (error) {
    error('❌ Erreur POST legal-document:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation échouée', details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/business-config/legal-documents/:id
 * Mettre à jour un document légal
 */
router.patch('/legal-documents/:id', async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const { id } = req.params;
    const data = legalDocSchema.partial().parse(req.body);

    // Si on active ce document, désactiver les autres du même type
    if (data.is_active) {
      const { rows: current } = await q(
        'SELECT type FROM tenant_legal_documents WHERE id = $1 AND tenant_id = $2',
        [id, tenant_id]
      );

      if (current.length > 0) {
        await q(
          'UPDATE tenant_legal_documents SET is_active = false WHERE tenant_id = $1 AND type = $2 AND id != $3',
          [tenant_id, current[0].type, id]
        );
      }
    }

    const fields = [];
    const values = [];
    let idx = 1;

    Object.entries(data).forEach(([key, value]) => {
      fields.push(`${key} = $${idx++}`);
      values.push(value);
    });

    if (fields.length === 0) {
      return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });
    }

    values.push(id, tenant_id);

    const { rows } = await q(
      `UPDATE tenant_legal_documents
       SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${idx++} AND tenant_id = $${idx++}
       RETURNING *`,
      values
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Document non trouvé' });
    }

    log(`✅ Document légal mis à jour: ${id}`);
    res.json({ success: true, document: rows[0] });
  } catch (error) {
    error('❌ Erreur PATCH legal-document:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation échouée', details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/business-config/legal-documents/:id
 * Supprimer un document légal
 */
router.delete('/legal-documents/:id', async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const { id } = req.params;

    const { rows } = await q(
      'DELETE FROM tenant_legal_documents WHERE id = $1 AND tenant_id = $2 RETURNING id',
      [id, tenant_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Document non trouvé' });
    }

    log(`🗑️ Document légal supprimé: ${id}`);
    res.json({ success: true, message: 'Document supprimé' });
  } catch (error) {
    error('❌ Erreur DELETE legal-document:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// LIENS DE PAIEMENT
// ========================================

/**
 * GET /api/business-config/payment-links
 * Liste des liens de paiement
 */
router.get('/payment-links', async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const { active_only } = req.query;

    let query = 'SELECT * FROM tenant_payment_links WHERE tenant_id = $1';
    const params = [tenant_id];

    if (active_only === 'true') {
      query += ' AND is_active = true';
    }

    query += ' ORDER BY display_order ASC, created_at DESC';

    const { rows } = await q(query, params);

    res.json({ success: true, payment_links: rows });
  } catch (error) {
    error('❌ Erreur GET payment-links:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/business-config/payment-links
 * Créer un lien de paiement
 */
router.post('/payment-links', async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const data = paymentLinkSchema.parse(req.body);

    const { rows } = await q(
      `INSERT INTO tenant_payment_links
       (tenant_id, name, provider, url, instructions, icon_name,
        display_in_contracts, display_in_quotes, display_order, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        tenant_id,
        data.name,
        data.provider,
        data.url,
        data.instructions,
        data.icon_name,
        data.display_in_contracts,
        data.display_in_quotes,
        data.display_order,
        data.is_active
      ]
    );

    log(`✅ Lien de paiement créé: ${rows[0].id}`);
    res.status(201).json({ success: true, payment_link: rows[0] });
  } catch (error) {
    error('❌ Erreur POST payment-link:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation échouée', details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/business-config/payment-links/:id
 * Mettre à jour un lien de paiement
 */
router.patch('/payment-links/:id', async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const { id } = req.params;
    const data = paymentLinkSchema.partial().parse(req.body);

    const fields = [];
    const values = [];
    let idx = 1;

    Object.entries(data).forEach(([key, value]) => {
      fields.push(`${key} = $${idx++}`);
      values.push(value);
    });

    if (fields.length === 0) {
      return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });
    }

    values.push(id, tenant_id);

    const { rows } = await q(
      `UPDATE tenant_payment_links
       SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${idx++} AND tenant_id = $${idx++}
       RETURNING *`,
      values
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Lien de paiement non trouvé' });
    }

    log(`✅ Lien de paiement mis à jour: ${id}`);
    res.json({ success: true, payment_link: rows[0] });
  } catch (error) {
    error('❌ Erreur PATCH payment-link:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation échouée', details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/business-config/payment-links/:id
 * Supprimer un lien de paiement
 */
router.delete('/payment-links/:id', async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const { id } = req.params;

    const { rows } = await q(
      'DELETE FROM tenant_payment_links WHERE id = $1 AND tenant_id = $2 RETURNING id',
      [id, tenant_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Lien de paiement non trouvé' });
    }

    log(`🗑️ Lien de paiement supprimé: ${id}`);
    res.json({ success: true, message: 'Lien de paiement supprimé' });
  } catch (error) {
    error('❌ Erreur DELETE payment-link:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
