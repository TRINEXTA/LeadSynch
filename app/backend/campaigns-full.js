import { authMiddleware } from '../middleware/auth.js';
import { queryAll, execute } from '../lib/db.js';

async function handler(req, res) {
  const tenant_id = req.user.tenant_id;
  const user_id = req.user.id;

  try {
    // GET - Liste des campagnes avec stats
    if (req.method === 'GET' && !req.url.includes('/api/campaigns/')) {
      const campaigns = await queryAll(
        `SELECT 
          c.*,
          COUNT(DISTINCT ca.user_id) as assigned_users_count,
          COALESCE(SUM(ca.leads_assigned), 0) as total_leads_assigned,
          COALESCE(SUM(ca.calls_made), 0) as total_calls_made,
          COALESCE(SUM(ca.meetings_scheduled), 0) as total_meetings
        FROM campaigns c
        LEFT JOIN campaign_assignments ca ON c.id = ca.campaign_id
        WHERE c.tenant_id = $1
        GROUP BY c.id
        ORDER BY c.created_at DESC`,
        [tenant_id]
      );

      return res.json({
        success: true,
        campaigns
      });
    }

    // POST - Créer une campagne
    if (req.method === 'POST') {
      const { 
        name, 
        description, 
        campaign_type = 'phone',
        track_clicks = false,
        assigned_users = [],
        database_id 
      } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Nom requis' });
      }

      // Créer la campagne
      const campaign = await execute(
        `INSERT INTO campaigns 
        (tenant_id, name, description, campaign_type, track_clicks, assigned_users, status)
        VALUES ($1, $2, $3, $4, $5, $6, 'active')
        RETURNING *`,
        [tenant_id, name, description, campaign_type, track_clicks, JSON.stringify(assigned_users)]
      );

      // Affecter les commerciaux
      if (assigned_users.length > 0) {
        for (const userId of assigned_users) {
          await execute(
            `INSERT INTO campaign_assignments (campaign_id, user_id, tenant_id)
             VALUES ($1, $2, $3)`,
            [campaign.id, userId, tenant_id]
          );
        }
      }

      // Si database_id fourni, affecter les leads
      if (database_id) {
        const leads = await queryAll(
          'SELECT id FROM leads WHERE database_id = $1 AND tenant_id = $2',
          [database_id, tenant_id]
        );

        // Distribution équitable
        const leadsPerUser = Math.floor(leads.length / assigned_users.length);
        let leadIndex = 0;

        for (let i = 0; i < assigned_users.length; i++) {
          const userId = assigned_users[i];
          const leadsToAssign = i === assigned_users.length - 1 
            ? leads.slice(leadIndex) // Dernier utilisateur prend le reste
            : leads.slice(leadIndex, leadIndex + leadsPerUser);

          for (const lead of leadsToAssign) {
            await execute(
              'UPDATE leads SET assigned_to = $1 WHERE id = $2',
              [userId, lead.id]
            );
          }

          await execute(
            `UPDATE campaign_assignments 
             SET leads_assigned = $1 
             WHERE campaign_id = $2 AND user_id = $3`,
            [leadsToAssign.length, campaign.id, userId]
          );

          leadIndex += leadsPerUser;
        }

        console.log(`✅ ${leads.length} leads distribués à ${assigned_users.length} commerciaux`);
      }

      return res.json({
        success: true,
        campaign
      });
    }

    // PATCH - Modifier une campagne (ajouter/retirer commercial)
    if (req.method === 'PATCH') {
      const urlParts = req.url.split('/');
      const campaignId = urlParts[urlParts.length - 1];
      const { action, user_id: targetUserId } = req.body;

      if (action === 'add_user') {
        // Ajouter un commercial
        await execute(
          `INSERT INTO campaign_assignments (campaign_id, user_id, tenant_id)
           VALUES ($1, $2, $3)
           ON CONFLICT (campaign_id, user_id) DO NOTHING`,
          [campaignId, targetUserId, tenant_id]
        );

        return res.json({ success: true, message: 'Commercial ajouté' });
      }

      if (action === 'remove_user') {
        // Retirer un commercial et redistribuer ses leads
        const userLeads = await queryAll(
          `SELECT id FROM leads 
           WHERE assigned_to = $1 
           AND id IN (
             SELECT l.id FROM leads l
             JOIN campaign_assignments ca ON l.assigned_to = ca.user_id
             WHERE ca.campaign_id = $2
           )`,
          [targetUserId, campaignId]
        );

        if (userLeads.length > 0) {
          // Récupérer les autres commerciaux
          const otherUsers = await queryAll(
            `SELECT user_id FROM campaign_assignments 
             WHERE campaign_id = $1 AND user_id != $2`,
            [campaignId, targetUserId]
          );

          if (otherUsers.length > 0) {
            // Redistribuer
            const leadsPerUser = Math.ceil(userLeads.length / otherUsers.length);
            let leadIndex = 0;

            for (const other of otherUsers) {
              const leadsToReassign = userLeads.slice(leadIndex, leadIndex + leadsPerUser);
              
              for (const lead of leadsToReassign) {
                await execute(
                  'UPDATE leads SET assigned_to = $1 WHERE id = $2',
                  [other.user_id, lead.id]
                );
              }

              await execute(
                `UPDATE campaign_assignments 
                 SET leads_assigned = leads_assigned + $1 
                 WHERE campaign_id = $2 AND user_id = $3`,
                [leadsToReassign.length, campaignId, other.user_id]
              );

              leadIndex += leadsPerUser;
            }
          }
        }

        // Supprimer l'affectation
        await execute(
          'DELETE FROM campaign_assignments WHERE campaign_id = $1 AND user_id = $2',
          [campaignId, targetUserId]
        );

        return res.json({ success: true, message: 'Commercial retiré et leads redistribués' });
      }

      if (action === 'transfer_leads') {
        const { from_user, to_user } = req.body;

        // Transférer les leads
        await execute(
          `UPDATE leads 
           SET assigned_to = $1 
           WHERE assigned_to = $2 
           AND id IN (
             SELECT l.id FROM leads l
             JOIN campaign_assignments ca ON l.assigned_to = ca.user_id
             WHERE ca.campaign_id = $3
           )`,
          [to_user, from_user, campaignId]
        );

        // Mettre à jour les compteurs
        const transferredCount = await queryAll(
          'SELECT COUNT(*) as count FROM leads WHERE assigned_to = $1',
          [to_user]
        );

        await execute(
          `UPDATE campaign_assignments 
           SET leads_assigned = 0 
           WHERE campaign_id = $1 AND user_id = $2`,
          [campaignId, from_user]
        );

        await execute(
          `UPDATE campaign_assignments 
           SET leads_assigned = $1 
           WHERE campaign_id = $2 AND user_id = $3`,
          [transferredCount[0].count, campaignId, to_user]
        );

        return res.json({ success: true, message: 'Leads transférés' });
      }

      return res.status(400).json({ error: 'Action non reconnue' });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Campaigns error:', error);
    return res.status(500).json({ 
      error: 'Server error',
      details: error.message 
    });
  }
}

export default authMiddleware(handler);
