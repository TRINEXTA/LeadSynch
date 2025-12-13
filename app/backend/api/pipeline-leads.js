import { log, error, warn } from "../lib/logger.js";
﻿import express from 'express';
import { authMiddleware as authenticateToken } from '../middleware/auth.js';
import db from '../config/db.js';

const router = express.Router();

const q = (text, params=[]) => db.query(text, params);

// =============================
// GET /pipeline-leads
// Récupère les leads du pipeline pour l'utilisateur connecté
// OPTIMISÉ: Sans subqueries, avec LIMIT
// =============================
router.get('/', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const isSuperAdmin = req.user?.is_super_admin === true;
    const limit = Math.min(parseInt(req.query.limit) || 500, 1000);

    // Requête optimisée sans subqueries
    let query = `
      SELECT
        pl.id,
        pl.lead_id,
        pl.campaign_id,
        pl.stage,
        pl.assigned_user_id,
        pl.deal_value,
        pl.created_at,
        pl.updated_at,
        l.company_name,
        l.contact_name,
        l.email,
        l.phone,
        l.city,
        l.sector,
        l.status as lead_status,
        c.name as campaign_name,
        c.type as campaign_type,
        u.first_name || ' ' || u.last_name as assigned_user_name
      FROM pipeline_leads pl
      JOIN leads l ON l.id = pl.lead_id
      LEFT JOIN campaigns c ON c.id = pl.campaign_id
      LEFT JOIN users u ON pl.assigned_user_id = u.id
      WHERE pl.tenant_id = $1
    `;

    const params = [tenantId];
    let paramIndex = 2;

    // Admin ou super admin : voir tous les leads
    if (isSuperAdmin || userRole === 'admin') {
      // Pas de filtre supplémentaire
    }
    // Manager : voir ses leads + ceux assignés
    else if (userRole === 'manager') {
      query += ` AND (pl.assigned_user_id = $${paramIndex} OR l.assigned_to = $${paramIndex})`;
      params.push(userId);
      paramIndex++;
    }
    // Commercial/User : uniquement ses propres leads
    else {
      query += ` AND (pl.assigned_user_id = $${paramIndex} OR l.assigned_to = $${paramIndex})`;
      params.push(userId);
      paramIndex++;
    }

    query += ` ORDER BY pl.updated_at DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const { rows } = await q(query, params);

    log(`Pipeline leads: ${rows.length} (limit: ${limit})`);

    return res.json({ success: true, leads: rows });

  } catch (err) {
    error('❌ Erreur GET pipeline-leads:', err);
    return res.status(500).json({ error: err.message });
  }
});

// =============================
// 🆕 POST /pipeline-leads/:id/action
// Enregistrer une action sur un lead (email, appel, etc.)
// =============================
router.post('/:id/action', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { action_type, notes } = req.body;
    const user_id = req.user.id;
    const tenant_id = req.user.tenant_id;

    log(`📝 Enregistrement action ${action_type} pour lead ${id}`);

    // Vérifier que le lead appartient au tenant
    const { rows: leadCheck } = await q(
      `SELECT id, stage, lead_id, campaign_id FROM pipeline_leads 
       WHERE id = $1 AND tenant_id = $2`,
      [id, tenant_id]
    );

    if (leadCheck.length === 0) {
      return res.status(404).json({ success: false, message: 'Lead non trouvé' });
    }

    const pipelineLead = leadCheck[0];
    const currentStage = pipelineLead.stage;

    // Insérer dans l'historique
    await q(
      `INSERT INTO lead_call_history 
       (tenant_id, lead_id, pipeline_lead_id, campaign_id, action_type, 
        stage_before, stage_after, notes, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
      [
        tenant_id,
        pipelineLead.lead_id,
        pipelineLead.id,
        pipelineLead.campaign_id,
        action_type,
        currentStage,
        currentStage,
        notes || '',
        user_id
      ]
    );

    // Mettre à jour last_activity_at
    await q(
      `UPDATE pipeline_leads 
       SET updated_at = NOW() 
       WHERE id = $1`,
      [id]
    );

    log(`✅ Action ${action_type} enregistrée pour lead ${id}`);

    res.json({ 
      success: true, 
      message: 'Action enregistrée avec succès'
    });

  } catch (error) {
    error('❌ Erreur enregistrement action:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de l\'enregistrement de l\'action'
    });
  }
});

// =============================
// 🆕 FONCTION INTERNE : Auto-refill intelligent
// Maintient le pipeline à ~50 leads par commercial
// =============================
async function smartRefill(campaign_id, user_id, tenant_id) {
  try {
    const TARGET_SIZE = 50;
    
    log(`🔄 [SMART-REFILL] Vérification pour user ${user_id} campagne ${campaign_id}`);

    // 1. Récupérer le compteur de qualifications
    const { rows: assignmentRows } = await q(
      `SELECT qualified_since_last_refill, leads_assigned 
       FROM campaign_assignments 
       WHERE campaign_id = $1 AND user_id = $2`,
      [campaign_id, user_id]
    );

    if (!assignmentRows.length) {
      log(`⚠️ Aucun assignment trouvé pour user ${user_id}`);
      return { success: false, message: 'Assignment non trouvé' };
    }

    const qualifiedCount = assignmentRows[0].qualified_since_last_refill || 0;
    
    // 2. Compter les leads actifs dans le pipeline (cold_call uniquement)
    const { rows: activeRows } = await q(
      `SELECT COUNT(*) as count
       FROM pipeline_leads
       WHERE campaign_id = $1 
         AND assigned_user_id = $2
         AND stage = 'cold_call'`,
      [campaign_id, user_id]
    );

    const activeColdCallCount = parseInt(activeRows[0]?.count || 0);
    
    log(`📊 User ${user_id}: ${qualifiedCount} qualifiés, ${activeColdCallCount} leads en Cold Call`);

    // 3. Si moins de 10 qualifications, ne rien faire
    if (qualifiedCount < 10) {
      log(`⏳ Pas assez de qualifications (${qualifiedCount}/10)`);
      return { success: true, message: 'Pas encore 10 qualifications', deployed: 0 };
    }

    // 4. Calculer combien de leads envoyer
    const needed = Math.min(TARGET_SIZE, Math.max(0, qualifiedCount - activeColdCallCount));

    if (needed === 0) {
      log(`✅ Pipeline déjà plein (${activeColdCallCount} leads)`);
      await q(
        `UPDATE campaign_assignments 
         SET qualified_since_last_refill = 0
         WHERE campaign_id = $1 AND user_id = $2`,
        [campaign_id, user_id]
      );
      return { success: true, message: 'Pipeline plein', deployed: 0 };
    }

    log(`🎯 Besoin d'envoyer ${needed} nouveaux leads`);

    // 5. Récupérer la campagne
    const { rows: campRows } = await q(
      `SELECT id, database_id FROM campaigns WHERE id = $1`,
      [campaign_id]
    );

    if (!campRows.length) {
      return { success: false, message: 'Campagne introuvable' };
    }

    const campaign = campRows[0];

    // 6. Trouver des leads en attente
    const { rows: candidates } = await q(
      `SELECT l.id AS lead_id
       FROM leads l
       WHERE l.tenant_id = $1
         AND l.database_id = $2
         AND l.assigned_to = $3
         AND NOT EXISTS (
           SELECT 1 FROM pipeline_leads pl
           WHERE pl.lead_id = l.id AND pl.campaign_id = $4
         )
       ORDER BY COALESCE(l.updated_at, l.created_at) ASC
       LIMIT $5`,
      [tenant_id, campaign.database_id, user_id, campaign_id, needed]
    );

    if (!candidates.length) {
      log(`⚠️ Plus de leads disponibles pour user ${user_id}`);
      await q(
        `UPDATE campaign_assignments 
         SET qualified_since_last_refill = 0
         WHERE campaign_id = $1 AND user_id = $2`,
        [campaign_id, user_id]
      );
      return { success: true, message: 'Plus de leads disponibles', deployed: 0 };
    }

    // 7. Insérer dans le pipeline
    let deployed = 0;
    for (const row of candidates) {
      try {
        await q(
          `INSERT INTO pipeline_leads 
           (id, tenant_id, lead_id, campaign_id, stage, assigned_user_id, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, $3, 'cold_call', $4, NOW(), NOW())
           ON CONFLICT (lead_id, campaign_id) DO NOTHING`,
          [tenant_id, row.lead_id, campaign_id, user_id]
        );
        deployed++;
      } catch (err) {
        error('Erreur insertion lead:', err);
      }
    }

    // 8. Reset le compteur
    await q(
      `UPDATE campaign_assignments 
       SET qualified_since_last_refill = 0,
           leads_assigned = leads_assigned + $1
       WHERE campaign_id = $2 AND user_id = $3`,
      [deployed, campaign_id, user_id]
    );

    log(`✅ [SMART-REFILL] ${deployed} leads ajoutés au pipeline de user ${user_id}`);

    return { 
      success: true, 
      deployed,
      message: `${deployed} nouveaux leads ajoutés`
    };

  } catch (error) {
    error('❌ [SMART-REFILL] Erreur:', error);
    return { success: false, error: error.message };
  }
}

// =============================
// POST /pipeline-leads/auto-refill
// Vérifie et réapprovisionne automatiquement chaque commercial à 50 leads
// =============================
router.post('/auto-refill', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    const { campaign_id } = req.body;
    const TARGET_SIZE = 50;
    const MIN_THRESHOLD = 10;

    if (!campaign_id) {
      return res.status(400).json({ error: 'campaign_id requis' });
    }

    // 1) Récupérer la campagne
    const { rows: campRows } = await q(
      `SELECT id, tenant_id, type, database_id, assigned_users
       FROM campaigns
       WHERE id = $1 AND tenant_id = $2`,
      [campaign_id, tenantId]
    );
    const campaign = campRows[0];
    if (!campaign || campaign.type === 'email') {
      return res.json({ success: true, message: 'Campagne non éligible', refilled: 0 });
    }

    // 2) Liste des commerciaux
    const { rows: userRows } = await q(
      `SELECT DISTINCT l.assigned_to as user_id
       FROM leads l
       WHERE l.tenant_id = $1
         AND l.database_id = $2
         AND l.assigned_to IS NOT NULL`,
      [tenantId, campaign.database_id]
    );
    
    const assignedUsers = userRows.map(r => r.user_id).filter(Boolean);

    if (!assignedUsers.length) {
      return res.json({ success: true, message: 'Aucun commercial affecté', refilled: 0 });
    }
    
    log(`👥 Commerciaux trouvés: ${assignedUsers.length}`, assignedUsers);

    // 3) Pour chaque commercial, vérifier et refill
    const refillResults = {};
    let totalRefilled = 0;

    for (const userId of assignedUsers) {
      const { rows: activeRows } = await q(
        `SELECT COUNT(*) as count
         FROM pipeline_leads pl
         WHERE pl.campaign_id = $1
           AND pl.assigned_user_id = $2
           AND pl.stage = 'cold_call'`,
        [campaign_id, userId]
      );
      
      const activeCount = parseInt(activeRows[0]?.count || 0);
      
      if (activeCount < MIN_THRESHOLD) {
        const needed = TARGET_SIZE - activeCount;
        
        const { rows: candidates } = await q(
          `SELECT l.id AS lead_id
           FROM leads l
           WHERE l.tenant_id = $1
             AND l.database_id = $2
             AND l.assigned_to = $3
             AND NOT EXISTS (
               SELECT 1 FROM pipeline_leads pl
               WHERE pl.lead_id = l.id AND pl.campaign_id = $4
             )
           ORDER BY COALESCE(l.updated_at, l.created_at) ASC
           LIMIT $5`,
          [tenantId, campaign.database_id, userId, campaign_id, needed]
        );

        let deployed = 0;
        for (const row of candidates) {
          try {
            await q(
              `INSERT INTO pipeline_leads 
               (id, tenant_id, lead_id, campaign_id, stage, assigned_user_id, created_at, updated_at)
               VALUES (gen_random_uuid(), $1, $2, $3, 'cold_call', $4, NOW(), NOW())
               ON CONFLICT (lead_id, campaign_id) DO NOTHING`,
              [tenantId, row.lead_id, campaign_id, userId]
            );
            deployed++;
          } catch (err) {
            error('Erreur insertion lead:', err);
          }
        }

        refillResults[userId] = {
          before: activeCount,
          added: deployed,
          after: activeCount + deployed
        };
        totalRefilled += deployed;
      } else {
        refillResults[userId] = {
          before: activeCount,
          added: 0,
          after: activeCount
        };
      }
    }

    log(`🔄 Auto-refill campagne ${campaign_id}: ${totalRefilled} leads ajoutés`);
    return res.json({
      success: true,
      refilled: totalRefilled,
      per_user: refillResults
    });
  } catch (err) {
    error('❌ auto-refill:', err);
    return res.status(500).json({ error: err.message });
  }
});

// =============================
// POST /pipeline-leads/deploy-batch
// Déploie "size" leads par commercial dans la colonne cold_call
// =============================
router.post('/deploy-batch', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    const { campaign_id, size } = req.body;
    const SIZE = Number(size || 50);

    if (!campaign_id) {
      return res.status(400).json({ error: 'campaign_id requis' });
    }

    const { rows: campRows } = await q(
      `SELECT id, tenant_id, type, database_id, assigned_users
       FROM campaigns
       WHERE id = $1 AND tenant_id = $2`,
      [campaign_id, tenantId]
    );
    const campaign = campRows[0];
    if (!campaign) {
      return res.status(404).json({ error: 'Campagne introuvable' });
    }
    if (campaign.type === 'email') {
      return res.status(400).json({ error: 'Cette route est réservée aux campagnes phoning/sms/whatsapp' });
    }

    let assignedUsers = [];
    try {
      assignedUsers = Array.isArray(campaign.assigned_users)
        ? campaign.assigned_users
        : JSON.parse(campaign.assigned_users || '[]');
    } catch { assignedUsers = []; }

    if (!assignedUsers.length) {
      const { rows: userRows } = await q(
        `SELECT DISTINCT l.assigned_to AS uid
           FROM leads l
           JOIN lead_database_relations ldr ON l.id = ldr.lead_id
          WHERE l.tenant_id = $1
            AND ldr.database_id = $2
            AND l.assigned_to IS NOT NULL`,
        [tenantId, campaign.database_id]
      );
      assignedUsers = userRows.map(r => r.uid).filter(Boolean);
    }

    if (!assignedUsers.length) {
      return res.status(400).json({ error: 'Aucun commercial affecté à cette campagne' });
    }

    log(`📦 Déploiement de ${SIZE} leads pour ${assignedUsers.length} commerciaux`);

    let totalDeployed = 0;
    const perUser = {};

    for (const userId of assignedUsers) {
      const { rows: candidates } = await q(
        `SELECT l.id AS lead_id
         FROM leads l
         WHERE l.tenant_id = $1
           AND l.database_id = $2
           AND l.assigned_to = $3
           AND NOT EXISTS (
             SELECT 1 FROM pipeline_leads pl
             WHERE pl.lead_id = l.id AND pl.campaign_id = $4
           )
         ORDER BY COALESCE(l.updated_at, l.created_at) ASC
         LIMIT $5`,
        [tenantId, campaign.database_id, userId, campaign_id, SIZE]
      );

      let deployed = 0;
      for (const row of candidates) {
        try {
          await q(
            `INSERT INTO pipeline_leads 
             (id, tenant_id, lead_id, campaign_id, stage, assigned_user_id, created_at, updated_at)
             VALUES (gen_random_uuid(), $1, $2, $3, 'cold_call', $4, NOW(), NOW())
             ON CONFLICT (lead_id, campaign_id) DO NOTHING`,
            [tenantId, row.lead_id, campaign_id, userId]
          );
          deployed++;
        } catch (err) {
          error('Erreur insertion lead:', err);
        }
      }

      perUser[userId] = deployed;
      totalDeployed += deployed;

      await q(
        `UPDATE campaign_assignments 
         SET leads_assigned = leads_assigned + $1
         WHERE campaign_id = $2 AND user_id = $3`,
        [deployed, campaign_id, userId]
      );
    }

    log(`🧩 Déploiement campagne ${campaign_id}: ${totalDeployed} leads injectés (cold_call)`);
    return res.json({
      success: true,
      deployed: totalDeployed,
      per_user: perUser
    });
  } catch (err) {
    error('❌ deploy-batch:', err);
    return res.status(500).json({ error: err.message });
  }
});

// =============================
// POST /pipeline-leads/:id/qualify
// Qualifier un lead et mettre à jour son stage
// 🆕 AVEC AUTO-REFILL AUTOMATIQUE
// =============================
router.post('/:id/qualify', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    const userId = req.user?.id;
    const { id } = req.params;
    const { qualification, stage, notes, follow_up_date, deal_value, call_duration, next_action, scheduled_date } = req.body;

    if (!qualification && !stage) {
      return res.status(400).json({ error: 'qualification ou stage requis' });
    }

    const stageMapping = {
      'interested': 'qualifie',
      'qualified': 'qualifie',
      'meeting_scheduled': 'tres_qualifie',
      'meeting_requested': 'tres_qualifie',
      'rdv_scheduled': 'tres_qualifie',
      'appointment': 'tres_qualifie',
      'demo_scheduled': 'proposition',
      'demo_requested': 'proposition',
      'callback': 'relancer',
      'follow_up': 'relancer',
      'email_sent': 'relancer',
      'not_interested': 'nrp',
      'disqualified': 'hors_scope',
      'nrp': 'nrp',
      'no_answer': 'nrp',
      'wrong_number': 'nrp',
      'tres_qualifie': 'tres_qualifie',
      'qualifie': 'qualifie',
      'a_relancer': 'relancer',
      'pas_interesse': 'hors_scope',
      // 🆕 Ajout des qualifications manquantes du frontend
      'proposition': 'proposition',
      'gagne': 'gagne',
      'mauvais_contact': 'hors_scope'
    };

    // Priorité au stage envoyé directement, sinon mapping depuis qualification
    const newStage = stage || stageMapping[qualification] || 'cold_call';

    const { rows: currentRows } = await q(
      `SELECT * FROM pipeline_leads WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );

    if (!currentRows.length) {
      return res.status(404).json({ error: 'Lead pipeline non trouvé' });
    }

    const pipelineLead = currentRows[0];
    const oldStage = pipelineLead.stage;
    const campaignId = pipelineLead.campaign_id;
    const assignedUserId = pipelineLead.assigned_user_id;

    let shouldTriggerRefill = false;
    if (oldStage === 'cold_call' && newStage !== 'cold_call') {
      log(`📊 Lead qualifié: ${oldStage} → ${newStage}`);

      // Mettre à jour le compteur de qualifications (optionnel - ne pas bloquer si la table n'existe pas)
      try {
        const { rows: updateRows } = await q(
          `UPDATE campaign_assignments
           SET qualified_since_last_refill = qualified_since_last_refill + 1,
               leads_contacted = leads_contacted + 1
           WHERE campaign_id = $1 AND user_id = $2
           RETURNING qualified_since_last_refill`,
          [campaignId, assignedUserId]
        );

        const qualifiedCount = updateRows[0]?.qualified_since_last_refill || 0;
        log(`🔢 Compteur qualification: ${qualifiedCount}/10`);

        if (qualifiedCount >= 10) {
          shouldTriggerRefill = true;
        }
      } catch (assignmentError) {
        warn(`⚠️ Table campaign_assignments non disponible ou enregistrement manquant:`, assignmentError.message);
        // Continuer sans bloquer la qualification
      }
    }

    const { rows } = await q(
      `UPDATE pipeline_leads 
       SET stage = $1, updated_at = NOW()
       WHERE id = $2 AND tenant_id = $3
       RETURNING *`,
      [newStage, id, tenantId]
    );

    if (pipelineLead.lead_id) {
      await q(
        `UPDATE leads 
         SET pipeline_stage = $1,
             last_call_date = NOW(),
             next_follow_up = $2,
             deal_value = COALESCE($3, deal_value),
             updated_at = NOW()
         WHERE id = $4`,
        [qualification, follow_up_date || scheduled_date, deal_value, pipelineLead.lead_id]
      );
    }

    if (notes && notes.trim()) {
      await q(
        `INSERT INTO lead_call_history 
         (tenant_id, lead_id, pipeline_lead_id, campaign_id, action_type, 
          stage_before, stage_after, qualification, notes, call_duration, 
          next_action, scheduled_date, deal_value, created_by)
         VALUES ($1, $2, $3, $4, 'qualification', $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          tenantId,
          pipelineLead.lead_id,
          pipelineLead.id,
          campaignId,
          oldStage,
          newStage,
          qualification,
          notes.trim(),
          call_duration || null,
          next_action || null,
          scheduled_date || null,
          deal_value || null,
          userId
        ]
      );
    }

    if (scheduled_date || follow_up_date) {
      const followUpDate = scheduled_date || follow_up_date;
      const followUpType = qualification === 'callback' || qualification === 'a_relancer' ? 'call' : 'meeting';
      const followUpTitle = `Rappel: ${qualification}`;
      
      try {
        const { rows: leadRows } = await q(
          'SELECT id FROM leads WHERE id = $1 AND tenant_id = $2',
          [pipelineLead.lead_id, tenantId]
        );
        
        if (leadRows.length > 0) {
          const realLeadId = leadRows[0].id;
          
          await q(
            `INSERT INTO follow_ups 
             (tenant_id, lead_id, user_id, type, priority, title, notes, scheduled_date, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
             ON CONFLICT DO NOTHING`,
            [
              tenantId,
              realLeadId,
              userId,
              followUpType,
              newStage === 'tres_qualifie' ? 'high' : newStage === 'qualifie' ? 'medium' : 'low',
              followUpTitle,
              notes?.trim() || next_action || null,
              followUpDate
            ]
          );
          log(`📅 Follow-up créé pour lead ${realLeadId}`);
        }
      } catch (followUpError) {
        warn('⚠️ Erreur création follow-up:', followUpError.message);
      }
    }

    let refillResult = null;
    if (shouldTriggerRefill && campaignId && assignedUserId) {
      try {
        log(`🚀 Déclenchement auto-refill pour user ${assignedUserId}`);
        refillResult = await smartRefill(campaignId, assignedUserId, tenantId);
      } catch (refillError) {
        warn(`⚠️ Erreur auto-refill (table campaign_assignments non disponible):`, refillError.message);
        // Continuer sans auto-refill
      }
    }

    log(`✅ Lead ${id} qualifié: ${qualification} → ${oldStage} → ${newStage}`);

    return res.json({ 
      success: true, 
      lead: rows[0], 
      oldStage, 
      newStage,
      refill: refillResult
    });

  } catch (error) {
    error('❌ Erreur qualification:', error);
    return res.status(500).json({ error: error.message });
  }
});

// =============================
// POST /pipeline-leads
// Créer un nouveau lead et l'ajouter au pipeline
// =============================
router.post('/', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    const userId = req.user?.id;

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
      stage, // Stage du pipeline (cold_call, clicked, contacted, etc.)
      campaign_id
    } = req.body;

    // Validation
    if (!company_name || !email) {
      return res.status(400).json({ error: 'company_name et email sont requis' });
    }

    if (!stage) {
      return res.status(400).json({ error: 'stage requis pour le pipeline' });
    }

    log(`🆕 Création lead + pipeline: ${company_name} (stage: ${stage})`);

    // 1. Créer le lead dans la table leads
    const { rows: leadRows } = await q(
      `INSERT INTO leads
       (tenant_id, company_name, contact_name, email, phone, city, website,
        industry, deal_value, notes, score, status, assigned_to, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'new', $12, NOW(), NOW())
       RETURNING *`,
      [
        tenantId,
        company_name,
        contact_name || null,
        email,
        phone || null,
        city || null,
        website || null,
        industry || null,
        deal_value || null,
        notes || null,
        score || 50,
        userId // Assigné à l'utilisateur qui crée
      ]
    );

    const newLead = leadRows[0];

    // 2. Ajouter le lead au pipeline
    const { rows: pipelineRows } = await q(
      `INSERT INTO pipeline_leads
       (id, tenant_id, lead_id, campaign_id, stage, assigned_user_id, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING *`,
      [
        tenantId,
        newLead.id,
        campaign_id || null,
        stage,
        userId
      ]
    );

    log(`✅ Lead créé: ${newLead.id}, Pipeline: ${pipelineRows[0].id}`);

    return res.status(201).json({
      success: true,
      lead: newLead,
      pipelineLead: pipelineRows[0]
    });

  } catch (error) {
    error('❌ Erreur POST /pipeline-leads:', error);
    return res.status(500).json({ error: error.message });
  }
});

// =============================
// PATCH /pipeline-leads/:id
// Met à jour un lead (données + stage dans le pipeline)
// =============================
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    const { id } = req.params;
    const {
      stage,
      company_name,
      contact_name,
      email,
      phone,
      city,
      website,
      industry,
      deal_value,
      notes,
      score
    } = req.body;

    // Récupérer le pipeline_lead et son lead_id
    const { rows: beforeRows } = await q(
      `SELECT stage, campaign_id, assigned_user_id, lead_id FROM pipeline_leads
       WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );

    if (!beforeRows.length) {
      return res.status(404).json({ error: 'Lead pipeline non trouvé' });
    }

    const oldStage = beforeRows[0].stage;
    const campaignId = beforeRows[0].campaign_id;
    const assignedUserId = beforeRows[0].assigned_user_id;
    const leadId = beforeRows[0].lead_id;

    // 1. Mettre à jour les données du lead dans la table leads (si fournies)
    if (company_name || email || contact_name || phone || city || website || industry || deal_value !== undefined || notes || score !== undefined) {
      const updateFields = [];
      const updateParams = [];
      let paramIndex = 1;

      if (company_name) {
        updateFields.push(`company_name = $${paramIndex++}`);
        updateParams.push(company_name);
      }
      if (contact_name !== undefined) {
        updateFields.push(`contact_name = $${paramIndex++}`);
        updateParams.push(contact_name);
      }
      if (email) {
        updateFields.push(`email = $${paramIndex++}`);
        updateParams.push(email);
      }
      if (phone !== undefined) {
        updateFields.push(`phone = $${paramIndex++}`);
        updateParams.push(phone);
      }
      if (city !== undefined) {
        updateFields.push(`city = $${paramIndex++}`);
        updateParams.push(city);
      }
      if (website !== undefined) {
        updateFields.push(`website = $${paramIndex++}`);
        updateParams.push(website);
      }
      if (industry !== undefined) {
        updateFields.push(`industry = $${paramIndex++}`);
        updateParams.push(industry);
      }
      if (deal_value !== undefined) {
        updateFields.push(`deal_value = $${paramIndex++}`);
        updateParams.push(deal_value);
      }
      if (notes !== undefined) {
        updateFields.push(`notes = $${paramIndex++}`);
        updateParams.push(notes);
      }
      if (score !== undefined) {
        updateFields.push(`score = $${paramIndex++}`);
        updateParams.push(score);
      }

      if (updateFields.length > 0) {
        updateFields.push(`updated_at = NOW()`);
        updateParams.push(leadId, tenantId);

        await q(
          `UPDATE leads SET ${updateFields.join(', ')}
           WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex++}`,
          updateParams
        );

        log(`✏️ Lead ${leadId} mis à jour`);
      }
    }

    // 2. Mettre à jour le stage si fourni
    let refillResult = null;
    let updatedLead = null;
    if (stage && stage !== oldStage) {
      const { rows } = await q(
        `UPDATE pipeline_leads
         SET stage = $1, updated_at = NOW()
         WHERE id = $2 AND tenant_id = $3
         RETURNING *`,
        [stage, id, tenantId]
      );
      updatedLead = rows[0];

      log(`📦 Lead déplacé: ${oldStage} → ${stage}`);

      // Auto-refill si nécessaire
      if (oldStage === 'cold_call' && stage !== 'cold_call' && campaignId && assignedUserId) {
        log(`🔍 Lead sorti de Cold Call, vérification du pipeline...`);

        const { rows: countRows } = await q(
        `SELECT COUNT(*) as count
         FROM pipeline_leads
         WHERE campaign_id = $1 
           AND assigned_user_id = $2
           AND stage = 'cold_call'`,
        [campaignId, assignedUserId]
      );

      const coldCallCount = parseInt(countRows[0]?.count || 0);
      log(`📊 Leads restants dans Cold Call: ${coldCallCount}/50`);

      if (coldCallCount < 50) {
        const needed = 50 - coldCallCount;
        log(`🚀 Auto-refill déclenché: besoin de ${needed} leads`);
        
        const { rows: campRows } = await q(
          `SELECT database_id FROM campaigns WHERE id = $1`,
          [campaignId]
        );

        if (campRows.length > 0) {
          const databaseId = campRows[0].database_id;

          const { rows: candidates } = await q(
            `SELECT l.id AS lead_id
             FROM leads l
             WHERE l.tenant_id = $1
               AND l.database_id = $2
               AND l.assigned_to = $3
               AND NOT EXISTS (
                 SELECT 1 FROM pipeline_leads pl
                 WHERE pl.lead_id = l.id AND pl.campaign_id = $4
               )
             ORDER BY COALESCE(l.updated_at, l.created_at) ASC
             LIMIT $5`,
            [tenantId, databaseId, assignedUserId, campaignId, needed]
          );

          let deployed = 0;
          for (const row of candidates) {
            try {
              await q(
                `INSERT INTO pipeline_leads 
                 (id, tenant_id, lead_id, campaign_id, stage, assigned_user_id, created_at, updated_at)
                 VALUES (gen_random_uuid(), $1, $2, $3, 'cold_call', $4, NOW(), NOW())
                 ON CONFLICT (lead_id, campaign_id) DO NOTHING`,
                [tenantId, row.lead_id, campaignId, assignedUserId]
              );
              deployed++;
            } catch (err) {
              error('Erreur insertion lead:', err);
            }
          }

          if (deployed > 0) {
            await q(
              `UPDATE campaign_assignments 
               SET leads_assigned = leads_assigned + $1
               WHERE campaign_id = $2 AND user_id = $3`,
              [deployed, campaignId, assignedUserId]
            );
          }

          refillResult = {
            success: true,
            deployed,
            message: `${deployed} nouveaux leads ajoutés automatiquement`
          };

          log(`✅ [AUTO-REFILL] ${deployed} leads ajoutés au pipeline`);
        }
      }
    }
    }

    // Si pas de mise à jour du stage, récupérer le lead actuel
    if (!updatedLead) {
      const { rows: currentRows } = await q(
        `SELECT * FROM pipeline_leads WHERE id = $1 AND tenant_id = $2`,
        [id, tenantId]
      );
      updatedLead = currentRows[0];
    }

    return res.json({
      success: true,
      lead: updatedLead,
      refill: refillResult
    });

  } catch (error) {
    error('❌ Erreur PATCH pipeline-lead:', error);
    return res.status(500).json({ error: error.message });
  }
});

// =============================
// GET /pipeline-leads/:id/history
// Récupère l'historique complet des actions sur un lead
// =============================
router.get('/:id/history', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    const { id } = req.params;

    const { rows: plRows } = await q(
      `SELECT lead_id FROM pipeline_leads WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );

    if (!plRows.length) {
      return res.status(404).json({ error: 'Lead pipeline non trouvé' });
    }

    const leadId = plRows[0].lead_id;

    const { rows } = await q(
      `SELECT 
        lch.*,
        u.first_name,
        u.last_name,
        (u.first_name || ' ' || u.last_name) as author_name
       FROM lead_call_history lch
       LEFT JOIN users u ON lch.created_by = u.id
       WHERE lch.lead_id = $1 AND lch.tenant_id = $2
       ORDER BY lch.created_at DESC`,
      [leadId, tenantId]
    );

    return res.json({ success: true, history: rows });

  } catch (error) {
    error('❌ Erreur GET history:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;