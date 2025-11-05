import express from 'express';
import authenticateToken from '../middleware/auth.js';
import db from '../config/db.js';

const router = express.Router();

const q = (text, params=[]) => db.query(text, params);

// =============================
// GET /pipeline-leads
// Récupère tous les leads du pipeline pour l'utilisateur connecté
// =============================
router.get('/', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    let query = `
      SELECT 
        pl.*,
        l.company_name,
        l.contact_name,
        l.email,
        l.phone,
        l.city,
        l.sector,
        l.status as lead_status,
        c.name as campaign_name,
        c.type as campaign_type
      FROM pipeline_leads pl
      JOIN leads l ON l.id = pl.lead_id
      LEFT JOIN campaigns c ON c.id = pl.campaign_id
      WHERE pl.tenant_id = $1
    `;

    const params = [tenantId];

    // Si pas admin, filtrer par commercial assigné
    if (userRole !== 'admin') {
      query += ` AND (pl.assigned_user_id = $2 OR l.assigned_to = $2)`;
      params.push(userId);
    }

    query += ` ORDER BY pl.updated_at DESC`;

    const { rows } = await q(query, params);

    console.log(`Pipeline leads: ${rows.length} pour user:${userId} role:${userRole}`);

    return res.json({ success: true, leads: rows });

  } catch (error) {
    console.error('❌ Erreur GET pipeline-leads:', error);
    return res.status(500).json({ error: error.message });
  }
});

// =============================
// POST /pipeline-leads/deploy-batch
// body: { campaign_id: uuid, size?: number }
// Déploie "size" leads par commercial dans la colonne cold_call
// =============================
router.post('/deploy-batch', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    const { campaign_id, size } = req.body;
    const SIZE = Number(size || 20);

    if (!campaign_id) {
      return res.status(400).json({ error: 'campaign_id requis' });
    }

    // 0) Campagne
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

    // 1) Liste des commerciaux
    let assignedUsers = [];
    try {
      assignedUsers = Array.isArray(campaign.assigned_users)
        ? campaign.assigned_users
        : JSON.parse(campaign.assigned_users || '[]');
    } catch { assignedUsers = []; }

    if (!assignedUsers.length) {
      // Fallback: commerciaux trouvés via leads déjà assignés sur la base de la campagne
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

    // 2) Candidats "en attente" (non encore dans pipeline pour cette campagne), par commercial
    //    -> on prend jusqu'à SIZE par commercial, de façon équitable
    const { rows: candidates } = await q(
      `
      WITH waiting AS (
        SELECT
          l.id AS lead_id,
          l.assigned_to,
          ROW_NUMBER() OVER (
            PARTITION BY l.assigned_to
            ORDER BY COALESCE(l.updated_at, l.created_at) ASC, l.id
          ) AS rn
        FROM leads l
        JOIN lead_database_relations ldr ON l.id = ldr.lead_id
        WHERE l.tenant_id = $1
          AND ldr.database_id = $2
          AND l.assigned_to = ANY($3::uuid[])
          AND NOT EXISTS (
            SELECT 1
            FROM pipeline_leads pl
            WHERE pl.lead_id = l.id
              AND pl.campaign_id = $4
          )
      )
      SELECT lead_id, assigned_to
      FROM waiting
      WHERE rn <= $5
      ORDER BY assigned_to, rn
      `,
      [tenantId, campaign.database_id, assignedUsers, campaign_id, SIZE]
    );

    if (!candidates.length) {
      return res.json({
        success: true,
        message: 'Aucun lead à déployer (tous les leads affectés sont déjà dans le pipeline)',
        deployed: 0,
        per_user: {}
      });
    }

    // 3) Transaction d'insertion / upsert
    await q('BEGIN');

    // résumé par commercial
    const perUser = new Map(assignedUsers.map(u => [u, 0]));
    let deployed = 0;

    try {
      for (const row of candidates) {
        const userId = row.assigned_to;
        // upsert : remet le stage à cold_call et inscrit le commercial
        const resIns = await q(
          `INSERT INTO pipeline_leads (id, tenant_id, lead_id, campaign_id, stage, assigned_user_id, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, $3, 'cold_call', $4, NOW(), NOW())
           ON CONFLICT (lead_id, campaign_id)
           DO UPDATE SET
             stage = EXCLUDED.stage,
             assigned_user_id = EXCLUDED.assigned_user_id,
             updated_at = NOW()`,
          [tenantId, row.lead_id, campaign_id, userId]
        );

        if (resIns.rowCount > 0) {
          perUser.set(userId, (perUser.get(userId) || 0) + 1);
          deployed++;
        }
      }

      await q('COMMIT');
    } catch (err) {
      await q('ROLLBACK');
      throw err;
    }

    // 4) Réponse
    const per_user = {};
    for (const [k, v] of perUser.entries()) per_user[k] = v;

    console.log(`🧩 Déploiement campagne ${campaign_id}: ${deployed} leads injectés (cold_call)`);
    return res.json({
      success: true,
      deployed,
      per_user
    });
  } catch (err) {
    try { await q('ROLLBACK'); } catch {}
    console.error('❌ deploy-batch:', err);
    return res.status(500).json({ error: err.message });
  }
});

// =============================
// POST /pipeline-leads/:id/qualify
// Qualifier un lead et mettre à jour son stage
// =============================
router.post('/:id/qualify', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    const { id } = req.params;
    const { qualification, notes, follow_up_date, deal_value } = req.body;

    if (!qualification) {
      return res.status(400).json({ error: 'qualification requise' });
    }

    // Mapper la qualification vers le bon stage
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
      'wrong_number': 'nrp'
    };

    const newStage = stageMapping[qualification] || 'cold_call';

    // Mettre à jour le stage dans pipeline_leads
    const { rows } = await q(
      `UPDATE pipeline_leads 
       SET stage = $1, updated_at = NOW()
       WHERE id = $2 AND tenant_id = $3
       RETURNING *`,
      [newStage, id, tenantId]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Lead pipeline non trouvé' });
    }

    const pipelineLead = rows[0];

    // Mettre à jour aussi le lead dans la table leads
    if (pipelineLead.lead_id) {
      // Construire la requête dynamiquement selon si notes est présent
      let updateQuery = `UPDATE leads 
         SET pipeline_stage = $1,
             last_call_date = NOW(),
             next_follow_up = $2,
             deal_value = COALESCE($3, deal_value),
             updated_at = NOW()`;
      
      let params = [qualification, follow_up_date, deal_value];
      
      if (notes) {
        updateQuery += `, notes = COALESCE(notes || E'\\n\\n', '') || $4`;
        params.push(notes);
      }
      
      updateQuery += ` WHERE id = $${params.length + 1}`;
      params.push(pipelineLead.lead_id);
      
      await q(updateQuery, params);
    }

    console.log(`✅ Lead ${id} qualifié: ${qualification} → stage: ${newStage}`);

    return res.json({ success: true, lead: pipelineLead, newStage });

  } catch (error) {
    console.error('❌ Erreur qualification:', error);
    return res.status(500).json({ error: error.message });
  }
});

// =============================
// PATCH /pipeline-leads/:id
// Met à jour le stage d'un lead dans le pipeline
// =============================
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    const { id } = req.params;
    const { stage } = req.body;

    if (!stage) {
      return res.status(400).json({ error: 'stage requis' });
    }

    const { rows } = await q(
      `UPDATE pipeline_leads 
       SET stage = $1, updated_at = NOW()
       WHERE id = $2 AND tenant_id = $3
       RETURNING *`,
      [stage, id, tenantId]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Lead pipeline non trouvé' });
    }

    return res.json({ success: true, lead: rows[0] });

  } catch (error) {
    console.error('❌ Erreur PATCH pipeline-lead:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;