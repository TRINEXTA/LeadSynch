import { log, error, warn } from "../lib/logger.js";
﻿import { Router } from "express";
import { z } from "zod";
import { resolve } from "../lib/container.js";
import { authMiddleware } from "../middleware/auth.js";
import { ValidationError, NotFoundError, DatabaseError } from "../lib/errors.js";

const router = Router();

// ==================== VALIDATION SCHEMAS ====================
const createLeadSchema = z.object({
  company_name: z.string().min(1, 'Nom entreprise requis').max(255).trim(),
  contact_name: z.string().max(255).trim().optional().nullable(),
  email: z.string().email('Email invalide').toLowerCase().trim(),
  phone: z.string().max(50).trim().optional().nullable(),
  city: z.string().max(100).trim().optional().nullable(),
  website: z.string().url('URL invalide').optional().nullable().or(z.literal('')),
  industry: z.string().max(100).trim().optional().nullable(),
  deal_value: z.number().min(0).optional().default(0),
  notes: z.string().optional().nullable(),
  score: z.number().min(0).max(100).optional().default(50),
  database_id: z.string().uuid().optional().nullable(),
  assigned_to: z.string().uuid().optional().nullable()
});

const updateLeadSchema = z.object({
  company_name: z.string().min(1).max(255).trim().optional(),
  contact_name: z.string().max(255).trim().optional().nullable(),
  email: z.string().email('Email invalide').toLowerCase().trim().optional(),
  phone: z.string().max(50).trim().optional().nullable(),
  city: z.string().max(100).trim().optional().nullable(),
  website: z.string().url('URL invalide').optional().nullable().or(z.literal('')),
  industry: z.string().max(100).trim().optional().nullable(),
  deal_value: z.number().min(0).optional(),
  notes: z.string().optional().nullable(),
  score: z.number().min(0).max(100).optional(),
  status: z.enum(['new', 'contacted', 'qualified', 'lost', 'won']).optional(),
  assigned_to: z.string().uuid().optional().nullable()
}).partial();

router.use(authMiddleware);

/**
 * GET /api/leads/count - Compter les leads d'une base
 */
router.get("/count", async (req, res, next) => {
  try {
    const { database_id, industry } = req.query;
    const tenantId = req.user.tenant_id;
    
    if (!database_id) {
      return res.json({ success: true, count: 0 });
    }

    const params = [tenantId, database_id];
    let where = 'tenant_id = $1 AND database_id = $2';

    if (industry) {
      params.push(industry);
      where += ' AND industry = $3';
    }

    const sql = `SELECT COUNT(*) as count FROM leads WHERE ${where}`;
    const { rows } = await resolve('db').query(sql, params);
    
    return res.json({ 
      success: true, 
      count: parseInt(rows[0].count) || 0 
    });
    
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/leads - Liste paginée avec filtres
 * Query params:
 *  - page: numéro de page (défaut: 1)
 *  - limit: nombre de résultats par page (défaut: 50, max: 200)
 *  - status: filtrer par statut
 *  - search: recherche dans company_name, email, phone
 *  - database_id: filtrer par base de données
 */
router.get("/", async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;

    if (!tenantId) {
      throw new ValidationError('Tenant ID manquant');
    }

    // Paramètres de pagination
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit || '50', 10)));
    const offset = (page - 1) * limit;

    // Filtres
    const { status, search, database_id } = req.query;

    // Construction de la requête WHERE
    const params = [tenantId];
    let paramIndex = 2;
    let whereConditions = ['l.tenant_id = $1'];

    if (status) {
      whereConditions.push(`l.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (database_id) {
      whereConditions.push(`l.database_id = $${paramIndex}`);
      params.push(database_id);
      paramIndex++;
    }

    if (search && search.trim()) {
      whereConditions.push(`(
        l.company_name ILIKE $${paramIndex} OR
        l.email ILIKE $${paramIndex} OR
        l.phone ILIKE $${paramIndex} OR
        l.contact_name ILIKE $${paramIndex}
      )`);
      params.push(`%${search.trim()}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    // Requête COUNT pour le total
    const countSql = `SELECT COUNT(*) as total FROM leads l WHERE ${whereClause}`;
    const { rows: countRows } = await query(countSql, params);
    const total = parseInt(countRows[0].total, 10);

    // Requête principale avec LIMIT/OFFSET
    const sql = `
      SELECT
        l.*,
        ld.name as database_name,
        u.first_name || ' ' || u.last_name as assigned_to_name
      FROM leads l
      LEFT JOIN lead_databases ld ON l.database_id = ld.id
      LEFT JOIN users u ON l.assigned_to = u.id
      WHERE ${whereClause}
      ORDER BY l.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);
    const { rows } = await resolve('db').query(sql, params);

    return res.json({
      success: true,
      leads: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (err) {
    if (err.code?.startsWith('23')) {
      return next(new DatabaseError('Erreur lors de la récupération des leads', err));
    }
    return next(err);
  }
});

/**
 * GET /api/leads/today
 */
router.get("/today", async (req, res, next) => {
  try {
    const scope = (req.query.scope || "mine").toString().toLowerCase();
    const limit = Math.min(parseInt(req.query.limit || "200", 10), 1000);
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;

    const params = [tenantId];
    let where = 'tenant_id = $1 AND DATE(created_at) = CURRENT_DATE';
    let limitParam = '$2';

    if (scope === "mine" && userId) {
      params.push(userId);
      where += ' AND assigned_to = $2';
      limitParam = '$3';
      params.push(limit);
    } else {
      params.push(limit);
    }

    const sql = `SELECT id, company_name, contact_name, email, phone, status, assigned_to, created_at, updated_at FROM leads WHERE ${where} ORDER BY created_at DESC LIMIT ${limitParam}`;

    const { rows } = await resolve('db').query(sql, params);
    return res.json({ success: true, count: rows.length, leads: rows });
    
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/leads/:id - Récupérer un lead spécifique
 */
router.get("/:id", async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const leadId = req.params.id;

    const sql = 'SELECT l.*, ld.name as database_name, u.first_name || \' \' || u.last_name as assigned_to_name FROM leads l LEFT JOIN lead_databases ld ON l.database_id = ld.id LEFT JOIN users u ON l.assigned_to = u.id WHERE l.id = $1 AND l.tenant_id = $2';

    const lead = await resolve('db').queryOne(sql, [leadId, tenantId]);

    if (!lead) {
      throw new NotFoundError('Lead non trouvé');
    }

    return res.json({ success: true, lead });
    
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /api/leads - Créer un nouveau lead
 */
router.post("/", async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;

    // ✅ VALIDATION ZOD
    let validatedData;
    try {
      validatedData = createLeadSchema.parse(req.body);
    } catch (error) {
      throw new ValidationError(
        'Données invalides: ' + error.errors?.map(e => e.message).join(', ')
      );
    }

    const {
      company_name,
      contact_name,
      email,
      phone,
      city,
      website,
      industry,
      deal_value,
      notes,
      score,
      database_id,
      assigned_to
    } = validatedData;

    const sql = 'INSERT INTO leads (tenant_id, company_name, contact_name, email, phone, city, website, industry, deal_value, notes, score, database_id, assigned_to, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW()) RETURNING *';

    const lead = await resolve('db').queryOne(sql, [
      tenantId,
      company_name.trim(),
      contact_name?.trim() || null,
      email.trim().toLowerCase(),
      phone?.trim() || null,
      city?.trim() || null,
      website?.trim() || null,
      industry?.trim() || null,
      deal_value || 0,
      notes?.trim() || null,
      score || 50,
      database_id || null,
      assigned_to || userId,
      'new'
    ]);

    log('✅ Lead créé:', lead.company_name, '- ID:', lead.id);

    return res.status(201).json({ 
      success: true, 
      message: 'Lead créé avec succès',
      lead 
    });
    
  } catch (err) {
    if (err.code === '23505') {
      return next(new ValidationError('Un lead avec cet email existe déjà'));
    }
    return next(err);
  }
});

/**
 * PUT /api/leads/:id - Modifier un lead
 */
router.put("/:id", async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const leadId = req.params.id;

    const existingLead = await queryOne(
      'SELECT id FROM leads WHERE id = $1 AND tenant_id = $2',
      [leadId, tenantId]
    );

    if (!existingLead) {
      throw new NotFoundError('Lead non trouvé');
    }

    // ✅ VALIDATION ZOD
    let validatedData;
    try {
      validatedData = updateLeadSchema.parse(req.body);
    } catch (error) {
      throw new ValidationError(
        'Données invalides: ' + error.errors?.map(e => e.message).join(', ')
      );
    }

    const {
      company_name,
      contact_name,
      email,
      phone,
      city,
      website,
      industry,
      deal_value,
      notes,
      score,
      status,
      assigned_to
    } = validatedData;

    const sql = 'UPDATE leads SET company_name = COALESCE($1, company_name), contact_name = COALESCE($2, contact_name), email = COALESCE($3, email), phone = COALESCE($4, phone), city = COALESCE($5, city), website = COALESCE($6, website), industry = COALESCE($7, industry), deal_value = COALESCE($8, deal_value), notes = COALESCE($9, notes), score = COALESCE($10, score), status = COALESCE($11, status), assigned_to = COALESCE($12, assigned_to), updated_at = NOW() WHERE id = $13 AND tenant_id = $14 RETURNING *';

    const lead = await resolve('db').queryOne(sql, [
      company_name?.trim(),
      contact_name?.trim(),
      email?.trim().toLowerCase(),
      phone?.trim(),
      city?.trim(),
      website?.trim(),
      industry?.trim(),
      deal_value,
      notes?.trim(),
      score,
      status,
      assigned_to,
      leadId,
      tenantId
    ]);

    log('✅ Lead mis à jour:', lead.company_name, '- ID:', lead.id);

    return res.json({ 
      success: true, 
      message: 'Lead mis à jour avec succès',
      lead 
    });
    
  } catch (err) {
    if (err.code === '23505') {
      return next(new ValidationError('Un lead avec cet email existe déjà'));
    }
    return next(err);
  }
});

/**
 * DELETE /api/leads/:id - Supprimer un lead
 */
router.delete("/:id", async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const leadId = req.params.id;

    const existingLead = await queryOne(
      'SELECT id, company_name FROM leads WHERE id = $1 AND tenant_id = $2',
      [leadId, tenantId]
    );

    if (!existingLead) {
      throw new NotFoundError('Lead non trouvé');
    }

    await resolve('db').execute('DELETE FROM call_history WHERE pipeline_lead_id IN (SELECT id FROM pipeline_leads WHERE lead_id = $1)', [leadId]);
    await resolve('db').execute('DELETE FROM pipeline_leads WHERE lead_id = $1', [leadId]);
    await resolve('db').execute('DELETE FROM campaign_leads WHERE lead_id = $1', [leadId]);
    await resolve('db').execute('DELETE FROM email_tracking WHERE lead_id = $1', [leadId]);
    await resolve('db').execute('DELETE FROM leads WHERE id = $1 AND tenant_id = $2', [leadId, tenantId]);

    log('🗑️ Lead supprimé:', existingLead.company_name, '- ID:', leadId);

    return res.json({ 
      success: true, 
      message: 'Lead supprimé avec succès' 
    });
    
  } catch (err) {
    return next(err);
  }
});

export default router;