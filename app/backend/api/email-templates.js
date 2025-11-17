import express from 'express';
import { z } from 'zod';
import pkg from 'pg';
import { authMiddleware } from '../middleware/auth.js';
const { Pool } = pkg;
const router = express.Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: true }  // ✅ Production: SSL strict
    : { rejectUnauthorized: false } // ⚠️ Dev seulement: certificats locaux
});

// ==================== VALIDATION SCHEMA ====================
const createTemplateSchema = z.object({
  name: z.string().min(1, 'Nom requis').max(255).trim(),
  subject: z.string().min(1, 'Sujet requis').max(500).trim(),
  html_body: z.string().min(1, 'Corps HTML requis'),
  template_type: z.enum(['email', 'sms']).optional().default('email'),
  is_active: z.boolean().optional().default(true),
  metadata: z.record(z.any()).optional().nullable()
});

async function getTemplatesHandler(req, res) {
  try {
    const tenantId = req.user.tenant_id;
    const result = await pool.query(
      'SELECT id, name, subject, html_body, template_type, is_active, metadata, created_at, updated_at FROM email_templates WHERE tenant_id = $1 ORDER BY created_at DESC',
      [tenantId]
    );
    res.json({ templates: result.rows });
  } catch (error) {
    console.error('Erreur GET templates:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

async function getTemplateByIdHandler(req, res) {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;
    
    const result = await pool.query(
      'SELECT id, name, subject, html_body, template_type, is_active, metadata, created_at, updated_at FROM email_templates WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template non trouvé' });
    }
    
    res.json({ success: true, template: result.rows[0] });
  } catch (error) {
    console.error('Erreur GET template by ID:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

async function createTemplateHandler(req, res) {
  try {
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;

    // ✅ VALIDATION ZOD
    let validatedData;
    try {
      validatedData = createTemplateSchema.parse(req.body);
    } catch (error) {
      return res.status(400).json({
        error: 'Données invalides',
        details: error.errors?.map(e => `${e.path.join('.')}: ${e.message}`)
      });
    }

    const { name, subject, html_body, template_type, is_active, metadata } = validatedData;

    const result = await pool.query(
      'INSERT INTO email_templates (tenant_id, name, subject, html_body, template_type, is_active, metadata, created_by, updated_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8) RETURNING *',
      [tenantId, name, subject, html_body, template_type, is_active, metadata ? JSON.stringify(metadata) : null, userId]
    );
    res.status(201).json({ message: 'Template créé', template: result.rows[0] });
  } catch (error) {
    console.error('Erreur POST template:', error);
    res.status(500).json({ error: 'Erreur création' });
  }
}

async function deleteTemplateHandler(req, res) {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;
    const result = await pool.query(
      'DELETE FROM email_templates WHERE id = $1 AND tenant_id = $2 RETURNING id',
      [id, tenantId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template non trouvé' });
    }
    res.json({ message: 'Template supprimé' });
  } catch (error) {
    console.error('Erreur DELETE:', error);
    res.status(500).json({ error: 'Erreur suppression' });
  }
}

// Routes avec authMiddleware
router.get('/', authMiddleware, getTemplatesHandler);
router.get('/:id', authMiddleware, getTemplateByIdHandler);
router.post('/', authMiddleware, createTemplateHandler);
router.delete('/:id', authMiddleware, deleteTemplateHandler);      

export default router;