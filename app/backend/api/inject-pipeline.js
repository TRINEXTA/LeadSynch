import { log, error, warn } from "../lib/logger.js";
import { authMiddleware } from '../middleware/auth.js';
import { queryAll, execute } from '../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authResult = await authMiddleware(req, res, () => {});
    if (!authResult) return; // Déjà géré par authMiddleware

    const { campaignId } = req.body;
    const tenantId = req.user?.tenant_id;

    if (!campaignId) {
      return res.status(400).json({ error: 'campaignId requis' });
    }

    log(`🔄 Injection manuelle pipeline pour campagne: ${campaignId}`);

    // Récupérer la campagne
    const campaign = await queryAll(
      'SELECT * FROM campaigns WHERE id = $1 AND tenant_id = $2',
      [campaignId, tenantId]
    );

    if (campaign.length === 0) {
      return res.status(404).json({ error: 'Campagne non trouvée' });
    }

    const camp = campaign[0];
    const assignedUsers = camp.assigned_users || [];

    if (assignedUsers.length === 0) {
      return res.status(400).json({ error: 'Aucun commercial assigné à cette campagne' });
    }

    // 🔧 FIX: Récupérer les leads en RESPECTANT le filtre de secteurs de la campagne
    let leads = [];

    // Parser le champ sectors de la campagne (JSON)
    const campaignSectors = camp.sector ? (typeof camp.sector === 'string' ? JSON.parse(camp.sector) : camp.sector) : null;

    if (campaignSectors && Object.keys(campaignSectors).length > 0) {
      // ✅ Appliquer le filtre de secteurs
      log(`🎯 Application du filtre de secteurs:`, campaignSectors);

      const sectorConditions = [];
      const params = [tenantId, camp.database_id];
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
      // ✅ Pas de filtre de secteurs : récupérer tous les leads
      log(`📋 Récupération de tous les leads (pas de filtre secteurs)`);
      leads = await queryAll(
        `SELECT DISTINCT l.*
         FROM leads l
         JOIN lead_database_relations ldr ON l.id = ldr.lead_id
         WHERE l.tenant_id = $1 AND ldr.database_id = $2`,
        [tenantId, camp.database_id]
      );
    }

    if (leads.length === 0) {
      return res.status(400).json({ error: 'Aucun lead trouvé avec le filtre appliqué' });
    }

    log(`📊 ${leads.length} leads trouvés avec filtre, injection dans pipeline...`);

    await execute('BEGIN');

    try {
      let injected = 0;
      for (let i = 0; i < leads.length; i++) {
        const lead = leads[i];
        const assignedUserId = assignedUsers[i % assignedUsers.length];

        await execute(
          `UPDATE leads SET assigned_to = $1, updated_at = NOW()
           WHERE id = $2 AND tenant_id = $3`,
          [assignedUserId, lead.id, tenantId]
        );

        await execute(
          `INSERT INTO pipeline_leads (id, tenant_id, lead_id, campaign_id, stage, assigned_user_id, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, $3, 'cold_call', $4, NOW(), NOW())
           ON CONFLICT (lead_id, campaign_id)
           DO UPDATE SET assigned_user_id = EXCLUDED.assigned_user_id, stage = EXCLUDED.stage, updated_at = NOW()`,
          [tenantId, lead.id, campaignId, assignedUserId]
        );

        injected++;
      }

      await execute('COMMIT');
      log(`✅ ${injected} leads injectés dans le pipeline`);

      return res.json({
        success: true,
        message: `${injected} leads injectés dans le pipeline`,
        injected,
        total_leads: leads.length
      });

    } catch (e) {
      await execute('ROLLBACK');
      error('❌ Erreur injection:', e);
      throw e;
    }

  } catch (error) {
    error('❌ Erreur:', error);
    return res.status(500).json({ error: error.message });
  }
}
