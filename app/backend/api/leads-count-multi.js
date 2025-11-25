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

    console.log('📊 Comptage multi avec filtres:', JSON.stringify(filters));

    // D'abord récupérer les bases de données avec leur segmentation
    const dbIds = filters.map(f => f.database_id).filter(Boolean);
    if (dbIds.length === 0) {
      return res.json({ success: true, count: 0 });
    }

    const placeholders = dbIds.map((_, i) => `$${i + 2}`).join(',');
    const { rows: databases } = await query(
      `SELECT id, segmentation FROM lead_databases WHERE id IN (${placeholders}) AND tenant_id = $1`,
      [tenantId, ...dbIds]
    );

    console.log('📊 Bases trouvées:', databases.length);

    // Créer un map des bases par ID
    const dbMap = {};
    for (const db of databases) {
      dbMap[db.id] = db;
    }

    // Calculer le total en utilisant le JSON segmentation
    let totalFromSegmentation = 0;
    let hasSegmentation = false;

    for (const filter of filters) {
      const db = dbMap[filter.database_id];
      if (!db) continue;

      if (db.segmentation && Object.keys(db.segmentation).length > 0) {
        hasSegmentation = true;

        if (Array.isArray(filter.sectors) && filter.sectors.length > 0) {
          // Compter seulement les secteurs sélectionnés
          for (const sector of filter.sectors) {
            totalFromSegmentation += parseInt(db.segmentation[sector] || 0);
          }
        } else {
          // Compter tous les secteurs de cette base
          for (const count of Object.values(db.segmentation)) {
            totalFromSegmentation += parseInt(count || 0);
          }
        }
      }
    }

    // Si on a des données de segmentation, les utiliser
    if (hasSegmentation && totalFromSegmentation > 0) {
      console.log('✅ Comptage via segmentation:', totalFromSegmentation);
      return res.json({ success: true, count: totalFromSegmentation });
    }

    // Sinon, essayer le comptage via la table leads
    const conditions = [];
    const params = [tenantId];
    let paramIndex = 2;

    for (const filter of filters) {
      if (!filter?.database_id) continue;

      let condition = `(l.database_id = $${paramIndex}`;
      params.push(filter.database_id);
      paramIndex++;

      if (Array.isArray(filter.sectors) && filter.sectors.length > 0) {
        const sectorPlaceholders = filter.sectors.map(() => `$${paramIndex++}`).join(',');
        condition += ` AND l.sector IN (${sectorPlaceholders})`;
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
    const { rows } = await query(sql, params);

    console.log('✅ Comptage via leads table:', rows[0]?.count);

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