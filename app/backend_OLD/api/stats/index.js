import { authMiddleware } from '../../middleware/auth.js';
import { queryAll, queryOne } from '../../lib/db.js';

async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const tenant_id = req.user.tenant_id;

    // Total des leads
    const totalLeads = await queryOne(
      'SELECT COUNT(*) as count FROM leads WHERE tenant_id = $1',
      [tenant_id]
    );

    // Leads par statut
    const byStatus = await queryAll(
      `SELECT status, COUNT(*) as count 
       FROM leads 
       WHERE tenant_id = $1 
       GROUP BY status`,
      [tenant_id]
    );

    // Nouveaux leads cette semaine
    const thisWeek = await queryOne(
      `SELECT COUNT(*) as count FROM leads 
       WHERE tenant_id = $1 
       AND created_at >= NOW() - INTERVAL '7 days'`,
      [tenant_id]
    );

    // Score moyen
    const avgScore = await queryOne(
      'SELECT AVG(score) as avg FROM leads WHERE tenant_id = $1',
      [tenant_id]
    );

    return res.status(200).json({
      success: true,
      stats: {
        total: parseInt(totalLeads?.count || 0),
        byStatus: byStatus || [],
        newThisWeek: parseInt(thisWeek?.count || 0),
        averageScore: Math.round(avgScore?.avg || 0)
      }
    });

  } catch (error) {
    console.error('Stats error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}

export default authMiddleware(handler);