/**
 * API Endpoints pour la Modification de Campagnes
 *
 * Permet de modifier une campagne en cours :
 * - Changer le message/template
 * - Ajouter/retirer des leads
 * - Ajouter/retirer des commerciaux
 *
 * @module api/campaigns-modify
 */

import { Router } from 'express';
import { log, error, warn } from '../lib/logger.js';
import db from '../config/db.js';
import { z } from 'zod';

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
const updateContentSchema = z.object({
  subject: z.string().min(1).max(500).optional(),
  template_id: z.string().uuid().optional(),
  html_content: z.string().optional() // Si on veut modifier directement le contenu
});

const addLeadsSchema = z.object({
  lead_ids: z.array(z.string().uuid()).min(1),
  skip_unsubscribed_check: z.boolean().default(false)
});

const removeLeadsSchema = z.object({
  lead_ids: z.array(z.string().uuid()).optional(),
  remove_all_from_sector: z.string().optional(),
  remove_all_from_database: z.string().uuid().optional()
});

const addUserSchema = z.object({
  user_id: z.string().uuid(),
  lead_distribution: z.enum(['none', 'equal', 'remaining']).default('none')
});

const removeUserSchema = z.object({
  user_id: z.string().uuid(),
  reassign_to: z.string().uuid().optional(), // Réattribuer à un user spécifique
  auto_distribute: z.boolean().default(false), // Distribution auto aux autres
  delete_leads: z.boolean().default(false) // Supprimer les leads
});

// ==================== UPDATE CAMPAIGN CONTENT ====================
/**
 * PUT /api/campaigns/:campaignId/content
 * Modifier le contenu de la campagne (sujet, template)
 */
router.put('/:campaignId/content', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const tenantId = req.user.tenant_id;

    const data = updateContentSchema.parse(req.body);

    // Vérifier la campagne
    const campaign = await queryOne(`
      SELECT id, name, status, template_id
      FROM campaigns
      WHERE id = $1 AND tenant_id = $2
    `, [campaignId, tenantId]);

    if (!campaign) {
      return res.status(404).json({ error: 'Campagne non trouvée' });
    }

    if (campaign.status === 'archived') {
      return res.status(400).json({ error: 'Impossible de modifier une campagne archivée' });
    }

    // Construire la mise à jour
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (data.subject !== undefined) {
      updates.push(`subject = $${paramIndex++}`);
      values.push(data.subject);
    }

    if (data.template_id !== undefined) {
      // Vérifier que le template existe et appartient au tenant
      const template = await queryOne(`
        SELECT id FROM email_templates
        WHERE id = $1 AND tenant_id = $2
      `, [data.template_id, tenantId]);

      if (!template) {
        return res.status(404).json({ error: 'Template non trouvé' });
      }

      updates.push(`template_id = $${paramIndex++}`);
      values.push(data.template_id);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Aucune modification fournie' });
    }

    updates.push('updated_at = NOW()');
    values.push(campaignId);

    await execute(`
      UPDATE campaigns
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
    `, values);

    log(`✅ [API] Campagne "${campaign.name}" - contenu mis à jour`);

    res.json({
      success: true,
      message: 'Contenu de la campagne mis à jour'
    });

  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Données invalides', details: err.errors });
    }
    error('❌ [API] Erreur update content:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== ADD LEADS TO CAMPAIGN ====================
/**
 * POST /api/campaigns/:campaignId/leads
 * Ajouter des leads à une campagne
 */
router.post('/:campaignId/leads', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;

    const data = addLeadsSchema.parse(req.body);

    // Vérifier la campagne
    const campaign = await queryOne(`
      SELECT id, name, status, type
      FROM campaigns
      WHERE id = $1 AND tenant_id = $2
    `, [campaignId, tenantId]);

    if (!campaign) {
      return res.status(404).json({ error: 'Campagne non trouvée' });
    }

    if (campaign.status === 'archived') {
      return res.status(400).json({ error: 'Impossible d\'ajouter des leads à une campagne archivée' });
    }

    // Vérifier les leads
    const leads = await queryAll(`
      SELECT id, email, unsubscribed
      FROM leads
      WHERE id = ANY($1) AND tenant_id = $2
    `, [data.lead_ids, tenantId]);

    if (leads.length === 0) {
      return res.status(404).json({ error: 'Aucun lead trouvé' });
    }

    // Vérifier les désinscrits
    const unsubscribedLeads = leads.filter(l => l.unsubscribed);
    if (unsubscribedLeads.length > 0 && !data.skip_unsubscribed_check) {
      // Vérifier aussi dans email_unsubscribes
      const unsubscribedEmails = await queryAll(`
        SELECT email, reason, unsubscribed_at
        FROM email_unsubscribes
        WHERE tenant_id = $1 AND email = ANY($2)
      `, [tenantId, unsubscribedLeads.map(l => l.email)]);

      return res.status(400).json({
        error: 'Certains leads sont désinscrits',
        unsubscribed: unsubscribedLeads.map(l => ({
          id: l.id,
          email: l.email,
          unsubscribe_info: unsubscribedEmails.find(u => u.email === l.email)
        })),
        action_required: 'confirm_with_skip_unsubscribed_check_true'
      });
    }

    // Logger si on force l'ajout de désinscrits
    if (unsubscribedLeads.length > 0 && data.skip_unsubscribed_check) {
      for (const lead of unsubscribedLeads) {
        await execute(`
          INSERT INTO unsubscribe_override_log
          (tenant_id, user_id, lead_email, lead_id, campaign_id, context, decision, reason)
          VALUES ($1, $2, $3, $4, $5, 'add_to_campaign', 'forced_include', 'Ajout manuel après avertissement')
        `, [tenantId, userId, lead.email, lead.id, campaignId]);
      }
      warn(`⚠️ [API] ${unsubscribedLeads.length} leads désinscrits ajoutés de force à la campagne ${campaign.name}`);
    }

    // Vérifier les leads déjà dans la campagne
    const existingLeads = await queryAll(`
      SELECT lead_id FROM email_queue
      WHERE campaign_id = $1 AND lead_id = ANY($2)
    `, [campaignId, data.lead_ids]);

    const existingIds = new Set(existingLeads.map(l => l.lead_id));
    const newLeads = leads.filter(l => !existingIds.has(l.id));

    if (newLeads.length === 0) {
      return res.status(400).json({
        error: 'Tous les leads sont déjà dans cette campagne',
        existing_count: existingLeads.length
      });
    }

    // Ajouter à la queue (pour campagnes email)
    if (campaign.type === 'email') {
      const values = newLeads.map(lead =>
        `('${campaignId}', '${lead.id}', '${tenantId}', '${lead.email}', 'pending', NOW())`
      ).join(',\n');

      await execute(`
        INSERT INTO email_queue
        (campaign_id, lead_id, tenant_id, recipient_email, status, created_at)
        VALUES ${values}
        ON CONFLICT DO NOTHING
      `);
    }

    // Mettre à jour le total_leads de la campagne
    const totalLeads = await queryOne(`
      SELECT COUNT(*) as count FROM email_queue WHERE campaign_id = $1
    `, [campaignId]);

    await execute(`
      UPDATE campaigns SET total_leads = $1, updated_at = NOW() WHERE id = $2
    `, [totalLeads.count, campaignId]);

    log(`✅ [API] ${newLeads.length} leads ajoutés à la campagne "${campaign.name}"`);

    res.json({
      success: true,
      added: newLeads.length,
      skipped_existing: existingLeads.length,
      unsubscribed_forced: data.skip_unsubscribed_check ? unsubscribedLeads.length : 0,
      total_leads: parseInt(totalLeads.count)
    });

  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Données invalides', details: err.errors });
    }
    error('❌ [API] Erreur add leads:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== REMOVE LEADS FROM CAMPAIGN ====================
/**
 * DELETE /api/campaigns/:campaignId/leads
 * Retirer des leads d'une campagne
 */
router.delete('/:campaignId/leads', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const tenantId = req.user.tenant_id;

    const data = removeLeadsSchema.parse(req.body);

    // Vérifier la campagne
    const campaign = await queryOne(`
      SELECT id, name, status
      FROM campaigns
      WHERE id = $1 AND tenant_id = $2
    `, [campaignId, tenantId]);

    if (!campaign) {
      return res.status(404).json({ error: 'Campagne non trouvée' });
    }

    if (campaign.status === 'archived') {
      return res.status(400).json({ error: 'Impossible de modifier une campagne archivée' });
    }

    let removedCount = 0;

    if (data.lead_ids && data.lead_ids.length > 0) {
      // Retirer des leads spécifiques (seulement ceux pas encore envoyés)
      const result = await execute(`
        DELETE FROM email_queue
        WHERE campaign_id = $1 AND lead_id = ANY($2) AND status = 'pending'
        RETURNING id
      `, [campaignId, data.lead_ids]);
      removedCount = result.rowCount;
    } else if (data.remove_all_from_sector) {
      // Retirer tous les leads d'un secteur
      const result = await execute(`
        DELETE FROM email_queue eq
        USING leads l
        WHERE eq.campaign_id = $1
        AND eq.lead_id = l.id
        AND l.sector = $2
        AND eq.status = 'pending'
        RETURNING eq.id
      `, [campaignId, data.remove_all_from_sector]);
      removedCount = result.rowCount;
    } else if (data.remove_all_from_database) {
      // Retirer tous les leads d'une database
      const result = await execute(`
        DELETE FROM email_queue eq
        USING lead_database_relations ldr
        WHERE eq.campaign_id = $1
        AND eq.lead_id = ldr.lead_id
        AND ldr.database_id = $2
        AND eq.status = 'pending'
        RETURNING eq.id
      `, [campaignId, data.remove_all_from_database]);
      removedCount = result.rowCount;
    } else {
      return res.status(400).json({
        error: 'Spécifiez lead_ids, remove_all_from_sector ou remove_all_from_database'
      });
    }

    // Mettre à jour le total_leads
    const totalLeads = await queryOne(`
      SELECT COUNT(*) as count FROM email_queue WHERE campaign_id = $1
    `, [campaignId]);

    await execute(`
      UPDATE campaigns SET total_leads = $1, updated_at = NOW() WHERE id = $2
    `, [totalLeads.count, campaignId]);

    log(`✅ [API] ${removedCount} leads retirés de la campagne "${campaign.name}"`);

    res.json({
      success: true,
      removed: removedCount,
      remaining_leads: parseInt(totalLeads.count)
    });

  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Données invalides', details: err.errors });
    }
    error('❌ [API] Erreur remove leads:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== ADD USER TO CAMPAIGN ====================
/**
 * POST /api/campaigns/:campaignId/users
 * Ajouter un commercial/manager à une campagne
 */
router.post('/:campaignId/users', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const tenantId = req.user.tenant_id;

    const data = addUserSchema.parse(req.body);

    // Vérifier la campagne
    const campaign = await queryOne(`
      SELECT id, name, status, assigned_users
      FROM campaigns
      WHERE id = $1 AND tenant_id = $2
    `, [campaignId, tenantId]);

    if (!campaign) {
      return res.status(404).json({ error: 'Campagne non trouvée' });
    }

    if (campaign.status === 'archived') {
      return res.status(400).json({ error: 'Impossible de modifier une campagne archivée' });
    }

    // Vérifier l'utilisateur
    const user = await queryOne(`
      SELECT id, first_name, last_name, role
      FROM users
      WHERE id = $1 AND tenant_id = $2
    `, [data.user_id, tenantId]);

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Vérifier si déjà assigné
    let assignedUsers = campaign.assigned_users || [];
    if (typeof assignedUsers === 'string') {
      assignedUsers = JSON.parse(assignedUsers);
    }

    if (assignedUsers.includes(data.user_id)) {
      return res.status(400).json({ error: 'Utilisateur déjà assigné à cette campagne' });
    }

    // Ajouter l'utilisateur
    assignedUsers.push(data.user_id);

    await execute(`
      UPDATE campaigns
      SET assigned_users = $1, updated_at = NOW()
      WHERE id = $2
    `, [JSON.stringify(assignedUsers), campaignId]);

    // Si distribution demandée
    let distributedLeads = 0;
    if (data.lead_distribution !== 'none') {
      distributedLeads = await distributeLeadsToUser(campaignId, data.user_id, data.lead_distribution, assignedUsers);
    }

    log(`✅ [API] ${user.first_name} ${user.last_name} ajouté à la campagne "${campaign.name}"`);

    res.json({
      success: true,
      message: `Utilisateur ajouté à la campagne`,
      user: {
        id: user.id,
        name: `${user.first_name} ${user.last_name}`,
        role: user.role
      },
      leads_distributed: distributedLeads
    });

  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Données invalides', details: err.errors });
    }
    error('❌ [API] Erreur add user:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== REMOVE USER FROM CAMPAIGN ====================
/**
 * DELETE /api/campaigns/:campaignId/users/:userId
 * Retirer un commercial/manager d'une campagne
 */
router.delete('/:campaignId/users/:userId', async (req, res) => {
  try {
    const { campaignId, userId } = req.params;
    const tenantId = req.user.tenant_id;

    const data = removeUserSchema.parse({ ...req.body, user_id: userId });

    // Vérifier la campagne
    const campaign = await queryOne(`
      SELECT id, name, status, assigned_users
      FROM campaigns
      WHERE id = $1 AND tenant_id = $2
    `, [campaignId, tenantId]);

    if (!campaign) {
      return res.status(404).json({ error: 'Campagne non trouvée' });
    }

    if (campaign.status === 'archived') {
      return res.status(400).json({ error: 'Impossible de modifier une campagne archivée' });
    }

    // Vérifier l'utilisateur
    const user = await queryOne(`
      SELECT id, first_name, last_name
      FROM users
      WHERE id = $1 AND tenant_id = $2
    `, [userId, tenantId]);

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Vérifier les leads assignés à cet utilisateur dans cette campagne
    const assignedLeads = await queryAll(`
      SELECT eq.id, eq.lead_id
      FROM email_queue eq
      JOIN leads l ON eq.lead_id = l.id
      WHERE eq.campaign_id = $1 AND l.assigned_to = $2 AND eq.status = 'pending'
    `, [campaignId, userId]);

    // Si leads assignés et aucune action spécifiée
    if (assignedLeads.length > 0 && !data.reassign_to && !data.auto_distribute && !data.delete_leads) {
      return res.status(400).json({
        error: 'Cet utilisateur a des leads assignés',
        assigned_leads_count: assignedLeads.length,
        options: {
          reassign_to: 'UUID d\'un autre utilisateur pour réattribution',
          auto_distribute: 'true pour distribution automatique aux autres',
          delete_leads: 'true pour supprimer les leads de la campagne'
        }
      });
    }

    let leadsHandled = 0;

    // Gérer les leads assignés
    if (assignedLeads.length > 0) {
      const leadIds = assignedLeads.map(l => l.lead_id);

      if (data.reassign_to) {
        // Réattribuer à un utilisateur spécifique
        const targetUser = await queryOne(`
          SELECT id FROM users WHERE id = $1 AND tenant_id = $2
        `, [data.reassign_to, tenantId]);

        if (!targetUser) {
          return res.status(404).json({ error: 'Utilisateur cible non trouvé' });
        }

        await execute(`
          UPDATE leads SET assigned_to = $1, updated_at = NOW()
          WHERE id = ANY($2)
        `, [data.reassign_to, leadIds]);

        leadsHandled = leadIds.length;
        log(`✅ [API] ${leadsHandled} leads réattribués à ${data.reassign_to}`);

      } else if (data.auto_distribute) {
        // Distribution automatique aux autres utilisateurs
        let assignedUsers = campaign.assigned_users || [];
        if (typeof assignedUsers === 'string') {
          assignedUsers = JSON.parse(assignedUsers);
        }

        const otherUsers = assignedUsers.filter(u => u !== userId);

        if (otherUsers.length === 0) {
          return res.status(400).json({
            error: 'Aucun autre utilisateur dans la campagne pour la redistribution'
          });
        }

        // Distribution round-robin
        for (let i = 0; i < leadIds.length; i++) {
          const targetUserId = otherUsers[i % otherUsers.length];
          await execute(`
            UPDATE leads SET assigned_to = $1, updated_at = NOW()
            WHERE id = $2
          `, [targetUserId, leadIds[i]]);
        }

        leadsHandled = leadIds.length;
        log(`✅ [API] ${leadsHandled} leads redistribués entre ${otherUsers.length} utilisateurs`);

      } else if (data.delete_leads) {
        // Supprimer les leads de la campagne
        await execute(`
          DELETE FROM email_queue
          WHERE campaign_id = $1 AND lead_id = ANY($2)
        `, [campaignId, leadIds]);

        leadsHandled = leadIds.length;
        log(`✅ [API] ${leadsHandled} leads supprimés de la campagne`);
      }
    }

    // Retirer l'utilisateur de la liste assigned_users
    let assignedUsers = campaign.assigned_users || [];
    if (typeof assignedUsers === 'string') {
      assignedUsers = JSON.parse(assignedUsers);
    }

    assignedUsers = assignedUsers.filter(u => u !== userId);

    await execute(`
      UPDATE campaigns
      SET assigned_users = $1, updated_at = NOW()
      WHERE id = $2
    `, [JSON.stringify(assignedUsers), campaignId]);

    // Mettre à jour total_leads si nécessaire
    if (data.delete_leads) {
      const totalLeads = await queryOne(`
        SELECT COUNT(*) as count FROM email_queue WHERE campaign_id = $1
      `, [campaignId]);

      await execute(`
        UPDATE campaigns SET total_leads = $1 WHERE id = $2
      `, [totalLeads.count, campaignId]);
    }

    log(`✅ [API] ${user.first_name} ${user.last_name} retiré de la campagne "${campaign.name}"`);

    res.json({
      success: true,
      message: `Utilisateur retiré de la campagne`,
      user_removed: {
        id: user.id,
        name: `${user.first_name} ${user.last_name}`
      },
      leads_handled: leadsHandled,
      action_taken: data.reassign_to ? 'reassigned' : data.auto_distribute ? 'distributed' : data.delete_leads ? 'deleted' : 'none'
    });

  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Données invalides', details: err.errors });
    }
    error('❌ [API] Erreur remove user:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== GET CAMPAIGN USERS ====================
/**
 * GET /api/campaigns/:campaignId/users
 * Liste des utilisateurs assignés à une campagne avec leurs stats
 */
router.get('/:campaignId/users', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const tenantId = req.user.tenant_id;

    const campaign = await queryOne(`
      SELECT id, name, assigned_users
      FROM campaigns
      WHERE id = $1 AND tenant_id = $2
    `, [campaignId, tenantId]);

    if (!campaign) {
      return res.status(404).json({ error: 'Campagne non trouvée' });
    }

    let assignedUsers = campaign.assigned_users || [];
    if (typeof assignedUsers === 'string') {
      assignedUsers = JSON.parse(assignedUsers);
    }

    if (assignedUsers.length === 0) {
      return res.json({
        success: true,
        users: []
      });
    }

    // Récupérer les détails des utilisateurs avec leurs stats
    const users = await queryAll(`
      SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.role,
        (
          SELECT COUNT(*)
          FROM email_queue eq
          JOIN leads l ON eq.lead_id = l.id
          WHERE eq.campaign_id = $1 AND l.assigned_to = u.id
        ) as leads_assigned,
        (
          SELECT COUNT(*)
          FROM email_queue eq
          JOIN leads l ON eq.lead_id = l.id
          WHERE eq.campaign_id = $1 AND l.assigned_to = u.id AND eq.status = 'sent'
        ) as leads_contacted
      FROM users u
      WHERE u.id = ANY($2)
    `, [campaignId, assignedUsers]);

    res.json({
      success: true,
      users: users.map(u => ({
        id: u.id,
        name: `${u.first_name} ${u.last_name}`,
        email: u.email,
        role: u.role,
        stats: {
          leads_assigned: parseInt(u.leads_assigned || 0),
          leads_contacted: parseInt(u.leads_contacted || 0)
        }
      }))
    });

  } catch (err) {
    error('❌ [API] Erreur get users:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== HELPER: Distribute leads to user ====================
async function distributeLeadsToUser(campaignId, userId, distribution, allUsers) {
  if (distribution === 'none') return 0;

  // Récupérer les leads non assignés ou à redistribuer
  let leadsToDistribute;

  if (distribution === 'equal') {
    // Redistribution égale: prendre des leads des autres pour équilibrer
    const leadsPerUser = await queryOne(`
      SELECT
        (SELECT COUNT(*) FROM email_queue eq JOIN leads l ON eq.lead_id = l.id
         WHERE eq.campaign_id = $1 AND eq.status = 'pending') / $2 as target_per_user
    `, [campaignId, allUsers.length]);

    const targetPerUser = Math.floor(leadsPerUser?.target_per_user || 0);

    leadsToDistribute = await queryAll(`
      SELECT eq.lead_id
      FROM email_queue eq
      JOIN leads l ON eq.lead_id = l.id
      WHERE eq.campaign_id = $1
      AND eq.status = 'pending'
      AND (l.assigned_to IS NULL OR l.assigned_to != $2)
      ORDER BY RANDOM()
      LIMIT $3
    `, [campaignId, userId, targetPerUser]);

  } else if (distribution === 'remaining') {
    // Seulement les leads non assignés
    leadsToDistribute = await queryAll(`
      SELECT eq.lead_id
      FROM email_queue eq
      JOIN leads l ON eq.lead_id = l.id
      WHERE eq.campaign_id = $1
      AND eq.status = 'pending'
      AND l.assigned_to IS NULL
    `, [campaignId]);
  }

  if (!leadsToDistribute || leadsToDistribute.length === 0) return 0;

  const leadIds = leadsToDistribute.map(l => l.lead_id);

  await execute(`
    UPDATE leads SET assigned_to = $1, updated_at = NOW()
    WHERE id = ANY($2)
  `, [userId, leadIds]);

  return leadIds.length;
}

export default router;
