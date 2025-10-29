import { authMiddleware } from '../middleware/auth.js';
import { queryAll, execute } from '../lib/db.js';

async function handler(req, res) {
  const tenant_id = req.user.tenant_id;
  const user_id = req.user.id;

  try {
    // GET - Leads d'une campagne spécifique
    if (req.method === 'GET' && req.url.includes('campaign_id=')) {
      const urlParams = new URL(req.url, `http://localhost`).searchParams;
      const campaign_id = urlParams.get('campaign_id');

      if (!campaign_id) {
        return res.status(400).json({ error: 'campaign_id requis' });
      }

      // Récupérer les leads affectés à l'utilisateur pour cette campagne
      const leads = await queryAll(
        `SELECT l.* 
         FROM leads l
         JOIN campaign_assignments ca ON ca.campaign_id = $1
         WHERE l.tenant_id = $2 
         AND l.assigned_to = $3
         ORDER BY l.created_at DESC`,
        [campaign_id, tenant_id, user_id]
      );

      return res.json({
        success: true,
        leads
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
