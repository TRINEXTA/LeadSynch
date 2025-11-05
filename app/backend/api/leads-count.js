import { authMiddleware } from '../middleware/auth.js';
import { queryOne } from '../lib/db.js';

async function handler(req, res) {
  const tenant_id = req.user.tenant_id;

  try {
    if (req.method === 'GET') {
      const urlParams = new URL(req.url, 'http://localhost').searchParams;
      const database_id = urlParams.get('database_id');
      const sector = urlParams.get('sector');

      if (!database_id) {
        return res.status(400).json({ error: 'database_id requis' });
      }

      let query = 'SELECT COUNT(*) as count FROM leads WHERE tenant_id = $1 AND database_id = $2';
      const params = [tenant_id, database_id];

      if (sector) {
        query += ' AND sector = $3';
        params.push(sector);
      }

      const result = await queryOne(query, params);

      return res.status(200).json({
        success: true,
        count: parseInt(result.count) || 0
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Leads count error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}

export default authMiddleware(handler);
