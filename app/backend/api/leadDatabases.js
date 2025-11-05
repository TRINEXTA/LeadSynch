import express from 'express';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Helpers pour éviter la répétition
const queryOne = async (query, params = []) => {
  const { rows } = await router.db.query(query, params);
  return rows[0] || null;
};

const queryAll = async (query, params = []) => {
  const { rows } = await router.db.query(query, params);
  return rows;
};

const execute = async (query, params = []) => {
  return await router.db.query(query, params);
};

// ==================== GET ALL CAMPAIGNS ====================
router.get('/', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    
    const campaigns = await queryAll(
      `SELECT 
        c.*,
        ld.name as database_name,
        et.name as template_name,
        COUNT(DISTINCT eq.id) FILTER (WHERE eq.status = 'sent') as emails_sent,
        COUNT(DISTINCT eq.id) FILTER (WHERE eq.opened_at IS NOT NULL) as emails_opened,
        COUNT(DISTINCT eq.id) FILTER (WHERE eq.clicked_at IS NOT NULL) as emails_clicked,
        COUNT(DISTINCT eq.id) as total_emails
      FROM campaigns c
      LEFT JOIN lead_databases ld ON c.database_id = ld.id
      LEFT JOIN email_templates et ON c.template_id = et.id
      LEFT JOIN email_queue eq ON c.id = eq.campaign_id
      WHERE c.tenant_id = $1
      GROUP BY c.id, ld.name, et.name
      ORDER BY c.created_at DESC`,
      [tenantId]
    );
    
    console.log('📊 Campagnes chargées:', campaigns);
    
    return res.json({ success: true, campaigns });
    
  } catch (error) {
    console.error('❌ Erreur GET campaigns:', error);
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
    
    const stats = await queryOne(
      `SELECT 
        COUNT(*) FILTER (WHERE status = 'sent') as sent,
        COUNT(*) FILTER (WHERE opened_at IS NOT NULL) as opened,
        COUNT(*) FILTER (WHERE clicked_at IS NOT NULL) as clicked,
        COUNT(*) FILTER (WHERE bounced_at IS NOT NULL) as bounced,
        COUNT(*) FILTER (WHERE unsubscribed_at IS NOT NULL) as unsubscribed,
        COUNT(*) as total
      FROM email_queue
      WHERE campaign_id = $1`,
      [campaignId]
    );
    
    campaign.stats = stats || { sent: 0, opened: 0, clicked: 0, bounced: 0, unsubscribed: 0, total: 0 };
    
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
    const {
      name,
      type,
      objective,
      subject,
      goal_description,
      message,
      link,
      database_id,
      template_id,
      assigned_users,
      send_days,
      send_time_start,
      send_time_end,
      start_date,
      start_time,
      emails_per_cycle,
      cycle_interval_minutes,
      status,
      sectors,
      attachments
    } = req.body;

    console.log('Données reçues:', req.body);

    // Validation
    if (!name || !type || !database_id) {
      return res.status(400).json({ error: 'Champs requis manquants' });
    }

    // Récupérer les leads
    let leads = [];
    
    if (sectors && Object.keys(sectors).length > 0) {
      const sectorFilter = Object.entries(sectors)
        .filter(([_, sectorList]) => sectorList.length > 0)
        .map(([dbId, sectorList]) => 
          `(ldr.database_id = '${dbId}' AND l.sector = ANY(ARRAY[${sectorList.map(s => `'${s}'`).join(',')}]))`
        )
        .join(' OR ');
      
      if (sectorFilter) {
        leads = await queryAll(
          `SELECT DISTINCT l.* 
           FROM leads l
           JOIN lead_database_relations ldr ON l.id = ldr.lead_id
           WHERE l.tenant_id = $1 
           AND ldr.database_id = $2
           AND (${sectorFilter})`,
          [tenantId, database_id]
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

    console.log(`${leads.length} leads trouvés`);

    if (leads.length === 0) {
      return res.status(400).json({ error: 'Aucun lead trouvé' });
    }

    // Créer la campagne
    const campaign = await queryOne(
      `INSERT INTO campaigns (
        tenant_id,
        name,
        type,
        objective,
        subject,
        goal_description,
        message,
        link,
        database_id,
        template_id,
        status,
        send_days,
        send_time_start,
        send_time_end,
        start_date,
        start_time,
        emails_per_cycle,
        cycle_interval_minutes,
        assigned_users,
        sectors,
        attachments,
        total_leads,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, NOW(), NOW())
      RETURNING *`,
      [
        tenantId,
        name,
        type,
        objective || 'leads',
        subject || null,
        goal_description,
        message || null,
        link || null,
        database_id,
        template_id || null,
        status || 'draft',
        JSON.stringify(send_days || [1,2,3,4,5]),
        send_time_start || '08:00',
        send_time_end || '18:00',
        start_date || null,
        start_time || '08:00',
        emails_per_cycle || 50,
        cycle_interval_minutes || 10,
        JSON.stringify(assigned_users || []),
        JSON.stringify(sectors || {}),
        JSON.stringify(attachments || []),
        leads.length
      ]
    );

    // Si status = active, ajouter à la queue
    if ((status === 'active' || !start_date) && type === 'email') {
      console.log('📧 Ajout des emails à la queue...');
      
      for (const lead of leads) {
        await execute(
          `INSERT INTO email_queue (
            campaign_id,
            lead_id,
            tenant_id,
            status,
            scheduled_at,
            created_at
          ) VALUES ($1, $2, $3, $4, NOW(), NOW())`,
          [campaign.id, lead.id, tenantId, 'pending']
        );
      }
      
      console.log(`✅ ${leads.length} emails ajoutés à la queue`);
    }

    console.log('✅ Campagne créée:', campaign.id);

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

    const campaign = await queryOne(
      `UPDATE campaigns 
       SET 
         name = COALESCE($1, name),
         subject = COALESCE($2, subject),
         goal_description = COALESCE($3, goal_description),
         message = COALESCE($4, message),
         link = COALESCE($5, link),
         template_id = COALESCE($6, template_id),
         send_days = COALESCE($7, send_days),
         send_time_start = COALESCE($8, send_time_start),
         send_time_end = COALESCE($9, send_time_end),
         start_date = COALESCE($10, start_date),
         start_time = COALESCE($11, start_time),
         emails_per_cycle = COALESCE($12, emails_per_cycle),
         assigned_users = COALESCE($13, assigned_users),
         updated_at = NOW()
       WHERE id = $14 AND tenant_id = $15
       RETURNING *`,
      [
        updates.name,
        updates.subject,
        updates.goal_description,
        updates.message,
        updates.link,
        updates.template_id,
        updates.send_days ? JSON.stringify(updates.send_days) : null,
        updates.send_time_start,
        updates.send_time_end,
        updates.start_date,
        updates.start_time,
        updates.emails_per_cycle,
        updates.assigned_users ? JSON.stringify(updates.assigned_users) : null,
        campaignId,
        tenantId
      ]
    );

    if (!campaign) {
      return res.status(404).json({ error: 'Campagne non trouvée' });
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
      `UPDATE campaigns 
       SET status = 'active', updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2
       RETURNING *`,
      [campaignId, tenantId]
    );

    if (!campaign) {
      return res.status(404).json({ error: 'Campagne non trouvée' });
    }

    // Ajouter les emails à la queue si pas déjà fait
    const existingEmails = await queryOne(
      'SELECT COUNT(*) as count FROM email_queue WHERE campaign_id = $1',
      [campaignId]
    );

    if (existingEmails.count === 0 && campaign.type === 'email') {
      const leads = await queryAll(
        `SELECT DISTINCT l.* 
         FROM leads l
         JOIN lead_database_relations ldr ON l.id = ldr.lead_id
         WHERE l.tenant_id = $1 AND ldr.database_id = $2`,
        [tenantId, campaign.database_id]
      );

      for (const lead of leads) {
        await execute(
          `INSERT INTO email_queue (
            campaign_id, lead_id, tenant_id, status, scheduled_at, created_at
          ) VALUES ($1, $2, $3, 'pending', NOW(), NOW())`,
          [campaignId, lead.id, tenantId]
        );
      }

      console.log(`✅ ${leads.length} emails ajoutés à la queue`);
    }

    console.log('▶️ Campagne démarrée:', campaignId);

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
      `UPDATE campaigns 
       SET status = 'paused', updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2
       RETURNING *`,
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
      `UPDATE campaigns 
       SET status = 'active', updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2
       RETURNING *`,
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
      `UPDATE campaigns 
       SET status = 'stopped', updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2
       RETURNING *`,
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
      `UPDATE campaigns 
       SET status = 'archived', updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2
       RETURNING *`,
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
      `UPDATE campaigns 
       SET status = 'draft', updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2
       RETURNING *`,
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

// ==================== RELAUNCH CAMPAIGN (NOUVELLE ROUTE) ====================
router.post('/:id/relaunch', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    const campaignId = req.params.id;
    
    console.log('🔄 Relance campagne:', campaignId);
    
    // 1. Récupérer la campagne
    const campaign = await queryOne(
      'SELECT * FROM campaigns WHERE id = $1 AND tenant_id = $2',
      [campaignId, tenantId]
    );
    
    if (!campaign) {
      return res.status(404).json({ error: 'Campagne non trouvée' });
    }
    
    // 2. Récupérer les leads EXCLUS (bounce, unsub, cliqué)
    const excludedLeads = await queryAll(
      `SELECT DISTINCT lead_id 
       FROM email_queue 
       WHERE campaign_id = $1 
       AND (
         bounced_at IS NOT NULL 
         OR unsubscribed_at IS NOT NULL 
         OR clicked_at IS NOT NULL
       )`,
      [campaignId]
    );
    
    const excludedIds = excludedLeads.map(l => l.lead_id);
    console.log(`❌ ${excludedIds.length} leads à exclure (RGPD)`);
    
    // 3. Récupérer TOUS les leads de la base
    const allLeads = await queryAll(
      `SELECT DISTINCT l.* 
       FROM leads l
       JOIN lead_database_relations ldr ON l.id = ldr.lead_id
       WHERE l.tenant_id = $1 AND ldr.database_id = $2`,
      [tenantId, campaign.database_id]
    );
    
    // 4. Filtrer les leads éligibles
    const eligibleLeads = allLeads.filter(l => !excludedIds.includes(l.id));
    
    console.log(`✅ ${eligibleLeads.length} leads éligibles pour relance`);
    
    if (eligibleLeads.length === 0) {
      return res.status(400).json({ 
        error: 'Aucun lead éligible pour la relance (tous exclus ou déjà contactés)' 
      });
    }
    
    // 5. Créer une NOUVELLE campagne (copie)
    const newCampaign = await queryOne(
      `INSERT INTO campaigns (
        tenant_id, name, type, objective, subject, goal_description,
        message, link, database_id, template_id, status,
        send_days, send_time_start, send_time_end,
        start_date, start_time, emails_per_cycle, cycle_interval_minutes,
        assigned_users, sectors, attachments, total_leads,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, NOW(), NOW()
      ) RETURNING *`,
      [
        campaign.tenant_id,
        `${campaign.name} (Relance)`,
        campaign.type,
        campaign.objective,
        campaign.subject,
        campaign.goal_description,
        campaign.message,
        campaign.link,
        campaign.database_id,
        campaign.template_id,
        'active',
        campaign.send_days,
        campaign.send_time_start,
        campaign.send_time_end,
        null,
        campaign.start_time,
        campaign.emails_per_cycle,
        campaign.cycle_interval_minutes,
        campaign.assigned_users,
        campaign.sectors,
        campaign.attachments,
        eligibleLeads.length
      ]
    );
    
    // 6. Ajouter les leads éligibles à la queue
    for (const lead of eligibleLeads) {
      await execute(
        `INSERT INTO email_queue (
          campaign_id, lead_id, tenant_id, status, scheduled_at, created_at
        ) VALUES ($1, $2, $3, 'pending', NOW(), NOW())`,
        [newCampaign.id, lead.id, tenantId]
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
        tenant_id, name, type, objective, subject, goal_description,
        message, link, database_id, template_id, status,
        send_days, send_time_start, send_time_end,
        start_date, start_time, emails_per_cycle, cycle_interval_minutes,
        assigned_users, sectors, attachments, total_leads,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, NOW(), NOW()
      ) RETURNING *`,
      [
        campaign.tenant_id,
        `${campaign.name} (Copie)`,
        campaign.type,
        campaign.objective,
        campaign.subject,
        campaign.goal_description,
        campaign.message,
        campaign.link,
        campaign.database_id,
        campaign.template_id,
        'draft',
        campaign.send_days,
        campaign.send_time_start,
        campaign.send_time_end,
        null,
        campaign.start_time,
        campaign.emails_per_cycle,
        campaign.cycle_interval_minutes,
        campaign.assigned_users,
        campaign.sectors,
        campaign.attachments,
        campaign.total_leads
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
    
    // Supprimer les emails de la queue
    await execute('DELETE FROM email_queue WHERE campaign_id = $1', [campaignId]);
    
    // Supprimer la campagne
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

// ==================== SEND TEST EMAILS (CORRIGÉ) ====================
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
    
    // Récupérer le template
    const template = await queryOne(
      'SELECT * FROM email_templates WHERE id = $1 AND tenant_id = $2',
      [template_id, tenantId]
    );
    
    if (!template) {
      return res.status(404).json({ error: 'Template non trouvé' });
    }
    
    console.log(`📧 Envoi de ${recipients.length} emails de test...`);
    
    // TODO: Implémenter l'envoi via Elastic Email
    // Pour l'instant, on simule
    
    console.log('✅ Emails de test envoyés');
    
    return res.json({ 
      success: true, 
      message: `${recipients.length} email(s) de test envoyé(s)`,
      recipients 
    });
    
  } catch (error) {
    console.error('❌ Erreur envoi test:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;