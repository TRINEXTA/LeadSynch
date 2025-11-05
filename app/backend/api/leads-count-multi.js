import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { query } from '../lib/db.js';

const router = Router();
router.use(authMiddleware);

router.post('/count-multi', async (req, res) => {
  try {
    const { filters } = req.body; // [{ database_id, sectors: [...] }, ...]
    const tenantId = req.user.tenant_id;
    
    if (!filters || filters.length === 0) {
      return res.json({ success: true, count: 0 });
    }

    let conditions = [];
    let params = [tenantId];
    let paramIndex = 2;

    for (const filter of filters) {
      if (!filter.database_id) continue;
      
      let condition = `(database_id = $${paramIndex}`;
      params.push(filter.database_id);
      paramIndex++;
      
      if (filter.sectors && filter.sectors.length > 0) {
        condition += ` AND sector IN (${filter.sectors.map((s, i) => {
          params.push(s);
          return `$${paramIndex++}`;
        }).join(',')})`;
      }
      
      condition += ')';
      conditions.push(condition);
    }

    const whereClause = conditions.length > 0 
      ? `tenant_id = $1 AND (${conditions.join(' OR ')})`
      : `tenant_id = $1`;

    const sql = `SELECT COUNT(*) as count FROM leads WHERE ${whereClause}`;
    const { rows } = await query(sql, params);
    
    return res.json({ 
      success: true, 
      count: parseInt(rows[0].count) || 0 
    });
    
  } catch (err) {
    console.error('Erreur count multi:', err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
