import { authMiddleware } from '../middleware/auth.js';
import { queryAll, execute } from '../lib/db.js';

async function handler(req, res) {
  const tenant_id = req.user.tenant_id;

  try {
    if (req.method === 'GET') {
      const campaigns = await queryAll(
        'SELECT * FROM campaigns WHERE tenant_id = $1 ORDER BY created_at DESC',
        [tenant_id]
      );
      return res.status(200).json({ success: true, campaigns: campaigns || [] });
    }

    if (req.method === 'POST') {
      const { name, type, description, start_date, end_date } = req.body;
      if (!name) {
        return res.status(400).json({ error: 'Le nom est requis' });
      }
      const campaign = await execute(
        `INSERT INTO campaigns (tenant_id, name, type, description, start_date, end_date, created_by, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft') RETURNING *`,
        [tenant_id, name, type || 'email', description, start_date, end_date, req.user.id]
      );
      return res.status(201).json({ success: true, campaign });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Campaigns error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}

export default authMiddleware(handler);
