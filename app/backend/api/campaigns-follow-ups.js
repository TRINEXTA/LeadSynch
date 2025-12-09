/**
 * API Endpoints pour les Relances de Campagnes
 *
 * Gère la configuration, génération et suivi des relances automatiques.
 *
 * @module api/campaigns-follow-ups
 */

import { Router } from 'express';
import { log, error, warn } from '../lib/logger.js';
import db from '../config/db.js';
import { z } from 'zod';
import authMiddleware from '../middleware/auth.js';
const authenticateToken = authMiddleware;
import {
  generateFollowUpTemplates,
  regenerateFollowUpTemplate,
  analyzeDeliverabilityIssues
} from '../lib/followUpTemplateGenerator.js';

const router = Router();

// ==================== HELPERS ====================
const queryOne = async (query, params = []) => {
  const { rows } = await db.query(query, params);
  return rows[0] || null;
};

const queryAll = async (query, params = []) => {
  const { rows } = await db.query(query, params);
  return rows;
};

const execute = async (query, params = []) => {
  return await db.query(query, params);
};

// ==================== VALIDATION SCHEMAS ====================
const enableFollowUpsSchema = z.object({
  follow_up_count: z.number().int().min(1).max(2),
  delay_days: z.number().int().min(1).max(30).default(3)
});

const updateFollowUpSchema = z.object({
  subject: z.string().min(1).max(500).optional(),
  html_content: z.string().min(1).optional(),
  delay_days: z.number().int().min(1).max(30).optional(),
  status: z.enum(['pending', 'scheduled', 'active', 'paused', 'cancelled']).optional()
});

// ==================== GET FOLLOW-UPS FOR CAMPAIGN ====================
/**
 * GET /api/campaigns/:campaignId/follow-ups
 * Récupère les relances configurées pour une campagne
 */
router.get('/:campaignId/follow-ups', authenticateToken, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const tenantId = req.user.tenant_id;

    // Vérifier que la campagne appartient au tenant
    const campaign = await queryOne(`
      SELECT id, name, follow_ups_enabled, follow_ups_count, follow_up_delay_days,
             subject, status
      FROM campaigns
      WHERE id = $1 AND tenant_id = $2
    `, [campaignId, tenantId]);

    if (!campaign) {
      return res.status(404).json({ error: 'Campagne non trouvée' });
    }

    // Récupérer les relances
    const followUps = await queryAll(`
      SELECT id, follow_up_number, target_audience, delay_days,
             subject, html_content, status,
             total_eligible, total_sent, total_opened, total_clicked,
             scheduled_for, started_at, completed_at,
             created_at, updated_at
      FROM campaign_follow_ups
      WHERE campaign_id = $1
      ORDER BY follow_up_number ASC
    `, [campaignId]);

    // Stats de la campagne pour contexte
    const stats = await queryOne(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'sent') as total_sent,
        COUNT(*) FILTER (WHERE status = 'pending') as total_pending
      FROM email_queue
      WHERE campaign_id = $1
    `, [campaignId]);

    // Stats de tracking
    const trackingStats = await queryOne(`
      SELECT
        COUNT(DISTINCT lead_id) FILTER (WHERE event_type = 'open' AND follow_up_id IS NULL) as opened,
        COUNT(DISTINCT lead_id) FILTER (WHERE event_type = 'click' AND follow_up_id IS NULL) as clicked
      FROM email_tracking
      WHERE campaign_id = $1
    `, [campaignId]);

    res.json({
      success: true,
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        follow_ups_enabled: campaign.follow_ups_enabled,
        follow_ups_count: campaign.follow_ups_count,
        delay_days: campaign.follow_up_delay_days
      },
      campaign_stats: {
        ...stats,
        opened: trackingStats?.opened || 0,
        clicked: trackingStats?.clicked || 0
      },
      follow_ups: followUps
    });

  } catch (err) {
    error('❌ [API] Erreur GET follow-ups:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== ENABLE/UPDATE FOLLOW-UPS ====================
/**
 * POST /api/campaigns/:campaignId/follow-ups/enable
 * Active ou met à jour les relances pour une campagne
 */
router.post('/:campaignId/follow-ups/enable', authenticateToken, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const tenantId = req.user.tenant_id;

    // Validation
    const data = enableFollowUpsSchema.parse(req.body);

    // Vérifier la campagne
    const campaign = await queryOne(`
      SELECT id, name, status, follow_ups_enabled, subject, template_id
      FROM campaigns
      WHERE id = $1 AND tenant_id = $2
    `, [campaignId, tenantId]);

    if (!campaign) {
      return res.status(404).json({ error: 'Campagne non trouvée' });
    }

    if (campaign.status === 'archived' || campaign.status === 'closed') {
      return res.status(400).json({ error: 'Impossible de modifier les relances sur une campagne archivée ou clôturée' });
    }

    // Mettre à jour la campagne (activation ou mise à jour)
    await execute(`
      UPDATE campaigns
      SET follow_ups_enabled = true,
          follow_ups_count = $1,
          follow_up_delay_days = $2,
          updated_at = NOW()
      WHERE id = $3
    `, [data.follow_up_count, data.delay_days, campaignId]);

    const action = campaign.follow_ups_enabled ? 'mises à jour' : 'activées';
    log(`✅ [API] Relances ${action} pour campagne ${campaign.name}: ${data.follow_up_count} relance(s), ${data.delay_days} jours`);

    res.json({
      success: true,
      message: `Relances ${action}: ${data.follow_up_count} relance(s) avec ${data.delay_days} jours de délai`,
      next_step: campaign.follow_ups_enabled ? null : 'generate_templates'
    });

  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Données invalides', details: err.errors });
    }
    error('❌ [API] Erreur enable follow-ups:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== GENERATE TEMPLATES WITH ASEFI ====================
/**
 * POST /api/campaigns/:campaignId/follow-ups/generate-templates
 * Génère les templates de relance avec Asefi
 *
 * Pour nouvelles campagnes (campaignId=0), utilise les données du body:
 * - template_id: ID du template principal
 * - follow_up_count: Nombre de relances (1 ou 2)
 * - campaign_name, campaign_objective, goal_description
 */
router.post('/:campaignId/follow-ups/generate-templates', authenticateToken, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const tenantId = req.user?.tenant_id;

    if (!tenantId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    // CAS 1: Nouvelle campagne (campaignId = 0 ou "0")
    if (campaignId === '0' || campaignId === 0) {
      const { template_id, follow_up_count = 1, campaign_name, campaign_objective, goal_description } = req.body;

      if (!template_id) {
        return res.status(400).json({ error: 'template_id requis pour générer les templates' });
      }

      // Récupérer le template
      const template = await queryOne(`
        SELECT et.*, t.name as company_name
        FROM email_templates et
        LEFT JOIN tenants t ON et.tenant_id = t.id
        WHERE et.id = $1 AND et.tenant_id = $2
      `, [template_id, tenantId]);

      if (!template) {
        return res.status(404).json({ error: 'Template non trouvé' });
      }

      log(`🤖 [API] Génération templates relance pour nouvelle campagne...`);

      // Générer avec Asefi
      const result = await generateFollowUpTemplates({
        originalSubject: template.subject,
        originalHtml: template.html_body,
        campaignObjective: campaign_objective || goal_description || 'Prospection commerciale',
        companyName: template.company_name || 'Notre entreprise',
        followUpCount: follow_up_count,
        delayDays: 3
      });

      // Retourner les templates générés (sans les sauvegarder en DB car pas encore de campagne)
      const templates = [];

      if (result.templates.opened_not_clicked) {
        templates.push({
          follow_up_number: 1,
          target_audience: 'opened_not_clicked',
          subject: result.templates.opened_not_clicked.subject,
          html_content: result.templates.opened_not_clicked.html,
          delay_days: 3
        });
      }

      if (follow_up_count === 2 && result.templates.not_opened) {
        templates.push({
          follow_up_number: 2,
          target_audience: 'not_opened',
          subject: result.templates.not_opened.subject,
          html_content: result.templates.not_opened.html,
          delay_days: 6
        });
      }

      log(`✅ [API] ${templates.length} template(s) générés pour nouvelle campagne`);

      return res.json({
        success: true,
        templates,
        message: `${templates.length} template(s) de relance générés`
      });
    }

    // CAS 2: Campagne existante
    // Récupérer la campagne et son template
    const campaign = await queryOne(`
      SELECT c.*, et.html_body, et.subject as template_subject, t.name as company_name
      FROM campaigns c
      LEFT JOIN email_templates et ON c.template_id = et.id
      LEFT JOIN tenants t ON c.tenant_id = t.id
      WHERE c.id = $1 AND c.tenant_id = $2
    `, [campaignId, tenantId]);

    if (!campaign) {
      return res.status(404).json({ error: 'Campagne non trouvée' });
    }

    // Récupérer les paramètres du body ou de la campagne
    const { follow_up_count, delay_days } = req.body;
    const followUpCount = follow_up_count || campaign.follow_ups_count || 1;
    const delayDays = delay_days || campaign.follow_up_delay_days || 3;

    // Si les relances ne sont pas activées, les activer automatiquement
    if (!campaign.follow_ups_enabled) {
      log(`📌 [API] Activation automatique des relances pour campagne ${campaignId}`);
      await execute(`
        UPDATE campaigns
        SET follow_ups_enabled = true,
            follow_ups_count = $1,
            follow_up_delay_days = $2,
            updated_at = NOW()
        WHERE id = $3
      `, [followUpCount, delayDays, campaignId]);
    }

    if (!campaign.html_body) {
      return res.status(400).json({ error: 'Aucun template associé à cette campagne' });
    }

    log(`🤖 [API] Génération templates relance pour "${campaign.name}"...`);

    // Générer avec Asefi
    const result = await generateFollowUpTemplates({
      originalSubject: campaign.subject || campaign.template_subject,
      originalHtml: campaign.html_body,
      campaignObjective: campaign.objective || campaign.description,
      companyName: campaign.company_name || 'Notre entreprise',
      followUpCount: followUpCount,
      delayDays: delayDays
    });

    // Créer les entrées dans campaign_follow_ups
    const followUpsToCreate = [];

    // Relance 1: opened_not_clicked
    if (result.templates.opened_not_clicked) {
      followUpsToCreate.push({
        follow_up_number: 1,
        target_audience: 'opened_not_clicked',
        template: result.templates.opened_not_clicked
      });
    }

    // Relance 2: not_opened (si demandé)
    if (followUpCount === 2 && result.templates.not_opened) {
      followUpsToCreate.push({
        follow_up_number: 2,
        target_audience: 'not_opened',
        template: result.templates.not_opened
      });
    }

    // Insérer les relances
    const createdFollowUps = [];
    for (const fu of followUpsToCreate) {
      const created = await queryOne(`
        INSERT INTO campaign_follow_ups
        (campaign_id, tenant_id, follow_up_number, target_audience, delay_days,
         subject, html_content, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
        ON CONFLICT (campaign_id, follow_up_number)
        DO UPDATE SET
          subject = EXCLUDED.subject,
          html_content = EXCLUDED.html_content,
          updated_at = NOW()
        RETURNING *
      `, [
        campaignId,
        tenantId,
        fu.follow_up_number,
        fu.target_audience,
        campaign.follow_up_delay_days * fu.follow_up_number,
        fu.template.subject,
        fu.template.html
      ]);
      createdFollowUps.push(created);
    }

    log(`✅ [API] ${createdFollowUps.length} template(s) de relance créé(s)`);

    res.json({
      success: true,
      message: `${createdFollowUps.length} template(s) de relance généré(s) par Asefi`,
      follow_ups: createdFollowUps,
      analysis: result.analysis
    });

  } catch (err) {
    error('❌ [API] Erreur generate templates:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== UPDATE FOLLOW-UP ====================
/**
 * PUT /api/campaigns/:campaignId/follow-ups/:followUpId
 * Modifier une relance (subject, content, delay, status)
 */
router.put('/:campaignId/follow-ups/:followUpId', authenticateToken, async (req, res) => {
  try {
    const { campaignId, followUpId } = req.params;
    const tenantId = req.user.tenant_id;

    // Validation
    const data = updateFollowUpSchema.parse(req.body);

    // Vérifier la relance
    const followUp = await queryOne(`
      SELECT fu.*, c.name as campaign_name
      FROM campaign_follow_ups fu
      JOIN campaigns c ON fu.campaign_id = c.id
      WHERE fu.id = $1 AND fu.campaign_id = $2 AND fu.tenant_id = $3
    `, [followUpId, campaignId, tenantId]);

    if (!followUp) {
      return res.status(404).json({ error: 'Relance non trouvée' });
    }

    // Construire la mise à jour dynamique
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (data.subject !== undefined) {
      updates.push(`subject = $${paramIndex++}`);
      values.push(data.subject);
    }
    if (data.html_content !== undefined) {
      updates.push(`html_content = $${paramIndex++}`);
      values.push(data.html_content);
    }
    if (data.delay_days !== undefined) {
      updates.push(`delay_days = $${paramIndex++}`);
      values.push(data.delay_days);
    }
    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(data.status);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Aucune modification fournie' });
    }

    updates.push('updated_at = NOW()');
    values.push(followUpId);

    const updated = await queryOne(`
      UPDATE campaign_follow_ups
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, values);

    log(`✅ [API] Relance #${followUp.follow_up_number} mise à jour`);

    res.json({
      success: true,
      follow_up: updated
    });

  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Données invalides', details: err.errors });
    }
    error('❌ [API] Erreur update follow-up:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== REGENERATE TEMPLATE ====================
/**
 * POST /api/campaigns/:campaignId/follow-ups/:followUpId/regenerate
 * Régénère un template avec Asefi selon le feedback
 */
router.post('/:campaignId/follow-ups/:followUpId/regenerate', authenticateToken, async (req, res) => {
  try {
    const { campaignId, followUpId } = req.params;
    const { feedback } = req.body;
    const tenantId = req.user.tenant_id;

    // Récupérer la relance et la campagne
    const followUp = await queryOne(`
      SELECT fu.*, c.subject as campaign_subject, et.html_body as original_html,
             t.name as company_name
      FROM campaign_follow_ups fu
      JOIN campaigns c ON fu.campaign_id = c.id
      LEFT JOIN email_templates et ON c.template_id = et.id
      LEFT JOIN tenants t ON c.tenant_id = t.id
      WHERE fu.id = $1 AND fu.campaign_id = $2 AND fu.tenant_id = $3
    `, [followUpId, campaignId, tenantId]);

    if (!followUp) {
      return res.status(404).json({ error: 'Relance non trouvée' });
    }

    log(`🤖 [API] Régénération template relance #${followUp.follow_up_number}...`);

    const result = await regenerateFollowUpTemplate({
      targetAudience: followUp.target_audience,
      originalSubject: followUp.campaign_subject,
      originalHtml: followUp.original_html,
      previousTemplate: {
        subject: followUp.subject,
        html: followUp.html_content
      },
      feedback: feedback || '',
      companyName: followUp.company_name
    });

    // Mettre à jour
    const updated = await queryOne(`
      UPDATE campaign_follow_ups
      SET subject = $1, html_content = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [result.template.subject, result.template.html, followUpId]);

    res.json({
      success: true,
      message: 'Template régénéré avec succès',
      follow_up: updated
    });

  } catch (err) {
    error('❌ [API] Erreur regenerate:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== DISABLE FOLLOW-UPS ====================
/**
 * DELETE /api/campaigns/:campaignId/follow-ups
 * Désactive les relances pour une campagne
 */
router.delete('/:campaignId/follow-ups', authenticateToken, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const tenantId = req.user.tenant_id;

    // Vérifier la campagne
    const campaign = await queryOne(`
      SELECT id, name FROM campaigns
      WHERE id = $1 AND tenant_id = $2
    `, [campaignId, tenantId]);

    if (!campaign) {
      return res.status(404).json({ error: 'Campagne non trouvée' });
    }

    // Annuler les relances en cours
    await execute(`
      UPDATE campaign_follow_ups
      SET status = 'cancelled', updated_at = NOW()
      WHERE campaign_id = $1 AND status IN ('pending', 'scheduled', 'active')
    `, [campaignId]);

    // Désactiver sur la campagne
    await execute(`
      UPDATE campaigns
      SET follow_ups_enabled = false, updated_at = NOW()
      WHERE id = $1
    `, [campaignId]);

    log(`✅ [API] Relances désactivées pour campagne ${campaign.name}`);

    res.json({
      success: true,
      message: 'Relances désactivées'
    });

  } catch (err) {
    error('❌ [API] Erreur disable follow-ups:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== START NOW (FORCE) ====================
/**
 * POST /api/campaigns/:campaignId/follow-ups/start-now
 * Force le démarrage immédiat des relances (sans attendre le délai)
 */
router.post('/:campaignId/follow-ups/start-now', authenticateToken, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const tenantId = req.user.tenant_id;

    // Vérifier la campagne
    const campaign = await queryOne(`
      SELECT c.*, t.name as company_name
      FROM campaigns c
      LEFT JOIN tenants t ON c.tenant_id = t.id
      WHERE c.id = $1 AND c.tenant_id = $2
    `, [campaignId, tenantId]);

    if (!campaign) {
      return res.status(404).json({ error: 'Campagne non trouvée' });
    }

    if (!campaign.follow_ups_enabled) {
      return res.status(400).json({ error: 'Les relances ne sont pas activées pour cette campagne' });
    }

    // Récupérer les relances en attente
    const pendingFollowUps = await queryAll(`
      SELECT * FROM campaign_follow_ups
      WHERE campaign_id = $1
      AND status IN ('pending', 'scheduled')
      ORDER BY follow_up_number ASC
    `, [campaignId]);

    if (pendingFollowUps.length === 0) {
      return res.status(400).json({ error: 'Aucune relance en attente à démarrer' });
    }

    let totalEligible = 0;
    let followUpsStarted = 0;

    for (const followUp of pendingFollowUps) {
      // Identifier les leads éligibles et les ajouter à la queue
      let eligibleLeadsQuery;

      if (followUp.target_audience === 'opened_not_clicked') {
        eligibleLeadsQuery = `
          SELECT DISTINCT l.id as lead_id, l.email
          FROM leads l
          JOIN email_queue eq ON eq.lead_id = l.id AND eq.campaign_id = $1
          WHERE eq.status = 'sent'
          AND l.unsubscribed = false
          AND EXISTS (
            SELECT 1 FROM email_tracking et
            WHERE et.lead_id = l.id AND et.campaign_id = $1
            AND et.event_type = 'open' AND et.follow_up_id IS NULL
          )
          AND NOT EXISTS (
            SELECT 1 FROM email_tracking et
            WHERE et.lead_id = l.id AND et.campaign_id = $1
            AND et.event_type = 'click' AND et.follow_up_id IS NULL
          )
          AND NOT EXISTS (
            SELECT 1 FROM follow_up_queue fq
            WHERE fq.lead_id = l.id AND fq.follow_up_id = $2
          )
          AND eq.status != 'bounced'
        `;
      } else {
        eligibleLeadsQuery = `
          SELECT DISTINCT l.id as lead_id, l.email
          FROM leads l
          JOIN email_queue eq ON eq.lead_id = l.id AND eq.campaign_id = $1
          WHERE eq.status = 'sent'
          AND l.unsubscribed = false
          AND NOT EXISTS (
            SELECT 1 FROM email_tracking et
            WHERE et.lead_id = l.id AND et.campaign_id = $1
            AND et.event_type = 'open' AND et.follow_up_id IS NULL
          )
          AND NOT EXISTS (
            SELECT 1 FROM follow_up_queue fq
            WHERE fq.lead_id = l.id AND fq.follow_up_id = $2
          )
          AND eq.status != 'bounced'
        `;
      }

      const eligibleLeads = await queryAll(eligibleLeadsQuery, [campaignId, followUp.id]);

      if (eligibleLeads.length > 0) {
        // Insérer dans la queue
        const values = eligibleLeads.map(lead =>
          `('${followUp.id}', '${campaignId}', '${lead.lead_id}', '${tenantId}', '${lead.email}', 'pending', NOW())`
        ).join(',\n');

        await execute(`
          INSERT INTO follow_up_queue
          (follow_up_id, campaign_id, lead_id, tenant_id, recipient_email, status, created_at)
          VALUES ${values}
          ON CONFLICT (follow_up_id, lead_id) DO NOTHING
        `);

        totalEligible += eligibleLeads.length;
      }

      // Activer la relance
      await execute(`
        UPDATE campaign_follow_ups
        SET status = 'active',
            total_eligible = $1,
            started_at = NOW(),
            updated_at = NOW()
        WHERE id = $2
      `, [eligibleLeads.length, followUp.id]);

      followUpsStarted++;
    }

    // Mettre à jour le statut de la campagne
    await execute(`
      UPDATE campaigns
      SET status = 'relances_en_cours', updated_at = NOW()
      WHERE id = $1
    `, [campaignId]);

    log(`🚀 [API] Relances démarrées manuellement pour ${campaign.name}: ${totalEligible} leads éligibles`);

    res.json({
      success: true,
      message: `${followUpsStarted} relance(s) démarrée(s) avec ${totalEligible} leads éligibles`,
      total_eligible: totalEligible,
      follow_ups_started: followUpsStarted
    });

  } catch (err) {
    error('❌ [API] Erreur start-now:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== PAUSE/RESUME FOLLOW-UP ====================
/**
 * POST /api/campaigns/:campaignId/follow-ups/:followUpId/pause
 * Met en pause une relance spécifique
 */
router.post('/:campaignId/follow-ups/:followUpId/pause', authenticateToken, async (req, res) => {
  try {
    const { campaignId, followUpId } = req.params;
    const tenantId = req.user.tenant_id;

    const followUp = await queryOne(`
      SELECT fu.*, c.name as campaign_name
      FROM campaign_follow_ups fu
      JOIN campaigns c ON fu.campaign_id = c.id
      WHERE fu.id = $1 AND fu.campaign_id = $2 AND fu.tenant_id = $3
    `, [followUpId, campaignId, tenantId]);

    if (!followUp) {
      return res.status(404).json({ error: 'Relance non trouvée' });
    }

    if (followUp.status === 'completed' || followUp.status === 'cancelled') {
      return res.status(400).json({ error: 'Impossible de mettre en pause une relance terminée ou annulée' });
    }

    await execute(`
      UPDATE campaign_follow_ups
      SET status = 'paused', updated_at = NOW()
      WHERE id = $1
    `, [followUpId]);

    log(`⏸️ [API] Relance #${followUp.follow_up_number} mise en pause`);

    res.json({
      success: true,
      message: `Relance #${followUp.follow_up_number} mise en pause`
    });

  } catch (err) {
    error('❌ [API] Erreur pause follow-up:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/campaigns/:campaignId/follow-ups/:followUpId/resume
 * Reprend une relance mise en pause
 */
router.post('/:campaignId/follow-ups/:followUpId/resume', authenticateToken, async (req, res) => {
  try {
    const { campaignId, followUpId } = req.params;
    const tenantId = req.user.tenant_id;

    const followUp = await queryOne(`
      SELECT fu.*, c.name as campaign_name
      FROM campaign_follow_ups fu
      JOIN campaigns c ON fu.campaign_id = c.id
      WHERE fu.id = $1 AND fu.campaign_id = $2 AND fu.tenant_id = $3
    `, [followUpId, campaignId, tenantId]);

    if (!followUp) {
      return res.status(404).json({ error: 'Relance non trouvée' });
    }

    if (followUp.status !== 'paused') {
      return res.status(400).json({ error: 'Cette relance n\'est pas en pause' });
    }

    await execute(`
      UPDATE campaign_follow_ups
      SET status = 'active', updated_at = NOW()
      WHERE id = $1
    `, [followUpId]);

    log(`▶️ [API] Relance #${followUp.follow_up_number} reprise`);

    res.json({
      success: true,
      message: `Relance #${followUp.follow_up_number} reprise`
    });

  } catch (err) {
    error('❌ [API] Erreur resume follow-up:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/campaigns/:campaignId/follow-ups/:followUpId/cancel
 * Annule définitivement une relance
 */
router.post('/:campaignId/follow-ups/:followUpId/cancel', authenticateToken, async (req, res) => {
  try {
    const { campaignId, followUpId } = req.params;
    const tenantId = req.user.tenant_id;

    const followUp = await queryOne(`
      SELECT fu.*, c.name as campaign_name
      FROM campaign_follow_ups fu
      JOIN campaigns c ON fu.campaign_id = c.id
      WHERE fu.id = $1 AND fu.campaign_id = $2 AND fu.tenant_id = $3
    `, [followUpId, campaignId, tenantId]);

    if (!followUp) {
      return res.status(404).json({ error: 'Relance non trouvée' });
    }

    if (followUp.status === 'completed') {
      return res.status(400).json({ error: 'Impossible d\'annuler une relance déjà terminée' });
    }

    await execute(`
      UPDATE campaign_follow_ups
      SET status = 'cancelled', updated_at = NOW()
      WHERE id = $1
    `, [followUpId]);

    // Annuler aussi les emails en attente dans la queue
    await execute(`
      UPDATE follow_up_queue
      SET status = 'cancelled'
      WHERE follow_up_id = $1 AND status = 'pending'
    `, [followUpId]);

    log(`🛑 [API] Relance #${followUp.follow_up_number} annulée`);

    res.json({
      success: true,
      message: `Relance #${followUp.follow_up_number} annulée définitivement`
    });

  } catch (err) {
    error('❌ [API] Erreur cancel follow-up:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== ANALYZE DELIVERABILITY ====================
/**
 * GET /api/campaigns/:campaignId/follow-ups/analyze
 * Analyse les problèmes de délivrabilité avec Asefi
 */
router.get('/:campaignId/follow-ups/analyze', authenticateToken, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const tenantId = req.user.tenant_id;

    // Récupérer les stats de la campagne
    const campaign = await queryOne(`
      SELECT c.*, t.name as company_name
      FROM campaigns c
      JOIN tenants t ON c.tenant_id = t.id
      WHERE c.id = $1 AND c.tenant_id = $2
    `, [campaignId, tenantId]);

    if (!campaign) {
      return res.status(404).json({ error: 'Campagne non trouvée' });
    }

    const stats = await queryOne(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'sent') as sent_count,
        COUNT(*) FILTER (WHERE status = 'bounced') as bounced_count
      FROM email_queue
      WHERE campaign_id = $1
    `, [campaignId]);

    const trackingStats = await queryOne(`
      SELECT
        COUNT(DISTINCT lead_id) FILTER (WHERE event_type = 'open') as opened_count
      FROM email_tracking
      WHERE campaign_id = $1 AND follow_up_id IS NULL
    `, [campaignId]);

    // Analyser avec Asefi
    const analysis = await analyzeDeliverabilityIssues({
      subject: campaign.subject,
      sentCount: parseInt(stats?.sent_count || 0),
      openedCount: parseInt(trackingStats?.opened_count || 0),
      senderName: 'LeadSync',
      sendTime: campaign.send_time_start || '09:00'
    });

    res.json({
      success: true,
      campaign: {
        id: campaign.id,
        name: campaign.name,
        subject: campaign.subject
      },
      stats: {
        sent: stats?.sent_count || 0,
        opened: trackingStats?.opened_count || 0,
        bounced: stats?.bounced_count || 0,
        open_rate: stats?.sent_count > 0
          ? ((trackingStats?.opened_count || 0) / stats.sent_count * 100).toFixed(1)
          : 0
      },
      analysis: analysis.analysis
    });

  } catch (err) {
    error('❌ [API] Erreur analyze:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== GET FOLLOW-UP STATS ====================
/**
 * GET /api/campaigns/:campaignId/follow-ups/:followUpId/stats
 * Stats détaillées d'une relance
 */
router.get('/:campaignId/follow-ups/:followUpId/stats', authenticateToken, async (req, res) => {
  try {
    const { campaignId, followUpId } = req.params;
    const tenantId = req.user.tenant_id;

    const followUp = await queryOne(`
      SELECT * FROM campaign_follow_ups
      WHERE id = $1 AND campaign_id = $2 AND tenant_id = $3
    `, [followUpId, campaignId, tenantId]);

    if (!followUp) {
      return res.status(404).json({ error: 'Relance non trouvée' });
    }

    // Stats de la queue
    const queueStats = await queryOne(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'sent') as sent,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) FILTER (WHERE status = 'skipped') as skipped
      FROM follow_up_queue
      WHERE follow_up_id = $1
    `, [followUpId]);

    // Stats de tracking
    const trackingStats = await queryOne(`
      SELECT
        COUNT(DISTINCT lead_id) FILTER (WHERE event_type = 'open') as opened,
        COUNT(DISTINCT lead_id) FILTER (WHERE event_type = 'click') as clicked
      FROM email_tracking
      WHERE campaign_id = $1 AND follow_up_id = $2
    `, [campaignId, followUpId]);

    res.json({
      success: true,
      follow_up: {
        id: followUp.id,
        follow_up_number: followUp.follow_up_number,
        target_audience: followUp.target_audience,
        status: followUp.status
      },
      stats: {
        queue: queueStats,
        tracking: {
          opened: trackingStats?.opened || 0,
          clicked: trackingStats?.clicked || 0
        },
        rates: {
          open_rate: queueStats?.sent > 0
            ? ((trackingStats?.opened || 0) / queueStats.sent * 100).toFixed(1)
            : 0,
          click_rate: queueStats?.sent > 0
            ? ((trackingStats?.clicked || 0) / queueStats.sent * 100).toFixed(1)
            : 0
        }
      }
    });

  } catch (err) {
    error('❌ [API] Erreur stats follow-up:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
