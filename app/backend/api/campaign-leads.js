import { authMiddleware } from '../middleware/auth.js';
import { queryAll, queryOne, execute } from '../lib/db.js';

async function handler(req, res) {
  const tenant_id = req.user.tenant_id;
  const user_id = req.user.id;
  const userRole = req.user.role;
  const isSuperAdmin = req.user.is_super_admin === true;

  try {
    // GET - Leads d'une campagne spécifique
    if (req.method === 'GET' && req.url.includes('campaign_id=')) {
      const urlParams = new URL(req.url, `http://localhost`).searchParams;
      const campaign_id = urlParams.get('campaign_id');

      if (!campaign_id) {
        return res.status(400).json({ error: 'campaign_id requis' });
      }

      let leads;

      // Admin ou super admin : voir tous les leads de la campagne
      if (isSuperAdmin || userRole === 'admin') {
        leads = await queryAll(
          `SELECT l.*,
                  u.first_name || ' ' || u.last_name as assigned_user_name,
                  pl.stage as pipeline_stage
           FROM leads l
           LEFT JOIN users u ON l.assigned_to = u.id
           LEFT JOIN pipeline_leads pl ON l.id = pl.lead_id AND pl.campaign_id = $1
           WHERE l.tenant_id = $2
             AND (
               l.assigned_to IN (SELECT user_id FROM campaign_assignments WHERE campaign_id = $1)
               OR EXISTS (SELECT 1 FROM pipeline_leads pl2 WHERE pl2.lead_id = l.id AND pl2.campaign_id = $1)
             )
           ORDER BY l.created_at DESC`,
          [campaign_id, tenant_id]
        );
        console.log(`✅ Admin - tous les leads de la campagne: ${leads.length}`);
      }
      // Manager : voir ses leads + ceux de son équipe dans la campagne
      else if (userRole === 'manager') {
        leads = await queryAll(
          `SELECT l.*,
                  u.first_name || ' ' || u.last_name as assigned_user_name,
                  pl.stage as pipeline_stage
           FROM leads l
           LEFT JOIN users u ON l.assigned_to = u.id
           LEFT JOIN pipeline_leads pl ON l.id = pl.lead_id AND pl.campaign_id = $1
           WHERE l.tenant_id = $2
             AND (
               -- Ses propres leads
               l.assigned_to = $3
               -- Ou leads de son équipe
               OR l.assigned_to IN (
                 SELECT tm.user_id FROM team_members tm
                 JOIN teams t ON tm.team_id = t.id
                 WHERE t.manager_id = $3 AND t.tenant_id = $2
               )
               -- Ou leads dans le pipeline de la campagne qu'il peut voir
               OR pl.assigned_user_id = $3
               OR pl.assigned_user_id IN (
                 SELECT tm.user_id FROM team_members tm
                 JOIN teams t ON tm.team_id = t.id
                 WHERE t.manager_id = $3 AND t.tenant_id = $2
               )
             )
             AND (
               l.assigned_to IN (SELECT user_id FROM campaign_assignments WHERE campaign_id = $1)
               OR EXISTS (SELECT 1 FROM pipeline_leads pl2 WHERE pl2.lead_id = l.id AND pl2.campaign_id = $1)
             )
           ORDER BY l.created_at DESC`,
          [campaign_id, tenant_id, user_id]
        );
        console.log(`✅ Manager - leads campagne (équipe): ${leads.length}`);
      }
      // Commercial : uniquement ses leads
      else {
        leads = await queryAll(
          `SELECT l.*,
                  u.first_name || ' ' || u.last_name as assigned_user_name,
                  pl.stage as pipeline_stage
           FROM leads l
           LEFT JOIN users u ON l.assigned_to = u.id
           LEFT JOIN pipeline_leads pl ON l.id = pl.lead_id AND pl.campaign_id = $1
           WHERE l.tenant_id = $2
             AND l.assigned_to = $3
             AND (
               l.assigned_to IN (SELECT user_id FROM campaign_assignments WHERE campaign_id = $1)
               OR EXISTS (SELECT 1 FROM pipeline_leads pl2 WHERE pl2.lead_id = l.id AND pl2.campaign_id = $1)
             )
           ORDER BY l.created_at DESC`,
          [campaign_id, tenant_id, user_id]
        );
        console.log(`✅ Commercial - ses leads uniquement: ${leads.length}`);
      }

      return res.json({
        success: true,
        leads
      });
    }

    // POST - Transférer des leads à un autre commercial
    if (req.method === 'POST' && req.url.includes('/transfer')) {
      const { lead_ids, target_user_id, campaign_id, transfer_all } = req.body;

      if (!target_user_id) {
        return res.status(400).json({ error: 'target_user_id requis' });
      }

      // Vérifier que l'utilisateur cible existe et fait partie du tenant
      const targetUser = await queryOne(
        'SELECT id, first_name, last_name, role FROM users WHERE id = $1 AND tenant_id = $2',
        [target_user_id, tenant_id]
      );

      if (!targetUser) {
        return res.status(404).json({ error: 'Utilisateur cible non trouvé' });
      }

      // Vérifier les permissions : admin ou manager de l'équipe
      if (userRole !== 'admin' && !isSuperAdmin) {
        // Manager : peut transférer uniquement les leads de son équipe
        if (userRole === 'manager') {
          const isTargetInTeam = await queryOne(
            `SELECT 1 FROM team_members tm
             JOIN teams t ON tm.team_id = t.id
             WHERE tm.user_id = $1 AND t.manager_id = $2`,
            [target_user_id, user_id]
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

      // Transférer tous les leads d'un commercial
      if (transfer_all && campaign_id) {
        const sourceUserId = req.body.source_user_id || user_id;

        leadsToTransfer = await queryAll(
          `SELECT l.id FROM leads l
           LEFT JOIN pipeline_leads pl ON l.id = pl.lead_id AND pl.campaign_id = $1
           WHERE l.tenant_id = $2
             AND (l.assigned_to = $3 OR pl.assigned_user_id = $3)`,
          [campaign_id, tenant_id, sourceUserId]
        );
      }
      // Transférer des leads spécifiques
      else if (lead_ids && lead_ids.length > 0) {
        leadsToTransfer = lead_ids.map(id => ({ id }));
      } else {
        return res.status(400).json({ error: 'lead_ids ou transfer_all requis' });
      }

      if (leadsToTransfer.length === 0) {
        return res.status(400).json({ error: 'Aucun lead à transférer' });
      }

      console.log(`🔄 Transfert de ${leadsToTransfer.length} leads vers ${targetUser.first_name} ${targetUser.last_name}`);

      // Effectuer le transfert
      let transferredCount = 0;
      for (const lead of leadsToTransfer) {
        try {
          // Mettre à jour le lead
          await execute(
            `UPDATE leads SET assigned_to = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3`,
            [target_user_id, lead.id, tenant_id]
          );

          // Mettre à jour le pipeline si campaign_id fourni
          if (campaign_id) {
            await execute(
              `UPDATE pipeline_leads
               SET assigned_user_id = $1, updated_at = NOW()
               WHERE lead_id = $2 AND campaign_id = $3 AND tenant_id = $4`,
              [target_user_id, lead.id, campaign_id, tenant_id]
            );
          }

          transferredCount++;
        } catch (err) {
          console.error(`Erreur transfert lead ${lead.id}:`, err.message);
        }
      }

      console.log(`✅ ${transferredCount} leads transférés avec succès`);

      return res.json({
        success: true,
        message: `${transferredCount} lead(s) transféré(s) à ${targetUser.first_name} ${targetUser.last_name}`,
        transferred_count: transferredCount,
        target_user: {
          id: targetUser.id,
          name: `${targetUser.first_name} ${targetUser.last_name}`
        }
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Campaign leads error:', error);
    return res.status(500).json({
      error: 'Server error',
      details: error.message
    });
  }
}

export default authMiddleware(handler);
