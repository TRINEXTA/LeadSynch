import { log, error } from "../lib/logger.js";
import express from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { query, queryOne, queryAll, execute } from '../lib/db.js';

const router = express.Router();

// ========== SCHEMAS DE VALIDATION ==========

const createSequenceSchema = z.object({
  name: z.string().min(1, 'Nom requis').max(255),
  description: z.string().optional(),
  trigger_type: z.enum(['manual', 'auto_import', 'auto_status_change']).default('manual'),
  trigger_config: z.object({}).passthrough().optional(),
  working_days_only: z.boolean().default(true),
  working_hours_start: z.string().default('09:00'),
  working_hours_end: z.string().default('18:00'),
  exit_conditions: z.array(z.object({
    type: z.string(),
    value: z.string().optional()
  })).optional()
});

const createStepSchema = z.object({
  step_order: z.number().int().positive(),
  step_type: z.enum(['email', 'call_task', 'sms', 'whatsapp', 'linkedin', 'wait', 'condition']),
  delay_days: z.number().int().min(0).default(0),
  delay_hours: z.number().int().min(0).default(0),
  delay_minutes: z.number().int().min(0).default(0),
  email_template_id: z.string().uuid().optional(),
  email_subject: z.string().max(500).optional(),
  email_body: z.string().optional(),
  sms_content: z.string().max(160).optional(),
  whatsapp_template_name: z.string().max(100).optional(),
  whatsapp_message: z.string().optional(),
  linkedin_message: z.string().max(300).optional(),
  task_title: z.string().max(255).optional(),
  task_description: z.string().optional(),
  condition_type: z.enum(['if_opened', 'if_clicked', 'if_replied', 'if_not_opened']).optional(),
  condition_true_step: z.number().int().optional(),
  condition_false_step: z.number().int().optional()
});

const enrollLeadsSchema = z.object({
  lead_ids: z.array(z.string().uuid()).min(1, 'Au moins un lead requis')
});

// ========== ROUTES SEQUENCES ==========

/**
 * GET /
 * Liste toutes les séquences du tenant
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const status = req.query.status || null;

    let whereClause = 'WHERE s.tenant_id = $1';
    const params = [tenantId];

    if (status) {
      whereClause += ' AND s.status = $2';
      params.push(status);
    }

    const { rows } = await query(
      `SELECT s.*,
        u.first_name || ' ' || u.last_name as created_by_name,
        (SELECT COUNT(*) FROM sequence_steps WHERE sequence_id = s.id) as steps_count,
        (SELECT COUNT(*) FROM sequence_enrollments WHERE sequence_id = s.id AND status = 'active') as active_enrollments,
        (SELECT COUNT(*) FROM sequence_enrollments WHERE sequence_id = s.id AND status = 'completed') as completed_enrollments
       FROM sequences s
       LEFT JOIN users u ON s.created_by = u.id
       ${whereClause}
       ORDER BY s.created_at DESC`,
      params
    );

    res.json({ success: true, sequences: rows });
  } catch (err) {
    error('Erreur liste séquences:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /:id
 * Récupère une séquence avec ses étapes
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;

    const sequence = await queryOne(
      `SELECT s.*, u.first_name || ' ' || u.last_name as created_by_name
       FROM sequences s
       LEFT JOIN users u ON s.created_by = u.id
       WHERE s.id = $1 AND s.tenant_id = $2`,
      [id, tenantId]
    );

    if (!sequence) {
      return res.status(404).json({ error: 'Séquence non trouvée' });
    }

    // Récupérer les étapes
    const { rows: steps } = await query(
      `SELECT ss.*, et.name as template_name
       FROM sequence_steps ss
       LEFT JOIN email_templates et ON ss.email_template_id = et.id
       WHERE ss.sequence_id = $1
       ORDER BY ss.step_order ASC`,
      [id]
    );

    // Statistiques
    const stats = await queryOne(
      `SELECT
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'exited') as exited,
        COUNT(*) FILTER (WHERE status = 'paused') as paused
       FROM sequence_enrollments
       WHERE sequence_id = $1`,
      [id]
    );

    res.json({
      success: true,
      sequence,
      steps,
      stats
    });
  } catch (err) {
    error('Erreur récupération séquence:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /
 * Crée une nouvelle séquence
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;

    const data = createSequenceSchema.parse(req.body);

    const { rows } = await query(
      `INSERT INTO sequences (
        tenant_id, name, description, trigger_type, trigger_config,
        working_days_only, working_hours_start, working_hours_end,
        exit_conditions, created_by, status
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'draft')
       RETURNING *`,
      [
        tenantId, data.name, data.description || null, data.trigger_type,
        JSON.stringify(data.trigger_config || {}), data.working_days_only,
        data.working_hours_start, data.working_hours_end,
        JSON.stringify(data.exit_conditions || []), userId
      ]
    );

    res.status(201).json({ success: true, sequence: rows[0] });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors });
    }
    error('Erreur création séquence:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /:id
 * Met à jour une séquence
 */
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;

    const data = createSequenceSchema.partial().parse(req.body);

    // Vérifier que la séquence existe
    const existing = await queryOne(
      'SELECT status FROM sequences WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    if (!existing) {
      return res.status(404).json({ error: 'Séquence non trouvée' });
    }

    // Construire la requête de mise à jour dynamiquement
    const updates = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        updates.push(`${key} = $${paramIndex}`);
        values.push(key.includes('config') || key.includes('conditions') ? JSON.stringify(value) : value);
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });
    }

    values.push(id, tenantId);
    const { rows } = await query(
      `UPDATE sequences SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
       RETURNING *`,
      values
    );

    res.json({ success: true, sequence: rows[0] });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors });
    }
    error('Erreur mise à jour séquence:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /:id/activate
 * Active une séquence
 */
router.post('/:id/activate', authMiddleware, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;

    // Vérifier qu'il y a au moins une étape
    const stepsCount = await queryOne(
      'SELECT COUNT(*) as count FROM sequence_steps WHERE sequence_id = $1',
      [id]
    );

    if (parseInt(stepsCount.count) === 0) {
      return res.status(400).json({ error: 'La séquence doit avoir au moins une étape' });
    }

    const { rows } = await query(
      `UPDATE sequences SET status = 'active', updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2
       RETURNING *`,
      [id, tenantId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Séquence non trouvée' });
    }

    res.json({ success: true, sequence: rows[0] });
  } catch (err) {
    error('Erreur activation séquence:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /:id/pause
 * Met en pause une séquence
 */
router.post('/:id/pause', authMiddleware, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;

    const { rows } = await query(
      `UPDATE sequences SET status = 'paused', updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2
       RETURNING *`,
      [id, tenantId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Séquence non trouvée' });
    }

    res.json({ success: true, sequence: rows[0] });
  } catch (err) {
    error('Erreur pause séquence:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /:id
 * Supprime une séquence (archive)
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;

    // Vérifier les permissions (admin seulement)
    if (!['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Permission refusée' });
    }

    // Archiver plutôt que supprimer
    const { rows } = await query(
      `UPDATE sequences SET status = 'archived', updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2
       RETURNING *`,
      [id, tenantId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Séquence non trouvée' });
    }

    res.json({ success: true, message: 'Séquence archivée' });
  } catch (err) {
    error('Erreur suppression séquence:', err);
    res.status(500).json({ error: err.message });
  }
});

// ========== ROUTES ÉTAPES ==========

/**
 * POST /:id/steps
 * Ajoute une étape à la séquence
 */
router.post('/:id/steps', authMiddleware, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id: sequenceId } = req.params;

    // Vérifier que la séquence existe
    const sequence = await queryOne(
      'SELECT id, status FROM sequences WHERE id = $1 AND tenant_id = $2',
      [sequenceId, tenantId]
    );

    if (!sequence) {
      return res.status(404).json({ error: 'Séquence non trouvée' });
    }

    const data = createStepSchema.parse(req.body);

    const { rows } = await query(
      `INSERT INTO sequence_steps (
        sequence_id, step_order, step_type, delay_days, delay_hours, delay_minutes,
        email_template_id, email_subject, email_body,
        sms_content, whatsapp_template_name, whatsapp_message, linkedin_message,
        task_title, task_description,
        condition_type, condition_true_step, condition_false_step
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       RETURNING *`,
      [
        sequenceId, data.step_order, data.step_type,
        data.delay_days, data.delay_hours, data.delay_minutes,
        data.email_template_id || null, data.email_subject || null, data.email_body || null,
        data.sms_content || null, data.whatsapp_template_name || null,
        data.whatsapp_message || null, data.linkedin_message || null,
        data.task_title || null, data.task_description || null,
        data.condition_type || null, data.condition_true_step || null, data.condition_false_step || null
      ]
    );

    res.status(201).json({ success: true, step: rows[0] });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors });
    }
    error('Erreur création étape:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /:id/steps/:stepId
 * Met à jour une étape
 */
router.put('/:id/steps/:stepId', authMiddleware, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id: sequenceId, stepId } = req.params;

    // Vérifier que la séquence existe
    const sequence = await queryOne(
      'SELECT id FROM sequences WHERE id = $1 AND tenant_id = $2',
      [sequenceId, tenantId]
    );

    if (!sequence) {
      return res.status(404).json({ error: 'Séquence non trouvée' });
    }

    const data = createStepSchema.partial().parse(req.body);

    const updates = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        updates.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });
    }

    values.push(stepId, sequenceId);
    const { rows } = await query(
      `UPDATE sequence_steps SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex} AND sequence_id = $${paramIndex + 1}
       RETURNING *`,
      values
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Étape non trouvée' });
    }

    res.json({ success: true, step: rows[0] });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors });
    }
    error('Erreur mise à jour étape:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /:id/steps/:stepId
 * Supprime une étape
 */
router.delete('/:id/steps/:stepId', authMiddleware, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id: sequenceId, stepId } = req.params;

    // Vérifier que la séquence existe
    const sequence = await queryOne(
      'SELECT id, status FROM sequences WHERE id = $1 AND tenant_id = $2',
      [sequenceId, tenantId]
    );

    if (!sequence) {
      return res.status(404).json({ error: 'Séquence non trouvée' });
    }

    if (sequence.status === 'active') {
      return res.status(400).json({ error: 'Impossible de supprimer une étape d\'une séquence active' });
    }

    await execute(
      'DELETE FROM sequence_steps WHERE id = $1 AND sequence_id = $2',
      [stepId, sequenceId]
    );

    res.json({ success: true, message: 'Étape supprimée' });
  } catch (err) {
    error('Erreur suppression étape:', err);
    res.status(500).json({ error: err.message });
  }
});

// ========== ROUTES INSCRIPTIONS ==========

/**
 * POST /:id/enroll
 * Inscrit des leads dans la séquence
 */
router.post('/:id/enroll', authMiddleware, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;
    const { id: sequenceId } = req.params;

    const data = enrollLeadsSchema.parse(req.body);

    // Vérifier que la séquence est active
    const sequence = await queryOne(
      'SELECT id, status FROM sequences WHERE id = $1 AND tenant_id = $2',
      [sequenceId, tenantId]
    );

    if (!sequence) {
      return res.status(404).json({ error: 'Séquence non trouvée' });
    }

    if (sequence.status !== 'active') {
      return res.status(400).json({ error: 'La séquence doit être active pour inscrire des leads' });
    }

    // Récupérer la première étape
    const firstStep = await queryOne(
      'SELECT step_order, delay_days, delay_hours, delay_minutes FROM sequence_steps WHERE sequence_id = $1 ORDER BY step_order ASC LIMIT 1',
      [sequenceId]
    );

    if (!firstStep) {
      return res.status(400).json({ error: 'La séquence n\'a pas d\'étapes' });
    }

    // Calculer la date de la première exécution
    const delayMs = (firstStep.delay_days * 24 * 60 + firstStep.delay_hours * 60 + firstStep.delay_minutes) * 60 * 1000;
    const nextStepDate = new Date(Date.now() + delayMs);

    let enrolled = 0;
    let skipped = 0;
    const errors = [];

    for (const leadId of data.lead_ids) {
      try {
        // Vérifier que le lead appartient au tenant
        const lead = await queryOne(
          'SELECT id FROM leads WHERE id = $1 AND tenant_id = $2',
          [leadId, tenantId]
        );

        if (!lead) {
          errors.push({ leadId, error: 'Lead non trouvé' });
          skipped++;
          continue;
        }

        // Inscrire le lead (UNIQUE constraint gère les doublons)
        await query(
          `INSERT INTO sequence_enrollments (
            tenant_id, sequence_id, lead_id, current_step_order,
            status, enrolled_by, next_step_scheduled_at
           )
           VALUES ($1, $2, $3, $4, 'active', $5, $6)
           ON CONFLICT (sequence_id, lead_id) DO NOTHING`,
          [tenantId, sequenceId, leadId, firstStep.step_order, userId, nextStepDate]
        );

        enrolled++;
      } catch (err) {
        errors.push({ leadId, error: err.message });
        skipped++;
      }
    }

    res.json({
      success: true,
      enrolled,
      skipped,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors });
    }
    error('Erreur inscription leads:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /:id/enrollments
 * Liste les inscriptions d'une séquence
 */
router.get('/:id/enrollments', authMiddleware, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id: sequenceId } = req.params;
    const status = req.query.status || null;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    let whereClause = 'WHERE se.sequence_id = $1 AND se.tenant_id = $2';
    const params = [sequenceId, tenantId];

    if (status) {
      whereClause += ' AND se.status = $3';
      params.push(status);
    }

    params.push(limit, offset);

    const { rows } = await query(
      `SELECT se.*, l.company_name, l.email, l.phone, l.status as lead_status,
        u.first_name || ' ' || u.last_name as enrolled_by_name
       FROM sequence_enrollments se
       JOIN leads l ON se.lead_id = l.id
       LEFT JOIN users u ON se.enrolled_by = u.id
       ${whereClause}
       ORDER BY se.enrolled_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    const countResult = await queryOne(
      `SELECT COUNT(*) as total FROM sequence_enrollments se ${whereClause}`,
      params.slice(0, -2)
    );

    res.json({
      success: true,
      enrollments: rows,
      total: parseInt(countResult.total),
      limit,
      offset
    });
  } catch (err) {
    error('Erreur liste inscriptions:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /:id/enrollments/:enrollmentId/pause
 * Met en pause une inscription
 */
router.post('/:id/enrollments/:enrollmentId/pause', authMiddleware, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { enrollmentId } = req.params;

    const { rows } = await query(
      `UPDATE sequence_enrollments SET status = 'paused', updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2 AND status = 'active'
       RETURNING *`,
      [enrollmentId, tenantId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Inscription non trouvée ou déjà inactive' });
    }

    res.json({ success: true, enrollment: rows[0] });
  } catch (err) {
    error('Erreur pause inscription:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /:id/enrollments/:enrollmentId/resume
 * Reprend une inscription en pause
 */
router.post('/:id/enrollments/:enrollmentId/resume', authMiddleware, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { enrollmentId } = req.params;

    const { rows } = await query(
      `UPDATE sequence_enrollments SET status = 'active', updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2 AND status = 'paused'
       RETURNING *`,
      [enrollmentId, tenantId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Inscription non trouvée ou pas en pause' });
    }

    res.json({ success: true, enrollment: rows[0] });
  } catch (err) {
    error('Erreur reprise inscription:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /:id/enrollments/:enrollmentId
 * Retire un lead de la séquence
 */
router.delete('/:id/enrollments/:enrollmentId', authMiddleware, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { enrollmentId } = req.params;
    const { reason } = req.body;

    const { rows } = await query(
      `UPDATE sequence_enrollments
       SET status = 'exited', exit_reason = $1, updated_at = NOW()
       WHERE id = $2 AND tenant_id = $3
       RETURNING *`,
      [reason || 'Retiré manuellement', enrollmentId, tenantId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Inscription non trouvée' });
    }

    res.json({ success: true, message: 'Lead retiré de la séquence' });
  } catch (err) {
    error('Erreur retrait lead:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /:id/logs
 * Récupère les logs d'exécution d'une séquence
 */
router.get('/:id/logs', authMiddleware, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id: sequenceId } = req.params;
    const limit = parseInt(req.query.limit) || 100;

    const { rows } = await query(
      `SELECT sel.*, l.company_name, ss.step_type, ss.step_order
       FROM sequence_execution_logs sel
       JOIN sequence_enrollments se ON sel.enrollment_id = se.id
       JOIN leads l ON se.lead_id = l.id
       LEFT JOIN sequence_steps ss ON sel.step_id = ss.id
       WHERE se.sequence_id = $1 AND sel.tenant_id = $2
       ORDER BY sel.executed_at DESC
       LIMIT $3`,
      [sequenceId, tenantId, limit]
    );

    res.json({ success: true, logs: rows });
  } catch (err) {
    error('Erreur récupération logs:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
