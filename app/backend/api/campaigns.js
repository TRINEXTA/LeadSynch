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

    // ✅ NOUVELLE LOGIQUE : Managers avec filtre multi-manager
    let query = `
      SELECT
        c.*,
        ld.name as database_name,
        et.name as template_name
      FROM campaigns c
      LEFT JOIN lead_databases ld ON c.database_id = ld.id
      LEFT JOIN email_templates et ON c.template_id = et.id
      WHERE c.tenant_id = $1
    `;

    const params = [tenantId];

    // Si manager : vérifier s'il y a plusieurs managers
    if (userRole === 'manager') {
      const managerCount = await queryOne(
        'SELECT COUNT(*) as count FROM users WHERE tenant_id = $1 AND role = $2 AND is_active = true',
        [tenantId, 'manager']
      );

      const totalManagers = parseInt(managerCount?.count || 0);
      console.log(`👥 Nombre de managers dans le tenant: ${totalManagers}`);

      // Si plusieurs managers, filtrer par created_by
      if (totalManagers > 1) {
        query += ` AND c.created_by = $2`;
        params.push(userId);
        console.log(`🔒 Filtrage multi-manager activé pour user ${userId}`);
      } else {
        console.log(`✅ Manager unique - accès à toutes les campagnes`);
      }
    }

    query += ` ORDER BY c.created_at DESC`;

    const campaigns = await queryAll(query, params);

    console.log(`📋 Campagnes chargées: ${campaigns.length} (role: ${userRole})`);

    return res.json({ success: true, campaigns });

  } catch (error) {
    console.error('❌ Erreur GET campaigns:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ==================== GET MY CAMPAIGNS ====================
router.get('/my-campaigns', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    console.log(`📋 Chargement campagnes pour user ${userId} (${userRole})`);

    let query = `
      SELECT c.*,
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
    `;

    const params = [tenantId, userId];

    // ✅ NOUVELLE LOGIQUE : Gestion managers multi-tenant
    if (userRole === 'manager') {
      const managerCount = await queryOne(
        'SELECT COUNT(*) as count FROM users WHERE tenant_id = $1 AND role = $2 AND is_active = true',
        [tenantId, 'manager']
      );

      const totalManagers = parseInt(managerCount?.count || 0);

      // Si plusieurs managers, filtrer par created_by
      if (totalManagers > 1) {
        query += ` AND c.created_by = $2`;
        console.log(`🔒 Manager multi-tenant: filtrage par created_by`);
      } else {
        console.log(`✅ Manager unique: accès complet`);
      }
    } else if (userRole !== 'admin') {
      // Commerciaux/users : uniquement leurs campagnes assignées
      query += ` AND (
        c.assigned_users::jsonb ? $2::text
        OR c.created_by = $2
      )`;
    }

    query += `
      GROUP BY c.id, ld.name, et.name
      ORDER BY c.created_at DESC
    `;

    const campaigns = await queryAll(query, params);

    console.log(`✅ ${campaigns.length} campagnes trouvées pour ${userRole}`);

    return res.json({ success: true, campaigns });

  } catch (error) {
    console.error('❌ Erreur my-campaigns:', error);
    return res.status(500).json({ error: error.message });
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
        et.html_body as template_html
      FROM campaigns c
      LEFT JOIN lead_databases ld ON c.database_id = ld.id
      LEFT JOIN email_templates et ON c.template_id = et.id
      WHERE c.id = $1 AND c.tenant_id = $2`,
      [campaignId, tenantId]
    );
    
    if (!campaign) {
      return res.status(404).json({ error: 'Campagne non trouvée' });
    }
    
    return res.json({ success: true, campaign });
    
  } catch (error) {
    console.error('❌ Erreur GET campaign:', error);
    return res.status(500).json({ error: error.message });
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
    } catch (error) {
      return res.status(400).json({
        error: 'Données invalides',
        details: error.errors?.map(e => `${e.path.join('.')}: ${e.message}`)
      });
    }

    const {
      name, type, objective, subject, goal_description, message, link,
      database_id, template_id, assigned_users, send_days,
      send_time_start, send_time_end, start_date, start_time,
      emails_per_cycle, cycle_interval_minutes, status, sectors,
      attachments, track_clicks, auto_distribute
    } = validatedData;

    console.log('📥 Données validées:', { name, type, database_id });

    let leads = [];
    
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
           WHERE l.tenant_id = $1 AND ldr.database_id = $2 AND (${sectorConditions.join(' OR ')})`,
          params
        );
      }
    } else {
      leads = await queryAll(
        `SELECT DISTINCT l.* 
         FROM leads l
         JOIN lead_database_relations ldr ON l.id = ldr.lead_id
         WHERE l.tenant_id = $1 AND ldr.database_id = $2`,
        [tenantId, database_id]
      );
    }

    console.log(`📊 ${leads.length} leads trouvés`);

    if (leads.length === 0) {
      return res.status(400).json({ error: 'Aucun lead trouvé dans cette base' });
    }
	const campaign = await queryOne(
      `INSERT INTO campaigns (
        tenant_id, name, type, campaign_type, objective, subject, description,
        database_id, sector, template_id, status, send_days,
        send_time_start, send_time_end, start_date,
        emails_per_cycle, cycle_interval_minutes, assigned_users,
        total_leads, track_clicks, auto_distribute,
        created_by, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, NOW(), NOW()
      ) RETURNING *`,
      [
        tenantId, name, type, type, objective || 'leads', subject || null,
        goal_description || null, database_id,
        sectors ? JSON.stringify(sectors) : null, template_id || null,
        status || 'draft', JSON.stringify(send_days || [1,2,3,4,5]),
        send_time_start || '08:00', send_time_end || '18:00', start_date || null,
        emails_per_cycle || 50, cycle_interval_minutes || 10,
        JSON.stringify(assigned_users || []), leads.length,
        track_clicks !== false, auto_distribute !== false, userId
      ]
    );

    console.log('✅ Campagne créée:', campaign.id);

    if (type === 'email') {
      console.log('📧 Ajout des emails à la queue...');
      
      for (const lead of leads) {
        await execute(
          `INSERT INTO email_queue (campaign_id, lead_id, tenant_id, recipient_email, status, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [campaign.id, lead.id, tenantId, lead.email, 'pending']
        );
      }
      
      console.log(`✅ ${leads.length} emails ajoutés à la queue`);
    }

    // ✅ CORRECTION ICI - LIGNE 337-370
    if (type !== 'email' && assigned_users && assigned_users.length > 0) {
      console.log(`👥 Affectation de ${leads.length} leads à ${assigned_users.length} commercial(aux)...`);

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
        console.log(`✅ ${leads.length} leads affectés et injectés dans le pipeline`);
        
      } catch (e) {
        await execute('ROLLBACK');
        console.error('❌ Erreur affectation/injection :', e.message);
        throw e;
      }
    }

    return res.json({ success: true, campaign });

  } catch (error) {
    console.error('❌ Erreur création campagne:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ==================== UPDATE CAMPAIGN ====================
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    const campaignId = req.params.id;
    const updates = req.body;

    console.log('📝 Mise à jour campagne:', campaignId, 'avec:', updates);

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

    console.log('✅ Campagne mise à jour:', campaignId);

    // ✅ Si assigned_users a été modifié ET c'est une campagne phoning, injecter dans pipeline
    if (updates.assigned_users !== undefined && campaign.type !== 'email' && updates.assigned_users.length > 0) {
      console.log(`👥 Réaffectation: injection de leads dans le pipeline pour ${updates.assigned_users.length} commercial(aux)...`);

      // Récupérer les leads de la base de données de la campagne
      const leads = await queryAll(
        `SELECT DISTINCT l.*
         FROM leads l
         JOIN lead_database_relations ldr ON l.id = ldr.lead_id
         WHERE l.tenant_id = $1 AND ldr.database_id = $2`,
        [tenantId, campaign.database_id]
      );

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
          console.log(`✅ ${leads.length} leads réaffectés et injectés dans le pipeline`);

        } catch (e) {
          await execute('ROLLBACK');
          console.error('❌ Erreur réaffectation/injection :', e.message);
          throw e;
        }
      }
    }

    return res.json({ success: true, campaign });

  } catch (error) {
    console.error('❌ Erreur update:', error);
    return res.status(500).json({ error: error.message });
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
        console.log(`✅ ${leads.length} emails ajoutés à la queue`);
      }
    }

    console.log('🟢 Campagne démarrée:', campaignId);
    return res.json({ success: true, campaign });

  } catch (error) {
    console.error('❌ Erreur start:', error);
    return res.status(500).json({ error: error.message });
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

    console.log('⏸️ Campagne mise en pause:', campaignId);
    return res.json({ success: true, campaign });

  } catch (error) {
    console.error('❌ Erreur pause:', error);
    return res.status(500).json({ error: error.message });
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

    console.log('▶️ Campagne reprise:', campaignId);
    return res.json({ success: true, campaign });

  } catch (error) {
    console.error('❌ Erreur resume:', error);
    return res.status(500).json({ error: error.message });
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

    console.log('⏹️ Campagne arrêtée:', campaignId);
    return res.json({ success: true, campaign });

  } catch (error) {
    console.error('❌ Erreur stop:', error);
    return res.status(500).json({ error: error.message });
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

    console.log('📦 Campagne archivée:', campaignId);
    return res.json({ success: true, campaign });

  } catch (error) {
    console.error('❌ Erreur archive:', error);
    return res.status(500).json({ error: error.message });
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

    console.log('📂 Campagne désarchivée:', campaignId);
    return res.json({ success: true, campaign });

  } catch (error) {
    console.error('❌ Erreur unarchive:', error);
    return res.status(500).json({ error: error.message });
  }
});
// ==================== RELAUNCH CAMPAIGN ====================
router.post('/:id/relaunch', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    const userId = req.user?.id;
    const campaignId = req.params.id;
    
    console.log('🔄 Relance campagne:', campaignId);
    
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
    console.log(`📊 ${excludedIds.length} leads à exclure (RGPD)`);
    
    const allLeads = await queryAll(
      `SELECT DISTINCT l.* FROM leads l
       JOIN lead_database_relations ldr ON l.id = ldr.lead_id
       WHERE l.tenant_id = $1 AND ldr.database_id = $2`,
      [tenantId, campaign.database_id]
    );
    
    const eligibleLeads = allLeads.filter(l => !excludedIds.includes(l.id));
    
    console.log(`✅ ${eligibleLeads.length} leads éligibles pour relance`);
    
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
    
    console.log(`✅ Relance créée: ${eligibleLeads.length} emails en queue`);
    
    return res.json({ 
      success: true, 
      campaign: newCampaign,
      leads_count: eligibleLeads.length,
      excluded_count: excludedIds.length
    });
    
  } catch (error) {
    console.error('❌ Erreur relance:', error);
    return res.status(500).json({ error: error.message });
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
    
    console.log('📋 Campagne dupliquée:', newCampaign.id);
    
    return res.json({ success: true, campaign: newCampaign });
    
  } catch (error) {
    console.error('❌ Erreur duplication:', error);
    return res.status(500).json({ error: error.message });
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
    
    console.log('🗑️ Campagne supprimée:', campaignId);
    
    return res.json({ success: true, message: 'Campagne supprimée' });
    
  } catch (error) {
    console.error('❌ Erreur suppression:', error);
    return res.status(500).json({ error: error.message });
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
    
    console.log(`📧 Envoi de ${recipients.length} emails de test...`);
    
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
      } catch (error) {
        console.error(`❌ Erreur envoi à ${recipient}:`, error);
        results.failed.push({ email: recipient, error: error.message });
      }
    }
    
    console.log(`✅ Envoi terminé: ${results.success.length} succès, ${results.failed.length} échecs`);
    
    return res.json({ 
      success: true, 
      message: `${results.success.length}/${recipients.length} email(s) de test envoyé(s)`,
      results
    });
    
  } catch (error) {
    console.error('❌ Erreur envoi test:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ==================== FORCE SYNC STATS ====================
router.post('/:id/force-sync', authenticateToken, async (req, res) => {
  try {
    const campaignId = req.params.id;
    const tenantId = req.user?.tenant_id;

    console.log('🔄 [FORCE SYNC] Synchronisation forcée pour:', campaignId);

    const { pollingService } = await import('../lib/elasticEmailPolling.js');
    
    await pollingService.syncCampaignStats(campaignId);
    
    return res.json({ success: true, message: 'Synchronisation forcée lancée' });
    
  } catch (error) {
    console.error('❌ Erreur force sync:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ==================== GET PHONING STATS ====================
router.get('/:id/phoning-stats', authenticateToken, async (req, res) => {
  try {
    const campaignId = req.params.id;
    const tenantId = req.user?.tenant_id;

    // Vérifier que la campagne existe et appartient au tenant
    const campaign = await queryOne(
      'SELECT id, type, database_id FROM campaigns WHERE id = $1 AND tenant_id = $2',
      [campaignId, tenantId]
    );

    if (!campaign) {
      return res.status(404).json({ error: 'Campagne non trouvée' });
    }

    // Compter le nombre total de leads dans la campagne (via database_id)
    const totalLeadsResult = await queryOne(
      `SELECT COUNT(DISTINCT l.id) as total
       FROM leads l
       WHERE l.database_id = $1 AND l.tenant_id = $2`,
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

    return res.json({ success: true, stats });

  } catch (error) {
    console.error('❌ Erreur phoning-stats:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ==================== GET COMMERCIALS ====================
router.get('/:id/commercials', authenticateToken, async (req, res) => {
  try {
    const campaignId = req.params.id;
    const tenantId = req.user?.tenant_id;

    // Récupérer la campagne avec ses utilisateurs assignés
    const campaign = await queryOne(
      'SELECT assigned_users FROM campaigns WHERE id = $1 AND tenant_id = $2',
      [campaignId, tenantId]
    );

    if (!campaign) {
      return res.status(404).json({ error: 'Campagne non trouvée' });
    }

    // Si pas d'utilisateurs assignés, retourner tableau vide
    const assignedUserIds = campaign.assigned_users || [];
    if (assignedUserIds.length === 0) {
      return res.json({ success: true, commercials: [] });
    }

    // Récupérer les commerciaux avec leurs stats depuis pipeline_leads
    const commercials = await queryAll(
      `SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.role,
        COUNT(DISTINCT pl.lead_id) as leads_assigned,
        COUNT(DISTINCT CASE WHEN pl.stage != 'cold_call' THEN pl.lead_id END) as leads_contacted,
        COUNT(DISTINCT CASE WHEN pl.stage IN ('tres_qualifie', 'proposition', 'gagne') THEN pl.lead_id END) as meetings_scheduled
      FROM users u
      LEFT JOIN pipeline_leads pl ON pl.assigned_user_id = u.id AND pl.campaign_id = $1
      WHERE u.id = ANY($2::uuid[]) AND u.tenant_id = $3
      GROUP BY u.id, u.first_name, u.last_name, u.email, u.role
      ORDER BY u.first_name, u.last_name`,
      [campaignId, assignedUserIds, tenantId]
    );

    return res.json({ success: true, commercials });

  } catch (error) {
    console.error('❌ Erreur commercials:', error);
    return res.status(500).json({ error: error.message });
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

  } catch (error) {
    console.error('❌ Erreur pipeline-stats:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;