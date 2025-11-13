import { Router } from "express";
import { query, queryOne, execute } from "../lib/db.js";
import { authMiddleware } from "../middleware/auth.js";
import { ValidationError, NotFoundError, DatabaseError } from "../lib/errors.js";

const router = Router();

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

    const sql = 'SELECT COUNT(*) as count FROM leads WHERE ' + where;
    const { rows } = await query(sql, params);
    
    return res.json({ 
      success: true, 
      count: parseInt(rows[0].count) || 0 
    });
    
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/leads
 */
router.get("/", async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    
    if (!tenantId) {
      throw new ValidationError('Tenant ID manquant');
    }

    const sql = 'SELECT l.*, ld.name as database_name, u.first_name || \' \' || u.last_name as assigned_to_name FROM leads l LEFT JOIN lead_databases ld ON l.database_id = ld.id LEFT JOIN users u ON l.assigned_to = u.id WHERE l.tenant_id = $1 ORDER BY l.created_at DESC LIMIT 1000';

    const { rows } = await query(sql, [tenantId]);
    return res.json({ success: true, leads: rows });
    
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

    const sql = 'SELECT id, company_name, contact_name, email, phone, status, assigned_to, created_at, updated_at FROM leads WHERE ' + where + ' ORDER BY created_at DESC LIMIT ' + limitParam;

    const { rows } = await query(sql, params);
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

    const lead = await queryOne(sql, [leadId, tenantId]);

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
    } = req.body;

    if (!company_name || !company_name.trim()) {
      throw new ValidationError('Le nom de l\'entreprise est requis');
    }

    if (!email || !email.trim()) {
      throw new ValidationError('L\'email est requis');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ValidationError('Format d\'email invalide');
    }

    const sql = 'INSERT INTO leads (tenant_id, company_name, contact_name, email, phone, city, website, industry, deal_value, notes, score, database_id, assigned_to, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW()) RETURNING *';

    const lead = await queryOne(sql, [
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

    console.log('✅ Lead créé:', lead.company_name, '- ID:', lead.id);

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
    } = req.body;

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new ValidationError('Format d\'email invalide');
      }
    }

    const sql = 'UPDATE leads SET company_name = COALESCE($1, company_name), contact_name = COALESCE($2, contact_name), email = COALESCE($3, email), phone = COALESCE($4, phone), city = COALESCE($5, city), website = COALESCE($6, website), industry = COALESCE($7, industry), deal_value = COALESCE($8, deal_value), notes = COALESCE($9, notes), score = COALESCE($10, score), status = COALESCE($11, status), assigned_to = COALESCE($12, assigned_to), updated_at = NOW() WHERE id = $13 AND tenant_id = $14 RETURNING *';

    const lead = await queryOne(sql, [
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

    console.log('✅ Lead mis à jour:', lead.company_name, '- ID:', lead.id);

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

    await execute('DELETE FROM call_history WHERE pipeline_lead_id IN (SELECT id FROM pipeline_leads WHERE lead_id = $1)', [leadId]);
    await execute('DELETE FROM pipeline_leads WHERE lead_id = $1', [leadId]);
    await execute('DELETE FROM campaign_leads WHERE lead_id = $1', [leadId]);
    await execute('DELETE FROM email_tracking WHERE lead_id = $1', [leadId]);
    await execute('DELETE FROM leads WHERE id = $1 AND tenant_id = $2', [leadId, tenantId]);

    console.log('🗑️ Lead supprimé:', existingLead.company_name, '- ID:', leadId);

    return res.json({ 
      success: true, 
      message: 'Lead supprimé avec succès' 
    });
    
  } catch (err) {
    return next(err);
  }
});

export default router;