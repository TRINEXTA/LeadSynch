import { log, error, warn } from "../lib/logger.js";
import express from 'express';
import { z } from 'zod';
import { authMiddleware as authenticateToken } from '../middleware/auth.js';
import db from '../config/db.js';

const router = express.Router();

// ==================== VALIDATION SCHEMAS ====================
const createCampaignSchema = z.object({
  name: z.string().min(1, 'Nom requis').max(255),
  type: z.enum(['email', 'phone'], { errorMap: () => ({ message: 'Type invalide: email ou phone' }) }),
  database_id: z.string().uuid('ID base de données invalide'),
  objective: z.string().optional(),
  subject: z.string().max(500).optional(),
  goal_description: z.string().optional(),
  message: z.string().optional(),
  link: z.string().url().optional().nullable(),
  template_id: z.string().uuid().optional().nullable(),
  assigned_users: z.array(z.string().uuid()).optional(),
  supervisor_id: z.string().uuid().optional().nullable(), // Superviseur/Manager de la campagne
  send_days: z.array(z.number().min(1).max(7)).optional(),
  send_time_start: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  send_time_end: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  start_date: z.string().optional().nullable(),
  start_time: z.string().optional(),
  emails_per_cycle: z.number().min(1).max(1000).optional(),
  cycle_interval_minutes: z.number().min(1).optional(),
  status: z.enum(['draft', 'active', 'paused', 'stopped', 'archived']).optional(),
  sectors: z.record(z.array(z.string())).optional(),
  attachments: z.array(z.any()).optional(),
  track_clicks: z.boolean().optional(),
  auto_distribute: z.boolean().optional()
});

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

// ==================== GET ALL CAMPAIGNS ====================
router.get('/', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const isSuperAdmin = req.user?.is_super_admin === true;
    const userPermissions = req.user?.permissions || {};
    const canViewAllCampaigns = userPermissions.view_all_campaigns === true;

    let campaigns;

    // Admin, super admin, ou utilisateur avec permission view_all_campaigns : voir toutes les campagnes
    if (isSuperAdmin || userRole === 'admin' || canViewAllCampaigns) {
      campaigns = await queryAll(
        `SELECT
          c.*,
          ld.name as database_name,
          et.name as template_name
        FROM campaigns c
        LEFT JOIN lead_databases ld ON c.database_id = ld.id
        LEFT JOIN email_templates et ON c.template_id = et.id
        WHERE c.tenant_id = $1
        ORDER BY c.created_at DESC`,
        [tenantId]
      );
      log(`✅ Admin - toutes les campagnes: ${campaigns.length}`);
    }
    // Manager ou commercial : voir uniquement les campagnes où ils sont assignés ou superviseur
    else {
      campaigns = await queryAll(
        `SELECT DISTINCT
          c.*,
          ld.name as database_name,
          et.name as template_name
        FROM campaigns c
        LEFT JOIN lead_databases ld ON c.database_id = ld.id
        LEFT JOIN email_templates et ON c.template_id = et.id
        WHERE c.tenant_id = $1
          AND (
            -- Campagnes où l'utilisateur est dans assigned_users (JSON)
            c.assigned_users::jsonb ? $2::text
            -- Ou campagnes créées par l'utilisateur
            OR c.created_by = $2::uuid
            -- Ou campagnes où l'utilisateur est superviseur
            OR c.supervisor_id = $2::uuid
            -- Ou campagnes où il a des leads dans le pipeline
            OR EXISTS (
              SELECT 1 FROM pipeline_leads pl
              WHERE pl.campaign_id = c.id AND pl.assigned_user_id = $2::uuid
            )
            -- Ou campagnes où il est dans campaign_assignments
            OR EXISTS (
              SELECT 1 FROM campaign_assignments ca
              WHERE ca.campaign_id = c.id AND ca.user_id = $2::uuid
            )
          )
        ORDER BY c.created_at DESC`,
        [tenantId, userId]
      );
      log(`✅ ${userRole} ${req.user?.email} - campagnes accessibles: ${campaigns.length}`);
    }

    return res.json({ success: true, campaigns });

  } catch (err) {
    error('❌ Erreur GET campaigns:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ==================== GET MY CAMPAIGNS ====================
router.get('/my-campaigns', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const isSuperAdmin = req.user?.is_super_admin === true;
    const userPermissions = req.user?.permissions || {};
    const canViewAllCampaigns = userPermissions.view_all_campaigns === true;

    log(`📋 Chargement campagnes pour user ${userId} (${userRole}), permissions: ${JSON.stringify(userPermissions)}`);

    let campaigns;

    // Admin, super admin, ou permission view_all_campaigns : toutes les campagnes
    if (isSuperAdmin || userRole === 'admin' || canViewAllCampaigns) {
      campaigns = await queryAll(
        `SELECT c.*,
                ld.name as database_name,
                et.name as template_name,
                COUNT(DISTINCT pl.id) as my_leads_count,
                COUNT(DISTINCT CASE WHEN eq.status = 'sent' THEN eq.id END) as emails_sent
         FROM campaigns c
         LEFT JOIN lead_databases ld ON c.database_id = ld.id
         LEFT JOIN email_templates et ON c.template_id = et.id
         LEFT JOIN pipeline_leads pl ON c.id = pl.campaign_id
         LEFT JOIN email_queue eq ON c.id = eq.campaign_id
         WHERE c.tenant_id = $1
         GROUP BY c.id, ld.name, et.name
         ORDER BY c.created_at DESC`,
        [tenantId]
      );
      log(`✅ Admin - toutes les campagnes: ${campaigns.length}`);
    }
    // Manager ou commercial : uniquement leurs campagnes assignées
    else {
      campaigns = await queryAll(
        `SELECT DISTINCT c.*,
                ld.name as database_name,
                et.name as template_name,
                COUNT(DISTINCT pl.id) as my_leads_count,
                COUNT(DISTINCT CASE WHEN eq.status = 'sent' THEN eq.id END) as emails_sent
         FROM campaigns c
         LEFT JOIN lead_databases ld ON c.database_id = ld.id
         LEFT JOIN email_templates et ON c.template_id = et.id
         LEFT JOIN pipeline_leads pl ON c.id = pl.campaign_id AND pl.assigned_user_id = $2
         LEFT JOIN email_queue eq ON c.id = eq.campaign_id
         WHERE c.tenant_id = $1
           AND (
             c.assigned_users::jsonb ? $2::text
             OR c.created_by = $2
             OR c.supervisor_id = $2::uuid
             OR EXISTS (
               SELECT 1 FROM pipeline_leads pl2
               WHERE pl2.campaign_id = c.id AND pl2.assigned_user_id = $2
             )
             OR EXISTS (
               SELECT 1 FROM campaign_assignments ca
               WHERE ca.campaign_id = c.id AND ca.user_id = $2
             )
           )
         GROUP BY c.id, ld.name, et.name
         ORDER BY c.created_at DESC`,
        [tenantId, userId]
      );
      log(`✅ ${userRole} ${req.user?.email} - mes campagnes: ${campaigns.length}`);
    }

    return res.json({ success: true, campaigns });

  } catch (err) {
    error('❌ Erreur my-campaigns:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ==================== GET ONE CAMPAIGN ====================
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    const campaignId = req.params.id;

    const campaign = await queryOne(
      `SELECT
        c.*,
        ld.name as database_name,
        et.name as template_name,
        et.html_body as template_html,
        su.first_name as supervisor_first_name,
        su.last_name as supervisor_last_name,
        su.email as supervisor_email
      FROM campaigns c
      LEFT JOIN lead_databases ld ON c.database_id = ld.id
      LEFT JOIN email_templates et ON c.template_id = et.id
      LEFT JOIN users su ON c.supervisor_id = su.id
      WHERE c.id = $1 AND c.tenant_id = $2`,
      [campaignId, tenantId]
    );

    if (!campaign) {
      return res.status(404).json({ error: 'Campagne non trouvée' });
    }

    return res.json({ success: true, campaign });
    
  } catch (err) {
    error('❌ Erreur GET campaign:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ==================== CREATE CAMPAIGN ====================
router.post('/', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    const userId = req.user?.id;

    // ✅ VALIDATION ZOD
    let validatedData;
    try {
      validatedData = createCampaignSchema.parse(req.body);
    } catch (err) {
      return res.status(400).json({
        error: 'Données invalides',
        details: error.errors?.map(e => `${e.path.join('.')}: ${e.message}`)
      });
    }

    const {
      name, type, objective, subject, goal_description, message, link,
      database_id, template_id, assigned_users, supervisor_id, send_days,
      send_time_start, send_time_end, start_date, start_time,
      emails_per_cycle, cycle_interval_minutes, status, sectors,
      attachments, track_clicks, auto_distribute
    } = validatedData;

    log('📥 Données validées:', { name, type, database_id, supervisor_id });

    let leads = [];
    let leadsExcludedNoPhone = 0;

    // Pour les campagnes PHONE, on filtre uniquement les leads avec téléphone valide
    const phoneFilter = type === 'phone'
      ? "AND l.phone IS NOT NULL AND TRIM(l.phone) != ''"
      : '';

    if (sectors && Object.keys(sectors).length > 0) {
      // Construction sécurisée avec paramètres
      const sectorConditions = [];
      const params = [tenantId, database_id];
      let paramIndex = 3;

      Object.entries(sectors)
        .filter(([_, sectorList]) => sectorList && sectorList.length > 0)
        .forEach(([dbId, sectorList]) => {
          sectorConditions.push(`(ldr.database_id = $${paramIndex} AND l.sector = ANY($${paramIndex + 1}))`);
          params.push(dbId, sectorList);
          paramIndex += 2;
        });

      if (sectorConditions.length > 0) {
        leads = await queryAll(
          `SELECT DISTINCT l.*
           FROM leads l
           JOIN lead_database_relations ldr ON l.id = ldr.lead_id
           WHERE l.tenant_id = $1 AND ldr.database_id = $2 AND (${sectorConditions.join(' OR ')}) ${phoneFilter}`,
          params
        );

        // Compter les leads exclus pour campagnes phone
        if (type === 'phone') {
          const excludedResult = await queryOne(
            `SELECT COUNT(DISTINCT l.id) as count
             FROM leads l
             JOIN lead_database_relations ldr ON l.id = ldr.lead_id
             WHERE l.tenant_id = $1 AND ldr.database_id = $2 AND (${sectorConditions.join(' OR ')})
             AND (l.phone IS NULL OR TRIM(l.phone) = '')`,
            params
          );
          leadsExcludedNoPhone = parseInt(excludedResult?.count || 0, 10);
        }
      }
    } else {
      leads = await queryAll(
        `SELECT DISTINCT l.*
         FROM leads l
         JOIN lead_database_relations ldr ON l.id = ldr.lead_id
         WHERE l.tenant_id = $1 AND ldr.database_id = $2 ${phoneFilter}`,
        [tenantId, database_id]
      );

      // Compter les leads exclus pour campagnes phone
      if (type === 'phone') {
        const excludedResult = await queryOne(
          `SELECT COUNT(DISTINCT l.id) as count
           FROM leads l
           JOIN lead_database_relations ldr ON l.id = ldr.lead_id
           WHERE l.tenant_id = $1 AND ldr.database_id = $2
           AND (l.phone IS NULL OR TRIM(l.phone) = '')`,
          [tenantId, database_id]
        );
        leadsExcludedNoPhone = parseInt(excludedResult?.count || 0, 10);
      }
    }

    log(`📊 ${leads.length} leads trouvés${type === 'phone' ? ` (${leadsExcludedNoPhone} exclus sans téléphone)` : ''}`);

    if (leads.length === 0) {
      const errorMsg = type === 'phone'
        ? `Aucun lead avec numéro de téléphone trouvé dans cette base (${leadsExcludedNoPhone} leads sans téléphone exclus)`
        : 'Aucun lead trouvé dans cette base';
      return res.status(400).json({ error: errorMsg, leads_excluded_no_phone: leadsExcludedNoPhone });
    }
	const campaign = await queryOne(
      `INSERT INTO campaigns (
        tenant_id, name, type, campaign_type, objective, subject, description,
        database_id, sector, template_id, status, send_days,
        send_time_start, send_time_end, start_date,
        emails_per_cycle, cycle_interval_minutes, assigned_users,
        total_leads, track_clicks, auto_distribute,
        created_by, supervisor_id, leads_excluded_no_phone,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, NOW(), NOW()
      ) RETURNING *`,
      [
        tenantId, name, type, type, objective || 'leads', subject || null,
        goal_description || null, database_id,
        sectors ? JSON.stringify(sectors) : null, template_id || null,
        status || 'draft', JSON.stringify(send_days || [1,2,3,4,5]),
        send_time_start || '08:00', send_time_end || '18:00', start_date || null,
        emails_per_cycle || 50, cycle_interval_minutes || 10,
        JSON.stringify(assigned_users || []), leads.length,
        track_clicks !== false, auto_distribute !== false, userId,
        supervisor_id || null, leadsExcludedNoPhone
      ]
    );

    log('✅ Campagne créée:', campaign.id);

    if (type === 'email') {
      log('📧 Ajout des emails à la queue...');
      
      for (const lead of leads) {
        await execute(
          `INSERT INTO email_queue (campaign_id, lead_id, tenant_id, recipient_email, status, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [campaign.id, lead.id, tenantId, lead.email, 'pending']
        );
      }
      
      log(`✅ ${leads.length} emails ajoutés à la queue`);
    }

    // ✅ CORRECTION ICI - LIGNE 337-370
    if (type !== 'email' && assigned_users && assigned_users.length > 0) {
      log(`👥 Affectation de ${leads.length} leads à ${assigned_users.length} commercial(aux)...`);

      await execute('BEGIN');

      try {
        for (let i = 0; i < leads.length; i++) {
          const lead = leads[i];
          const assignedUserId = assigned_users[i % assigned_users.length];

          await execute(
            `UPDATE leads SET assigned_to = $1, status = 'assigned', updated_at = NOW()
             WHERE id = $2 AND tenant_id = $3`,
            [assignedUserId, lead.id, tenantId]
          );

          await execute(
            `INSERT INTO pipeline_leads (id, tenant_id, lead_id, campaign_id, stage, assigned_user_id, created_at, updated_at)
             VALUES (gen_random_uuid(), $1, $2, $3, 'cold_call', $4, NOW(), NOW())
             ON CONFLICT (lead_id, campaign_id)
             DO UPDATE SET stage = EXCLUDED.stage, assigned_user_id = EXCLUDED.assigned_user_id, updated_at = NOW()`,
            [tenantId, lead.id, campaign.id, assignedUserId]
          );
        }

        await execute('COMMIT');
        log(`✅ ${leads.length} leads affectés et injectés dans le pipeline`);
        
      } catch (e) {
        await execute('ROLLBACK');
        error('❌ Erreur affectation/injection :', e.message);
        throw e;
      }
    }

    return res.json({ success: true, campaign });

  } catch (err) {
    error('❌ Erreur création campagne:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ==================== COUNT LEADS WITH/WITHOUT PHONE ====================
// Endpoint pour compter les leads avec et sans téléphone avant création campagne
router.post('/count-leads-phone', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    const { database_id, sectors } = req.body;

    if (!database_id) {
      return res.status(400).json({ error: 'database_id requis' });
    }

    let baseQuery = `
      FROM leads l
      JOIN lead_database_relations ldr ON l.id = ldr.lead_id
      WHERE l.tenant_id = $1 AND ldr.database_id = $2
    `;
    const params = [tenantId, database_id];

    // Construire le filtre secteur si fourni
    if (sectors && Object.keys(sectors).length > 0) {
      const sectorConditions = [];
      let paramIndex = 3;

      Object.entries(sectors)
        .filter(([_, sectorList]) => sectorList && sectorList.length > 0)
        .forEach(([dbId, sectorList]) => {
          sectorConditions.push(`(ldr.database_id = $${paramIndex} AND l.sector = ANY($${paramIndex + 1}))`);
          params.push(dbId, sectorList);
          paramIndex += 2;
        });

      if (sectorConditions.length > 0) {
        baseQuery += ` AND (${sectorConditions.join(' OR ')})`;
      }
    }

    // Compter les leads avec téléphone
    const withPhoneResult = await queryOne(
      `SELECT COUNT(DISTINCT l.id) as count ${baseQuery} AND l.phone IS NOT NULL AND TRIM(l.phone) != ''`,
      params
    );

    // Compter les leads sans téléphone
    const withoutPhoneResult = await queryOne(
      `SELECT COUNT(DISTINCT l.id) as count ${baseQuery} AND (l.phone IS NULL OR TRIM(l.phone) = '')`,
      params
    );

    // Total
    const totalResult = await queryOne(
      `SELECT COUNT(DISTINCT l.id) as count ${baseQuery}`,
      params
    );

    res.json({
      success: true,
      counts: {
        with_phone: parseInt(withPhoneResult?.count || 0, 10),
        without_phone: parseInt(withoutPhoneResult?.count || 0, 10),
        total: parseInt(totalResult?.count || 0, 10)
      }
    });

  } catch (err) {
    error('❌ Erreur count-leads-phone:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ==================== UPDATE CAMPAIGN ====================
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    const campaignId = req.params.id;
    const updates = req.body;

    log('📝 Mise à jour campagne:', campaignId, 'avec:', updates);

    // Construire la requête dynamiquement pour ne mettre à jour que les champs fournis
    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }
    if (updates.subject !== undefined) {
      updateFields.push(`subject = $${paramIndex++}`);
      values.push(updates.subject);
    }
    if (updates.description !== undefined || updates.goal_description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      values.push(updates.description || updates.goal_description);
    }
    if (updates.template_id !== undefined) {
      updateFields.push(`template_id = $${paramIndex++}`);
      values.push(updates.template_id || null); // Convertir chaîne vide en null pour UUID
    }
    if (updates.send_days !== undefined) {
      updateFields.push(`send_days = $${paramIndex++}`);
      values.push(JSON.stringify(updates.send_days));
    }
    if (updates.send_time_start !== undefined) {
      updateFields.push(`send_time_start = $${paramIndex++}`);
      values.push(updates.send_time_start || null);
    }
    if (updates.send_time_end !== undefined) {
      updateFields.push(`send_time_end = $${paramIndex++}`);
      values.push(updates.send_time_end || null);
    }
    if (updates.start_date !== undefined) {
      updateFields.push(`start_date = $${paramIndex++}`);
      values.push(updates.start_date || null); // Convertir chaîne vide en null pour date
    }
    if (updates.emails_per_cycle !== undefined) {
      updateFields.push(`emails_per_cycle = $${paramIndex++}`);
      values.push(updates.emails_per_cycle);
    }
    if (updates.assigned_users !== undefined) {
      updateFields.push(`assigned_users = $${paramIndex++}`);
      values.push(JSON.stringify(updates.assigned_users));
    }
    if (updates.supervisor_id !== undefined) {
      updateFields.push(`supervisor_id = $${paramIndex++}`);
      values.push(updates.supervisor_id || null);
    }

    // Toujours mettre à jour updated_at
    updateFields.push(`updated_at = NOW()`);

    if (updateFields.length === 1) { // Seulement updated_at
      return res.status(400).json({ error: 'Aucun champ à mettre à jour' });
    }

    values.push(campaignId, tenantId);

    const query = `UPDATE campaigns
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex++}
      RETURNING *`;

    const campaign = await queryOne(query, values);

    if (!campaign) {
      return res.status(404).json({ error: 'Campagne non trouvée' });
    }

    log('✅ Campagne mise à jour:', campaignId);

    // ✅ Si assigned_users a été modifié ET c'est une campagne phoning, injecter dans pipeline
    if (updates.assigned_users !== undefined && campaign.type !== 'email' && updates.assigned_users.length > 0) {
      log(`👥 Réaffectation: injection de leads dans le pipeline pour ${updates.assigned_users.length} commercial(aux)...`);

      // 🔧 FIX: Récupérer les leads en RESPECTANT le filtre de secteurs de la campagne
      let leads = [];

      // Parser le champ sectors de la campagne (JSON)
      const campaignSectors = campaign.sector ? (typeof campaign.sector === 'string' ? JSON.parse(campaign.sector) : campaign.sector) : null;

      if (campaignSectors && Object.keys(campaignSectors).length > 0) {
        // ✅ Appliquer le filtre de secteurs (même logique que lors de la création)
        log(`🎯 Application du filtre de secteurs:`, campaignSectors);

        const sectorConditions = [];
        const params = [tenantId, campaign.database_id];
        let paramIndex = 3;

        Object.entries(campaignSectors)
          .filter(([_, sectorList]) => sectorList && sectorList.length > 0)
          .forEach(([dbId, sectorList]) => {
            sectorConditions.push(`(ldr.database_id = $${paramIndex} AND l.sector = ANY($${paramIndex + 1}))`);
            params.push(dbId, sectorList);
            paramIndex += 2;
          });

        if (sectorConditions.length > 0) {
          leads = await queryAll(
            `SELECT DISTINCT l.*
             FROM leads l
             JOIN lead_database_relations ldr ON l.id = ldr.lead_id
             WHERE l.tenant_id = $1 AND ldr.database_id = $2 AND (${sectorConditions.join(' OR ')})`,
            params
          );
        }
      } else {
        // ✅ Pas de filtre de secteurs : récupérer tous les leads de la database
        log(`📋 Récupération de tous les leads (pas de filtre secteurs)`);
        leads = await queryAll(
          `SELECT DISTINCT l.*
           FROM leads l
           JOIN lead_database_relations ldr ON l.id = ldr.lead_id
           WHERE l.tenant_id = $1 AND ldr.database_id = $2`,
          [tenantId, campaign.database_id]
        );
      }

      log(`📊 ${leads.length} leads récupérés avec filtre`);

      if (leads.length > 0) {
        await execute('BEGIN');

        try {
          for (let i = 0; i < leads.length; i++) {
            const lead = leads[i];
            const assignedUserId = updates.assigned_users[i % updates.assigned_users.length];

            await execute(
              `UPDATE leads SET assigned_to = $1, updated_at = NOW()
               WHERE id = $2 AND tenant_id = $3`,
              [assignedUserId, lead.id, tenantId]
            );

            await execute(
              `INSERT INTO pipeline_leads (id, tenant_id, lead_id, campaign_id, stage, assigned_user_id, created_at, updated_at)
               VALUES (gen_random_uuid(), $1, $2, $3, 'cold_call', $4, NOW(), NOW())
               ON CONFLICT (lead_id, campaign_id)
               DO UPDATE SET assigned_user_id = EXCLUDED.assigned_user_id, updated_at = NOW()`,
              [tenantId, lead.id, campaignId, assignedUserId]
            );
          }

          await execute('COMMIT');
          log(`✅ ${leads.length} leads réaffectés et injectés dans le pipeline`);

        } catch (e) {
          await execute('ROLLBACK');
          error('❌ Erreur réaffectation/injection :', e.message);
          throw e;
        }
      } else {
        log(`⚠️ Aucun lead trouvé avec le filtre de secteurs appliqué`);
      }
    }

    return res.json({ success: true, campaign });

  } catch (err) {
    error('❌ Erreur update:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ==================== START CAMPAIGN ====================
router.post('/:id/start', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    const campaignId = req.params.id;

    const campaign = await queryOne(
      `UPDATE campaigns SET status = 'active', updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [campaignId, tenantId]
    );

    if (!campaign) {
      return res.status(404).json({ error: 'Campagne non trouvée' });
    }

    if (campaign.type === 'email') {
      const existingEmails = await queryOne(
        'SELECT COUNT(*) as count FROM email_queue WHERE campaign_id = $1',
        [campaignId]
      );

      if (existingEmails.count === 0) {
        const leads = await queryAll(
          `SELECT DISTINCT l.* FROM leads l
           JOIN lead_database_relations ldr ON l.id = ldr.lead_id
           WHERE l.tenant_id = $1 AND ldr.database_id = $2`,
          [tenantId, campaign.database_id]
        );

        for (const lead of leads) {
          await execute(
            `INSERT INTO email_queue (campaign_id, lead_id, tenant_id, recipient_email, status, created_at)
             VALUES ($1, $2, $3, $4, 'pending', NOW())`,
            [campaignId, lead.id, tenantId, lead.email]
          );
        }
        log(`✅ ${leads.length} emails ajoutés à la queue`);
      }
    }

    log('🟢 Campagne démarrée:', campaignId);
    return res.json({ success: true, campaign });

  } catch (err) {
    error('❌ Erreur start:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ==================== PAUSE CAMPAIGN ====================
router.post('/:id/pause', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    const campaignId = req.params.id;

    const campaign = await queryOne(
      `UPDATE campaigns SET status = 'paused', updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [campaignId, tenantId]
    );

    if (!campaign) {
      return res.status(404).json({ error: 'Campagne non trouvée' });
    }

    log('⏸️ Campagne mise en pause:', campaignId);
    return res.json({ success: true, campaign });

  } catch (err) {
    error('❌ Erreur pause:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ==================== RESUME CAMPAIGN ====================
router.post('/:id/resume', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    const campaignId = req.params.id;

    const campaign = await queryOne(
      `UPDATE campaigns SET status = 'active', updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [campaignId, tenantId]
    );

    if (!campaign) {
      return res.status(404).json({ error: 'Campagne non trouvée' });
    }

    log('▶️ Campagne reprise:', campaignId);
    return res.json({ success: true, campaign });

  } catch (err) {
    error('❌ Erreur resume:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ==================== STOP CAMPAIGN ====================
router.post('/:id/stop', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    const campaignId = req.params.id;

    const campaign = await queryOne(
      `UPDATE campaigns SET status = 'stopped', updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [campaignId, tenantId]
    );

    if (!campaign) {
      return res.status(404).json({ error: 'Campagne non trouvée' });
    }

    log('⏹️ Campagne arrêtée:', campaignId);
    return res.json({ success: true, campaign });

  } catch (err) {
    error('❌ Erreur stop:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ==================== ARCHIVE CAMPAIGN ====================
router.post('/:id/archive', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    const campaignId = req.params.id;

    const campaign = await queryOne(
      `UPDATE campaigns SET status = 'archived', updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [campaignId, tenantId]
    );

    if (!campaign) {
      return res.status(404).json({ error: 'Campagne non trouvée' });
    }

    log('📦 Campagne archivée:', campaignId);
    return res.json({ success: true, campaign });

  } catch (err) {
    error('❌ Erreur archive:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ==================== UNARCHIVE CAMPAIGN ====================
router.post('/:id/unarchive', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    const campaignId = req.params.id;

    const campaign = await queryOne(
      `UPDATE campaigns SET status = 'draft', updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [campaignId, tenantId]
    );

    if (!campaign) {
      return res.status(404).json({ error: 'Campagne non trouvée' });
    }

    log('📂 Campagne désarchivée:', campaignId);
    return res.json({ success: true, campaign });

  } catch (err) {
    error('❌ Erreur unarchive:', err);
    return res.status(500).json({ error: err.message });
  }
});
// ==================== RELAUNCH CAMPAIGN ====================
router.post('/:id/relaunch', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    const userId = req.user?.id;
    const campaignId = req.params.id;
    
    log('🔄 Relance campagne:', campaignId);
    
    const campaign = await queryOne(
      'SELECT * FROM campaigns WHERE id = $1 AND tenant_id = $2',
      [campaignId, tenantId]
    );
    
    if (!campaign) {
      return res.status(404).json({ error: 'Campagne non trouvée' });
    }
    
    const excludedLeads = await queryAll(
      `SELECT DISTINCT lead_id FROM email_queue 
       WHERE campaign_id = $1 AND (bounced_at IS NOT NULL OR unsubscribed_at IS NOT NULL OR clicked_at IS NOT NULL)`,
      [campaignId]
    );
    
    const excludedIds = excludedLeads.map(l => l.lead_id);
    log(`📊 ${excludedIds.length} leads à exclure (RGPD)`);
    
    const allLeads = await queryAll(
      `SELECT DISTINCT l.* FROM leads l
       JOIN lead_database_relations ldr ON l.id = ldr.lead_id
       WHERE l.tenant_id = $1 AND ldr.database_id = $2`,
      [tenantId, campaign.database_id]
    );
    
    const eligibleLeads = allLeads.filter(l => !excludedIds.includes(l.id));
    
    log(`✅ ${eligibleLeads.length} leads éligibles pour relance`);
    
    if (eligibleLeads.length === 0) {
      return res.status(400).json({ error: 'Aucun lead éligible pour la relance' });
    }
    
    const newCampaign = await queryOne(
      `INSERT INTO campaigns (
        tenant_id, name, type, campaign_type, objective, subject, description,
        database_id, sector, template_id, status, send_days, send_time_start, send_time_end,
        start_date, emails_per_cycle, cycle_interval_minutes, assigned_users, total_leads,
        track_clicks, auto_distribute, created_by, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, NOW(), NOW()
      ) RETURNING *`,
      [
        campaign.tenant_id, `${campaign.name} (Relance)`, campaign.type, campaign.campaign_type,
        campaign.objective, campaign.subject, campaign.description, campaign.database_id,
        campaign.sector, campaign.template_id, 'active', campaign.send_days,
        campaign.send_time_start, campaign.send_time_end, null, campaign.emails_per_cycle,
        campaign.cycle_interval_minutes, campaign.assigned_users, eligibleLeads.length,
        campaign.track_clicks, campaign.auto_distribute, userId
      ]
    );
    
    for (const lead of eligibleLeads) {
      await execute(
        `INSERT INTO email_queue (campaign_id, lead_id, tenant_id, recipient_email, status, created_at)
         VALUES ($1, $2, $3, $4, 'pending', NOW())`,
        [newCampaign.id, lead.id, tenantId, lead.email]
      );
    }
    
    log(`✅ Relance créée: ${eligibleLeads.length} emails en queue`);
    
    return res.json({ 
      success: true, 
      campaign: newCampaign,
      leads_count: eligibleLeads.length,
      excluded_count: excludedIds.length
    });
    
  } catch (err) {
    error('❌ Erreur relance:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ==================== DUPLICATE CAMPAIGN ====================
router.post('/:id/duplicate', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    const userId = req.user?.id;
    const campaignId = req.params.id;
    
    const campaign = await queryOne(
      'SELECT * FROM campaigns WHERE id = $1 AND tenant_id = $2',
      [campaignId, tenantId]
    );
    
    if (!campaign) {
      return res.status(404).json({ error: 'Campagne non trouvée' });
    }
    
    const newCampaign = await queryOne(
      `INSERT INTO campaigns (
        tenant_id, name, type, campaign_type, objective, subject, description,
        database_id, sector, template_id, status, send_days, send_time_start, send_time_end,
        start_date, emails_per_cycle, cycle_interval_minutes, assigned_users, total_leads,
        track_clicks, auto_distribute, created_by, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, NOW(), NOW()
      ) RETURNING *`,
      [
        campaign.tenant_id, `${campaign.name} (Copie)`, campaign.type, campaign.campaign_type,
        campaign.objective, campaign.subject, campaign.description, campaign.database_id,
        campaign.sector, campaign.template_id, 'draft', campaign.send_days,
        campaign.send_time_start, campaign.send_time_end, null, campaign.emails_per_cycle,
        campaign.cycle_interval_minutes, campaign.assigned_users, campaign.total_leads,
        campaign.track_clicks, campaign.auto_distribute, userId
      ]
    );
    
    log('📋 Campagne dupliquée:', newCampaign.id);
    
    return res.json({ success: true, campaign: newCampaign });
    
  } catch (err) {
    error('❌ Erreur duplication:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ==================== DELETE CAMPAIGN ====================
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    const campaignId = req.params.id;
    
    await execute('DELETE FROM email_queue WHERE campaign_id = $1', [campaignId]);
    
    const campaign = await queryOne(
      'DELETE FROM campaigns WHERE id = $1 AND tenant_id = $2 RETURNING *',
      [campaignId, tenantId]
    );
    
    if (!campaign) {
      return res.status(404).json({ error: 'Campagne non trouvée' });
    }
    
    log('🗑️ Campagne supprimée:', campaignId);
    
    return res.json({ success: true, message: 'Campagne supprimée' });
    
  } catch (err) {
    error('❌ Erreur suppression:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ==================== SEND TEST EMAILS ====================
router.post('/test-emails', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    const { template_id, recipients, attachments } = req.body;
    
    if (!template_id || !recipients || recipients.length === 0) {
      return res.status(400).json({ error: 'Template et destinataires requis' });
    }
    
    if (recipients.length > 3) {
      return res.status(400).json({ error: 'Maximum 3 destinataires' });
    }
    
    const template = await queryOne(
      'SELECT * FROM email_templates WHERE id = $1 AND tenant_id = $2',
      [template_id, tenantId]
    );
    
    if (!template) {
      return res.status(404).json({ error: 'Template non trouvé' });
    }
    
    log(`📧 Envoi de ${recipients.length} emails de test...`);
    
    const { sendTestEmail } = await import('../services/elasticEmail.js');
    
    const results = {
      success: [],
      failed: []
    };
    
    for (const recipient of recipients) {
      try {
        await sendTestEmail({
          to: recipient,
          subject: template.subject || 'Email de test',
          templateHtml: template.html_body
        });
        results.success.push(recipient);
      } catch (err) {
        error(`❌ Erreur envoi à ${recipient}:`, error);
        results.failed.push({ email: recipient, error: err.message });
      }
    }
    
    log(`✅ Envoi terminé: ${results.success.length} succès, ${results.failed.length} échecs`);
    
    return res.json({ 
      success: true, 
      message: `${results.success.length}/${recipients.length} email(s) de test envoyé(s)`,
      results
    });
    
  } catch (err) {
    error('❌ Erreur envoi test:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ==================== FORCE SYNC STATS ====================
router.post('/:id/force-sync', authenticateToken, async (req, res) => {
  try {
    const campaignId = req.params.id;
    const tenantId = req.user?.tenant_id;

    log('🔄 [FORCE SYNC] Synchronisation forcée pour:', campaignId);

    const { pollingService } = await import('../lib/elasticEmailPolling.js');
    
    await pollingService.syncCampaignStats(campaignId);
    
    return res.json({ success: true, message: 'Synchronisation forcée lancée' });
    
  } catch (err) {
    error('❌ Erreur force sync:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ==================== GET PHONING STATS ====================
router.get('/:id/phoning-stats', authenticateToken, async (req, res) => {
  try {
    const campaignId = req.params.id;
    const tenantId = req.user?.tenant_id;
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const isSuperAdmin = req.user?.is_super_admin === true;

    // Vérifier que la campagne existe et appartient au tenant
    const campaign = await queryOne(
      'SELECT id, type, database_id, assigned_users FROM campaigns WHERE id = $1 AND tenant_id = $2',
      [campaignId, tenantId]
    );

    if (!campaign) {
      return res.status(404).json({ error: 'Campagne non trouvée' });
    }

    // Compter le nombre total de leads dans la campagne
    // Via database_id direct OU via lead_database_relations
    const totalLeadsResult = await queryOne(
      `SELECT COUNT(DISTINCT l.id) as total
       FROM leads l
       LEFT JOIN lead_database_relations ldr ON l.id = ldr.lead_id
       WHERE l.tenant_id = $2
         AND (l.database_id = $1 OR ldr.database_id = $1)`,
      [campaign.database_id, tenantId]
    );

    // Compter les leads contactés (qui ne sont plus dans cold_call)
    const contactedLeadsResult = await queryOne(
      `SELECT COUNT(DISTINCT pl.lead_id) as contacted
       FROM pipeline_leads pl
       WHERE pl.campaign_id = $1
         AND pl.tenant_id = $2
         AND pl.stage != 'cold_call'`,
      [campaignId, tenantId]
    );

    // Compter les meetings obtenus (tres_qualifie, proposition, gagne)
    const meetingsResult = await queryOne(
      `SELECT COUNT(DISTINCT pl.lead_id) as meetings
       FROM pipeline_leads pl
       WHERE pl.campaign_id = $1
         AND pl.tenant_id = $2
         AND pl.stage IN ('tres_qualifie', 'proposition', 'gagne')`,
      [campaignId, tenantId]
    );

    const stats = {
      total_leads: parseInt(totalLeadsResult?.total || 0),
      leads_contacted: parseInt(contactedLeadsResult?.contacted || 0),
      meetings_scheduled: parseInt(meetingsResult?.meetings || 0)
    };

    log(`📊 Stats campagne ${campaignId}: ${stats.total_leads} leads, ${stats.leads_contacted} contactés`);

    return res.json({ success: true, stats });

  } catch (err) {
    error('❌ Erreur phoning-stats:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ==================== GET COMMERCIALS ====================
router.get('/:id/commercials', authenticateToken, async (req, res) => {
  try {
    const campaignId = req.params.id;
    const tenantId = req.user?.tenant_id;

    // Récupérer la campagne avec ses utilisateurs assignés et son type
    const campaign = await queryOne(
      'SELECT assigned_users, database_id, type FROM campaigns WHERE id = $1 AND tenant_id = $2',
      [campaignId, tenantId]
    );

    if (!campaign) {
      return res.status(404).json({ error: 'Campagne non trouvée' });
    }

    // Parser assigned_users - IMPORTANT: gérer tous les cas
    let assignedUserIds = [];
    try {
      if (campaign.assigned_users) {
        assignedUserIds = Array.isArray(campaign.assigned_users)
          ? campaign.assigned_users
          : JSON.parse(campaign.assigned_users);
      }
    } catch (e) {
      log('Erreur parsing assigned_users:', e);
      assignedUserIds = [];
    }

    log(`📋 Campagne ${campaignId}: assigned_users = ${JSON.stringify(assignedUserIds)}, database_id = ${campaign.database_id}, type = ${campaign.type}`);

    // Récupérer TOUS les commerciaux assignés à la campagne avec le BON nombre de leads
    const commercials = await queryAll(
      `SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.role,
        -- Leads dans pipeline_leads pour cette campagne
        COALESCE((
          SELECT COUNT(DISTINCT pl2.lead_id)
          FROM pipeline_leads pl2
          WHERE pl2.assigned_user_id = u.id AND pl2.campaign_id = $1
        ), 0) as pipeline_leads_count,
        -- Leads dans email_queue pour cette campagne (campagnes email)
        COALESCE((
          SELECT COUNT(DISTINCT eq.lead_id)
          FROM email_queue eq
          JOIN leads l ON eq.lead_id = l.id
          WHERE eq.campaign_id = $1 AND l.assigned_to = u.id
        ), 0) as email_leads_count,
        -- Total leads assignés dans CETTE campagne
        CASE
          WHEN $4 = 'email' THEN COALESCE((
            SELECT COUNT(DISTINCT eq.lead_id)
            FROM email_queue eq
            JOIN leads l ON eq.lead_id = l.id
            WHERE eq.campaign_id = $1 AND l.assigned_to = u.id
          ), 0)
          ELSE COALESCE((
            SELECT COUNT(DISTINCT pl2.lead_id)
            FROM pipeline_leads pl2
            WHERE pl2.assigned_user_id = u.id AND pl2.campaign_id = $1
          ), 0)
        END as leads_assigned,
        -- Leads contactés (emails ouverts ou pipeline pas cold_call)
        CASE
          WHEN $4 = 'email' THEN COALESCE((
            SELECT COUNT(DISTINCT et.lead_id)
            FROM email_tracking et
            WHERE et.campaign_id = $1
              AND et.event_type = 'open'
              AND et.lead_id IN (SELECT l.id FROM leads l WHERE l.assigned_to = u.id)
          ), 0)
          ELSE COALESCE((
            SELECT COUNT(DISTINCT pl2.lead_id)
            FROM pipeline_leads pl2
            WHERE pl2.assigned_user_id = u.id AND pl2.campaign_id = $1 AND pl2.stage != 'cold_call'
          ), 0)
        END as leads_contacted,
        -- RDV obtenus / Clics
        CASE
          WHEN $4 = 'email' THEN COALESCE((
            SELECT COUNT(DISTINCT et.lead_id)
            FROM email_tracking et
            WHERE et.campaign_id = $1
              AND et.event_type = 'click'
              AND et.lead_id IN (SELECT l.id FROM leads l WHERE l.assigned_to = u.id)
          ), 0)
          ELSE COALESCE((
            SELECT COUNT(DISTINCT pl2.lead_id)
            FROM pipeline_leads pl2
            WHERE pl2.assigned_user_id = u.id AND pl2.campaign_id = $1 AND pl2.stage IN ('tres_qualifie', 'proposition', 'gagne')
          ), 0)
        END as meetings_scheduled
      FROM users u
      WHERE u.tenant_id = $2
        AND u.is_active = true
        AND (
          -- Utilisateurs dans assigned_users (JSON)
          (CARDINALITY($3::uuid[]) > 0 AND u.id = ANY($3::uuid[]))
          -- OU utilisateurs avec leads dans le pipeline
          OR EXISTS (
            SELECT 1 FROM pipeline_leads pl2
            WHERE pl2.assigned_user_id = u.id AND pl2.campaign_id = $1
          )
          -- OU utilisateurs avec leads dans email_queue
          OR EXISTS (
            SELECT 1 FROM email_queue eq
            JOIN leads l ON eq.lead_id = l.id
            WHERE eq.campaign_id = $1 AND l.assigned_to = u.id
          )
          -- OU utilisateurs dans campaign_assignments
          OR EXISTS (
            SELECT 1 FROM campaign_assignments ca
            WHERE ca.user_id = u.id AND ca.campaign_id = $1
          )
        )
      ORDER BY u.first_name, u.last_name`,
      [campaignId, tenantId, assignedUserIds, campaign.type || 'email']
    );

    log(`📋 Campagne ${campaignId}: ${commercials.length} commerciaux trouvés`);

    return res.json({ success: true, commercials });

  } catch (err) {
    error('❌ Erreur commercials:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ==================== TRANSFER LEADS ====================
router.post('/:id/transfer-leads', authenticateToken, async (req, res) => {
  try {
    const campaignId = req.params.id;
    const tenantId = req.user?.tenant_id;
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const isSuperAdmin = req.user?.is_super_admin === true;

    const { lead_ids, target_user_id, source_user_id, transfer_all } = req.body;

    if (!target_user_id) {
      return res.status(400).json({ error: 'target_user_id requis' });
    }

    // Vérifier que la campagne existe
    const campaign = await queryOne(
      'SELECT id, database_id FROM campaigns WHERE id = $1 AND tenant_id = $2',
      [campaignId, tenantId]
    );

    if (!campaign) {
      return res.status(404).json({ error: 'Campagne non trouvée' });
    }

    // Vérifier que l'utilisateur cible existe
    const targetUser = await queryOne(
      'SELECT id, first_name, last_name, role FROM users WHERE id = $1 AND tenant_id = $2 AND is_active = true',
      [target_user_id, tenantId]
    );

    if (!targetUser) {
      return res.status(404).json({ error: 'Utilisateur cible non trouvé ou inactif' });
    }

    // Vérifier les permissions
    if (!isSuperAdmin && userRole !== 'admin') {
      if (userRole === 'manager') {
        // Manager peut transférer uniquement vers les membres de son équipe
        const isTargetInTeam = await queryOne(
          `SELECT 1 FROM team_members tm
           JOIN teams t ON tm.team_id = t.id
           WHERE tm.user_id = $1 AND t.manager_id = $2`,
          [target_user_id, userId]
        );

        if (!isTargetInTeam) {
          return res.status(403).json({
            error: 'Accès refusé',
            message: 'Vous ne pouvez transférer des leads qu\'aux membres de votre équipe'
          });
        }
      } else {
        return res.status(403).json({ error: 'Permissions insuffisantes' });
      }
    }

    let leadsToTransfer = [];

    // Transférer tous les leads d'un commercial source
    if (transfer_all && source_user_id) {
      leadsToTransfer = await queryAll(
        `SELECT DISTINCT l.id
         FROM leads l
         LEFT JOIN pipeline_leads pl ON l.id = pl.lead_id AND pl.campaign_id = $1
         WHERE l.tenant_id = $2
           AND (l.assigned_to = $3 OR pl.assigned_user_id = $3)
           AND (
             l.database_id = $4
             OR EXISTS (SELECT 1 FROM pipeline_leads pl2 WHERE pl2.lead_id = l.id AND pl2.campaign_id = $1)
           )`,
        [campaignId, tenantId, source_user_id, campaign.database_id]
      );
    }
    // Transférer des leads spécifiques
    else if (lead_ids && lead_ids.length > 0) {
      // Vérifier que les leads existent
      leadsToTransfer = await queryAll(
        `SELECT id FROM leads WHERE id = ANY($1::uuid[]) AND tenant_id = $2`,
        [lead_ids, tenantId]
      );
    } else {
      return res.status(400).json({ error: 'lead_ids ou (transfer_all + source_user_id) requis' });
    }

    if (leadsToTransfer.length === 0) {
      return res.status(400).json({ error: 'Aucun lead à transférer' });
    }

    log(`🔄 Transfert de ${leadsToTransfer.length} leads vers ${targetUser.first_name} ${targetUser.last_name}`);

    // Effectuer le transfert
    let transferredCount = 0;
    for (const lead of leadsToTransfer) {
      try {
        // Mettre à jour le lead
        await execute(
          `UPDATE leads SET assigned_to = $1, updated_at = NOW() WHERE id = $2`,
          [target_user_id, lead.id]
        );

        // Mettre à jour le pipeline
        await execute(
          `UPDATE pipeline_leads
           SET assigned_user_id = $1, updated_at = NOW()
           WHERE lead_id = $2 AND campaign_id = $3`,
          [target_user_id, lead.id, campaignId]
        );

        transferredCount++;
      } catch (err) {
        error(`Erreur transfert lead ${lead.id}:`, err.message);
      }
    }

    log(`✅ ${transferredCount} leads transférés avec succès`);

    return res.json({
      success: true,
      message: `${transferredCount} lead(s) transféré(s) à ${targetUser.first_name} ${targetUser.last_name}`,
      transferred_count: transferredCount,
      target_user: {
        id: targetUser.id,
        name: `${targetUser.first_name} ${targetUser.last_name}`
      }
    });

  } catch (err) {
    error('❌ Erreur transfer-leads:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ==================== DISTRIBUTE LEADS TO MULTIPLE USERS ====================
router.post('/:id/distribute-leads', authenticateToken, async (req, res) => {
  try {
    const campaignId = req.params.id;
    const tenantId = req.user?.tenant_id;
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const isSuperAdmin = req.user?.is_super_admin === true;

    const { lead_ids, target_user_ids, source_user_id, transfer_all } = req.body;

    if (!target_user_ids || !Array.isArray(target_user_ids) || target_user_ids.length === 0) {
      return res.status(400).json({ error: 'target_user_ids requis (tableau d\'UUIDs)' });
    }

    // Vérifier que la campagne existe
    const campaign = await queryOne(
      'SELECT id, database_id FROM campaigns WHERE id = $1 AND tenant_id = $2',
      [campaignId, tenantId]
    );

    if (!campaign) {
      return res.status(404).json({ error: 'Campagne non trouvée' });
    }

    // Vérifier que les utilisateurs cibles existent
    const targetUsers = await queryAll(
      `SELECT id, first_name, last_name FROM users
       WHERE id = ANY($1::uuid[]) AND tenant_id = $2 AND is_active = true`,
      [target_user_ids, tenantId]
    );

    if (targetUsers.length === 0) {
      return res.status(404).json({ error: 'Aucun utilisateur cible valide trouvé' });
    }

    // Vérifier les permissions pour les managers
    if (!isSuperAdmin && userRole !== 'admin' && userRole === 'manager') {
      const validTargets = await queryAll(
        `SELECT DISTINCT u.id FROM users u
         JOIN team_members tm ON u.id = tm.user_id
         JOIN teams t ON tm.team_id = t.id
         WHERE u.id = ANY($1::uuid[]) AND t.manager_id = $2`,
        [target_user_ids, userId]
      );

      if (validTargets.length !== target_user_ids.length) {
        return res.status(403).json({
          error: 'Accès refusé',
          message: 'Vous ne pouvez distribuer des leads qu\'aux membres de votre équipe'
        });
      }
    } else if (!isSuperAdmin && userRole !== 'admin' && userRole !== 'manager') {
      return res.status(403).json({ error: 'Permissions insuffisantes' });
    }

    let leadsToDistribute = [];

    // Récupérer tous les leads d'un commercial source
    if (transfer_all && source_user_id) {
      leadsToDistribute = await queryAll(
        `SELECT DISTINCT l.id
         FROM leads l
         LEFT JOIN pipeline_leads pl ON l.id = pl.lead_id AND pl.campaign_id = $1
         WHERE l.tenant_id = $2
           AND (l.assigned_to = $3 OR pl.assigned_user_id = $3)
           AND (
             l.database_id = $4
             OR EXISTS (SELECT 1 FROM pipeline_leads pl2 WHERE pl2.lead_id = l.id AND pl2.campaign_id = $1)
           )`,
        [campaignId, tenantId, source_user_id, campaign.database_id]
      );
    }
    // Récupérer des leads spécifiques
    else if (lead_ids && lead_ids.length > 0) {
      leadsToDistribute = await queryAll(
        `SELECT id FROM leads WHERE id = ANY($1::uuid[]) AND tenant_id = $2`,
        [lead_ids, tenantId]
      );
    } else {
      return res.status(400).json({ error: 'lead_ids ou (transfer_all + source_user_id) requis' });
    }

    if (leadsToDistribute.length === 0) {
      return res.status(400).json({ error: 'Aucun lead à distribuer' });
    }

    log(`🔄 Distribution de ${leadsToDistribute.length} leads vers ${targetUsers.length} commerciaux`);

    // Distribuer équitablement les leads entre les utilisateurs
    const distribution = {};
    targetUsers.forEach(u => { distribution[u.id] = []; });

    leadsToDistribute.forEach((lead, index) => {
      const targetIdx = index % targetUsers.length;
      const targetId = targetUsers[targetIdx].id;
      distribution[targetId].push(lead.id);
    });

    // Effectuer la distribution
    let totalTransferred = 0;
    const results = [];

    for (const targetUser of targetUsers) {
      const leadIds = distribution[targetUser.id];
      let transferredCount = 0;

      for (const leadId of leadIds) {
        try {
          await execute(
            `UPDATE leads SET assigned_to = $1, updated_at = NOW() WHERE id = $2`,
            [targetUser.id, leadId]
          );

          await execute(
            `UPDATE pipeline_leads
             SET assigned_user_id = $1, updated_at = NOW()
             WHERE lead_id = $2 AND campaign_id = $3`,
            [targetUser.id, leadId, campaignId]
          );

          transferredCount++;
        } catch (err) {
          error(`Erreur distribution lead ${leadId}:`, err.message);
        }
      }

      totalTransferred += transferredCount;
      results.push({
        user_id: targetUser.id,
        user_name: `${targetUser.first_name} ${targetUser.last_name}`,
        leads_assigned: transferredCount
      });
    }

    log(`✅ ${totalTransferred} leads distribués avec succès`);

    return res.json({
      success: true,
      message: `${totalTransferred} lead(s) distribué(s) entre ${targetUsers.length} commercial(aux)`,
      total_distributed: totalTransferred,
      distribution: results
    });

  } catch (err) {
    error('❌ Erreur distribute-leads:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ==================== GET AVAILABLE USERS FOR TRANSFER ====================
router.get('/:id/available-users', authenticateToken, async (req, res) => {
  try {
    const campaignId = req.params.id;
    const tenantId = req.user?.tenant_id;
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const isSuperAdmin = req.user?.is_super_admin === true;

    let users;

    // Admin ou super admin : voir tous les utilisateurs actifs
    if (isSuperAdmin || userRole === 'admin') {
      users = await queryAll(
        `SELECT id, first_name, last_name, email, role
         FROM users
         WHERE tenant_id = $1 AND is_active = true AND role IN ('manager', 'commercial', 'user')
         ORDER BY first_name, last_name`,
        [tenantId]
      );
    }
    // Manager : voir uniquement les membres de ses équipes
    else if (userRole === 'manager') {
      users = await queryAll(
        `SELECT DISTINCT u.id, u.first_name, u.last_name, u.email, u.role
         FROM users u
         JOIN team_members tm ON u.id = tm.user_id
         JOIN teams t ON tm.team_id = t.id
         WHERE u.tenant_id = $1
           AND u.is_active = true
           AND t.manager_id = $2
         ORDER BY u.first_name, u.last_name`,
        [tenantId, userId]
      );
    } else {
      users = [];
    }

    return res.json({ success: true, users });

  } catch (err) {
    error('❌ Erreur available-users:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ==================== MANAGE TEAM (ADD/REMOVE USERS) ====================
router.patch('/:id/team', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    const campaignId = req.params.id;
    const { action, user_ids } = req.body; // action: 'add' | 'remove', user_ids: string[]

    if (!action || !['add', 'remove'].includes(action)) {
      return res.status(400).json({ error: 'Action invalide (add ou remove)' });
    }

    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return res.status(400).json({ error: 'user_ids requis (tableau d\'UUIDs)' });
    }

    log(`👥 ${action === 'add' ? 'Ajout' : 'Retrait'} de ${user_ids.length} commercial(aux) à/de la campagne ${campaignId}`);

    // Récupérer la campagne
    const campaign = await queryOne(
      'SELECT * FROM campaigns WHERE id = $1 AND tenant_id = $2',
      [campaignId, tenantId]
    );

    if (!campaign) {
      return res.status(404).json({ error: 'Campagne non trouvée' });
    }

    // Parser assigned_users actuel
    let currentUsers = [];
    try {
      currentUsers = Array.isArray(campaign.assigned_users)
        ? campaign.assigned_users
        : JSON.parse(campaign.assigned_users || '[]');
    } catch (e) {
      currentUsers = [];
    }

    let newUsers = [...currentUsers];

    if (action === 'add') {
      // Ajouter les nouveaux utilisateurs
      user_ids.forEach(uid => {
        if (!newUsers.includes(uid)) {
          newUsers.push(uid);
        }
      });

      log(`➕ Ajout de ${user_ids.length} commercial(aux)`);

      // Injecter les leads de chaque nouveau commercial dans le pipeline
      for (const userId of user_ids) {
        if (!currentUsers.includes(userId)) {
          // Récupérer les leads assignés à ce commercial
          const leads = await queryAll(
            `SELECT DISTINCT l.*
             FROM leads l
             JOIN lead_database_relations ldr ON l.id = ldr.lead_id
             WHERE l.tenant_id = $1
               AND ldr.database_id = $2
               AND l.assigned_to = $3`,
            [tenantId, campaign.database_id, userId]
          );

          log(`📊 ${leads.length} leads trouvés pour le commercial ${userId}`);

          // Injecter dans le pipeline
          if (leads.length > 0 && campaign.type !== 'email') {
            await execute('BEGIN');

            try {
              for (const lead of leads) {
                await execute(
                  `INSERT INTO pipeline_leads
                   (id, tenant_id, lead_id, campaign_id, stage, assigned_user_id, created_at, updated_at)
                   VALUES (gen_random_uuid(), $1, $2, $3, 'cold_call', $4, NOW(), NOW())
                   ON CONFLICT (lead_id, campaign_id)
                   DO UPDATE SET assigned_user_id = EXCLUDED.assigned_user_id, updated_at = NOW()`,
                  [tenantId, lead.id, campaignId, userId]
                );
              }

              await execute('COMMIT');
              log(`✅ ${leads.length} leads injectés dans le pipeline pour ${userId}`);

            } catch (e) {
              await execute('ROLLBACK');
              error(`❌ Erreur injection pipeline:`, e.message);
              throw e;
            }
          }
        }
      }

    } else if (action === 'remove') {
      // Retirer les utilisateurs
      newUsers = newUsers.filter(uid => !user_ids.includes(uid));

      log(`➖ Retrait de ${user_ids.length} commercial(aux)`);

      // Optionnel : Retirer les leads du pipeline
      // (ou les laisser pour historique)
      await execute(
        `DELETE FROM pipeline_leads
         WHERE campaign_id = $1
           AND tenant_id = $2
           AND assigned_user_id = ANY($3::uuid[])`,
        [campaignId, tenantId, user_ids]
      );

      log(`✅ Leads retirés du pipeline pour ${user_ids.length} commercial(aux)`);
    }

    // Mettre à jour la campagne
    const updatedCampaign = await queryOne(
      `UPDATE campaigns
       SET assigned_users = $1, updated_at = NOW()
       WHERE id = $2 AND tenant_id = $3
       RETURNING *`,
      [JSON.stringify(newUsers), campaignId, tenantId]
    );

    log(`✅ Équipe mise à jour: ${currentUsers.length} → ${newUsers.length} commercial(aux)`);

    return res.json({
      success: true,
      message: action === 'add'
        ? `${user_ids.length} commercial(aux) ajouté(s) avec succès`
        : `${user_ids.length} commercial(aux) retiré(s) avec succès`,
      campaign: updatedCampaign,
      team_size_before: currentUsers.length,
      team_size_after: newUsers.length
    });

  } catch (err) {
    error('❌ Erreur gestion équipe:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ==================== GET PIPELINE STATS ====================
router.get('/:id/pipeline-stats', authenticateToken, async (req, res) => {
  try {
    const campaignId = req.params.id;
    const tenantId = req.user?.tenant_id;

    // Récupérer la répartition par stage
    const pipeline = await queryAll(
      `SELECT 
        pl.stage,
        COUNT(*) as count
      FROM pipeline_leads pl
      WHERE pl.campaign_id = $1 AND pl.tenant_id = $2
      GROUP BY pl.stage
      ORDER BY 
        CASE pl.stage
          WHEN 'cold_call' THEN 1
          WHEN 'nrp' THEN 2
          WHEN 'qualifie' THEN 3
          WHEN 'relancer' THEN 4
          WHEN 'tres_qualifie' THEN 5
          WHEN 'proposition' THEN 6
          WHEN 'gagne' THEN 7
          WHEN 'hors_scope' THEN 8
          ELSE 9
        END`,
      [campaignId, tenantId]
    );

    return res.json({ success: true, pipeline });

  } catch (err) {
    error('❌ Erreur pipeline-stats:', err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;