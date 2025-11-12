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

    // On construit un OR de blocs (par base), avec jointure sur lead_databases
    // pour garantir que la base appartient bien au tenant
    const conditions = [];
    const params = [tenantId];
    let paramIndex = 2;

    for (const filter of filters) {
      if (!filter?.database_id) continue;

      let condition = `(l.database_id = $${paramIndex}`;
      params.push(filter.database_id);
      paramIndex++;

      if (Array.isArray(filter.sectors) && filter.sectors.length > 0) {
        const placeholders = filter.sectors.map(() => `$${paramIndex++}`).join(',');
        condition += ` AND l.sector IN (${placeholders})`;
        params.push(...filter.sectors);
      }
      
      condition += ')';
      conditions.push(condition);
    }

    if (conditions.length === 0) {
      return res.json({ success: true, count: 0 });
    }

    const whereOr = conditions.join(' OR ');

    const sql = `
      SELECT COUNT(*)::int AS count
      FROM leads l
      JOIN lead_databases d ON d.id = l.database_id
      WHERE d.tenant_id = $1
        AND (${whereOr})
    `;

    console.log('🔍 SQL:', sql);
    console.log('🔍 PARAMS:', params);

    const { rows } = await query(sql, params);
    
    console.log('🔍 RÉSULTAT:', rows[0]);

    return res.json({ 
      success: true, 
      count: rows[0]?.count ?? 0 
    });
  } catch (err) {
    console.error('❌ Erreur count multi:', err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;