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

    console.log(`🔄 Injection manuelle pipeline pour campagne: ${campaignId}`);

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

    // Récupérer les leads
    const leads = await queryAll(
      `SELECT DISTINCT l.*
       FROM leads l
       JOIN lead_database_relations ldr ON l.id = ldr.lead_id
       WHERE l.tenant_id = $1 AND ldr.database_id = $2`,
      [tenantId, camp.database_id]
    );

    if (leads.length === 0) {
      return res.status(400).json({ error: 'Aucun lead trouvé dans cette base de données' });
    }

    console.log(`📊 ${leads.length} leads trouvés, injection dans pipeline...`);

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
      console.log(`✅ ${injected} leads injectés dans le pipeline`);

      return res.json({
        success: true,
        message: `${injected} leads injectés dans le pipeline`,
        injected,
        total_leads: leads.length
      });

    } catch (e) {
      await execute('ROLLBACK');
      console.error('❌ Erreur injection:', e);
      throw e;
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
    return res.status(500).json({ error: error.message });
  }
}
