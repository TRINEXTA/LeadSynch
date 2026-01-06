import { log, error, warn } from "../lib/logger.js";
﻿import express from 'express';
import { authMiddleware as authenticateToken } from '../middleware/auth.js';
import db from '../config/db.js';

const router = express.Router();
const q = (text, params=[]) => db.query(text, params);

log('🔥 FICHIER lead-databases.js CHARGÉ');

// GET /lead-databases/stats - Statistiques globales (super admin)
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const isSuperAdmin = req.user?.is_super_admin;
    const tenantId = req.user?.tenant_id;

    let statsQuery, statsParams;

    if (isSuperAdmin) {
      // Super admin: stats sur TOUS les tenants
      statsQuery = `
        SELECT
          (SELECT COUNT(*) FROM lead_databases) as total_databases,
          (SELECT COUNT(*) FROM leads) as total_leads,
          (SELECT COUNT(DISTINCT tenant_id) FROM lead_databases) as total_tenants,
          (SELECT COUNT(*) FROM lead_databases WHERE created_at > NOW() - INTERVAL '7 days') as this_week,
          (SELECT COUNT(*) FROM lead_databases WHERE created_at > NOW() - INTERVAL '30 days') as this_month
      `;
      statsParams = [];
    } else {
      // Admin normal: stats sur son tenant uniquement
      statsQuery = `
        SELECT
          (SELECT COUNT(*) FROM lead_databases WHERE tenant_id = $1) as total_databases,
          (SELECT COUNT(*) FROM leads WHERE tenant_id = $1) as total_leads,
          1 as total_tenants,
          (SELECT COUNT(*) FROM lead_databases WHERE tenant_id = $1 AND created_at > NOW() - INTERVAL '7 days') as this_week,
          (SELECT COUNT(*) FROM lead_databases WHERE tenant_id = $1 AND created_at > NOW() - INTERVAL '30 days') as this_month
      `;
      statsParams = [tenantId];
    }

    const { rows } = await q(statsQuery, statsParams);

    // Stats par source
    let sourceQuery, sourceParams;
    if (isSuperAdmin) {
      sourceQuery = `SELECT source, COUNT(*) as count FROM lead_databases GROUP BY source ORDER BY count DESC`;
      sourceParams = [];
    } else {
      sourceQuery = `SELECT source, COUNT(*) as count FROM lead_databases WHERE tenant_id = $1 GROUP BY source ORDER BY count DESC`;
      sourceParams = [tenantId];
    }
    const { rows: bySource } = await q(sourceQuery, sourceParams);

    return res.json({
      success: true,
      stats: {
        ...rows[0],
        by_source: bySource
      }
    });
  } catch (err) {
    error('❌ Erreur GET stats:', err);
    return res.status(500).json({ error: err.message });
  }
});

// GET /lead-databases - Liste toutes les bases (AVEC PAGINATION)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    const isSuperAdmin = req.user?.is_super_admin;
    const userRole = req.user?.role;
    const userPermissions = req.user?.permissions || {};
    const canViewDatabases = userPermissions.view_databases === true;

    // Admin, supervisor avec permission, ou super admin peuvent voir les databases
    const hasFullAccess = isSuperAdmin || userRole === 'admin' || canViewDatabases;

    log(`📋 GET lead-databases - User: ${req.user?.email}, Role: ${userRole}, viewDatabases: ${canViewDatabases}`);

    // Paramètres de pagination et filtres
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const source = req.query.source || '';
    const filterTenantId = req.query.tenant_id || ''; // Pour super admin

    // Construire la requête dynamiquement
    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    // Filtre tenant (super admin peut voir tous, sinon filtre par tenant)
    if (isSuperAdmin && filterTenantId) {
      whereConditions.push(`ld.tenant_id = $${paramIndex++}`);
      params.push(filterTenantId);
    } else if (!isSuperAdmin) {
      whereConditions.push(`ld.tenant_id = $${paramIndex++}`);
      params.push(tenantId);
    }

    // Filtre recherche
    if (search) {
      whereConditions.push(`(ld.name ILIKE $${paramIndex} OR ld.description ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Filtre source
    if (source && source !== 'all') {
      whereConditions.push(`ld.source = $${paramIndex++}`);
      params.push(source);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Compter le total (pour pagination)
    const countQuery = `SELECT COUNT(*) as total FROM lead_databases ld ${whereClause}`;
    const { rows: countRows } = await q(countQuery, params);
    const total = parseInt(countRows[0].total);

    // Requête principale avec pagination
    const dataQuery = `
      SELECT
        ld.*,
        ${isSuperAdmin ? 't.name as tenant_name,' : ''}
        (
          SELECT COUNT(DISTINCT lead_id) FROM (
            SELECT id as lead_id FROM leads WHERE database_id = ld.id
            UNION
            SELECT lead_id FROM lead_database_relations WHERE database_id = ld.id
          ) combined
        ) as lead_count
       FROM lead_databases ld
       ${isSuperAdmin ? 'LEFT JOIN tenants t ON ld.tenant_id = t.id' : ''}
       ${whereClause}
       ORDER BY ld.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const { rows } = await q(dataQuery, [...params, limit, offset]);

    return res.json({
      success: true,
      databases: rows,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
        has_next: page * limit < total,
        has_prev: page > 1
      }
    });
  } catch (err) {
    error('❌ Erreur GET lead-databases:', err);
    return res.status(500).json({ error: err.message });
  }
});

// GET /lead-databases/:id - Détails d'une base AVEC ses leads
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    const { id } = req.params;

    // 1. Récupérer les infos de la base
    const { rows: dbRows } = await q(
      `SELECT
        ld.*,
        (
          SELECT COUNT(DISTINCT lead_id) FROM (
            SELECT id as lead_id FROM leads WHERE database_id = ld.id
            UNION
            SELECT lead_id FROM lead_database_relations WHERE database_id = ld.id
          ) combined
        ) as lead_count
       FROM lead_databases ld
       WHERE ld.id = $1 AND ld.tenant_id = $2`,
      [id, tenantId]
    );

    if (!dbRows.length) {
      return res.status(404).json({ error: 'Base non trouvée' });
    }

    // 2. Récupérer les leads depuis DEUX sources (sans doublons)
    const { rows: leadRows } = await q(
      `SELECT DISTINCT ON (l.id) l.*
       FROM leads l
       WHERE l.id IN (
         -- Leads liés via database_id
         SELECT id FROM leads WHERE database_id = $1
         UNION
         -- Leads liés via lead_database_relations
         SELECT lead_id FROM lead_database_relations WHERE database_id = $1
       )
       ORDER BY l.id, l.created_at DESC`,
      [id]
    );

    log(`✅ Base ${id}: ${leadRows.length} leads trouvés (sources combinées)`);

    // 3. Retourner la base avec ses leads
    const database = {
      ...dbRows[0],
      leads: leadRows
    };

    return res.json({ success: true, database });
  } catch (err) {
    error('❌ Erreur GET lead-database:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 🆕 GET /lead-databases/:id/sectors - Liste des secteurs avec comptage
router.get('/:id/sectors', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    const { id } = req.params;

    log(`📊 Récupération secteurs pour base ${id}`);

    // Récupérer la base avec son champ segmentation
    const { rows: dbRows } = await q(
      'SELECT id, segmentation FROM lead_databases WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    if (!dbRows.length) {
      return res.status(404).json({ error: 'Base non trouvée' });
    }

    const database = dbRows[0];

    // Si segmentation existe (JSON stocké lors de l'import), l'utiliser
    if (database.segmentation && Object.keys(database.segmentation).length > 0) {
      const sectors = Object.entries(database.segmentation).map(([sector, count]) => ({
        sector,
        lead_count: count
      })).sort((a, b) => b.lead_count - a.lead_count);

      log(`✅ ${sectors.length} secteurs trouvés via segmentation`);

      return res.json({
        success: true,
        sectors,
        total: sectors.reduce((sum, s) => sum + parseInt(s.lead_count), 0)
      });
    }

    // Sinon, compter depuis les leads (deux sources combinées)
    const { rows } = await q(
      `SELECT
        sector,
        COUNT(*) as lead_count
       FROM leads
       WHERE id IN (
         SELECT id FROM leads WHERE database_id = $1
         UNION
         SELECT lead_id FROM lead_database_relations WHERE database_id = $1
       )
         AND sector IS NOT NULL
         AND sector != ''
       GROUP BY sector
       ORDER BY lead_count DESC`,
      [id]
    );

    log(`✅ ${rows.length} secteurs trouvés via leads table (sources combinées)`);

    return res.json({
      success: true,
      sectors: rows,
      total: rows.reduce((sum, s) => sum + parseInt(s.lead_count), 0)
    });
  } catch (err) {
    error('❌ Erreur GET sectors:', err);
    return res.status(500).json({ error: err.message });
  }
});

// POST /lead-databases - Créer une nouvelle base
router.post('/', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    const userId = req.user?.id;
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Nom requis' });
    }

    const { rows } = await q(
      `INSERT INTO lead_databases (tenant_id, name, description, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING *`,
      [tenantId, name, description || null, userId]
    );

    log('✅ Base créée:', rows[0].id);
    return res.status(201).json({ success: true, database: rows[0] });
  } catch (err) {
    error('❌ Erreur POST lead-database:', err);
    return res.status(500).json({ error: err.message });
  }
});

// PUT /lead-databases/:id - Modifier une base
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    const { id } = req.params;
    const { name, description } = req.body;

    const { rows } = await q(
      `UPDATE lead_databases 
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           updated_at = NOW()
       WHERE id = $3 AND tenant_id = $4
       RETURNING *`,
      [name, description, id, tenantId]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Base non trouvée' });
    }

    log('✅ Base mise à jour:', id);
    return res.json({ success: true, database: rows[0] });
  } catch (err) {
    error('❌ Erreur PUT lead-database:', err);
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /lead-databases/:id - Supprimer une base
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    const { id } = req.params;

    // Supprimer d'abord les relations
    await q('DELETE FROM lead_database_relations WHERE database_id = $1', [id]);

    // Puis la base
    const { rows } = await q(
      'DELETE FROM lead_databases WHERE id = $1 AND tenant_id = $2 RETURNING id',
      [id, tenantId]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Base non trouvée' });
    }

    log('✅ Base supprimée:', id);
    return res.json({ success: true, message: 'Base supprimée' });
  } catch (err) {
    error('❌ Erreur DELETE lead-database:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 🆕 GET /lead-databases/:id/cities - Liste des villes avec comptage
router.get('/:id/cities', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    const { id } = req.params;
    const { sector } = req.query; // Optionnel: filtrer par secteur

    log(`📊 Récupération villes pour base ${id}${sector ? ` (secteur: ${sector})` : ''}`);

    // Vérifier que la base existe
    const { rows: dbRows } = await q(
      'SELECT id FROM lead_databases WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    if (!dbRows.length) {
      return res.status(404).json({ error: 'Base non trouvée' });
    }

    // Construire la requête avec filtre secteur optionnel
    let query = `
      SELECT
        COALESCE(NULLIF(TRIM(city), ''), 'Non renseigné') as city,
        COUNT(*) as lead_count
      FROM leads
      WHERE id IN (
        SELECT id FROM leads WHERE database_id = $1
        UNION
        SELECT lead_id FROM lead_database_relations WHERE database_id = $1
      )
    `;
    const params = [id];

    if (sector) {
      query += ` AND sector = $2`;
      params.push(sector);
    }

    query += `
      GROUP BY COALESCE(NULLIF(TRIM(city), ''), 'Non renseigné')
      ORDER BY lead_count DESC
    `;

    const { rows } = await q(query, params);

    log(`✅ ${rows.length} villes trouvées`);

    return res.json({
      success: true,
      cities: rows,
      total: rows.reduce((sum, c) => sum + parseInt(c.lead_count), 0)
    });
  } catch (err) {
    error('❌ Erreur GET cities:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 🆕 GET /lead-databases/:id/stats-detailed - Stats détaillées (secteurs + villes + doublons)
router.get('/:id/stats-detailed', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    const { id } = req.params;

    log(`📊 Récupération stats détaillées pour base ${id}`);

    // Vérifier que la base existe
    const { rows: dbRows } = await q(
      'SELECT id, name FROM lead_databases WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    if (!dbRows.length) {
      return res.status(404).json({ error: 'Base non trouvée' });
    }

    // Total leads
    const totalResult = await q(
      `SELECT COUNT(DISTINCT id) as total
       FROM (
         SELECT id FROM leads WHERE database_id = $1
         UNION
         SELECT lead_id as id FROM lead_database_relations WHERE database_id = $1
       ) combined`,
      [id]
    );

    // Leads avec téléphone
    const phoneResult = await q(
      `SELECT COUNT(DISTINCT l.id) as with_phone
       FROM leads l
       WHERE l.id IN (
         SELECT id FROM leads WHERE database_id = $1
         UNION
         SELECT lead_id FROM lead_database_relations WHERE database_id = $1
       )
       AND l.phone IS NOT NULL AND TRIM(l.phone) != ''`,
      [id]
    );

    // Leads avec email
    const emailResult = await q(
      `SELECT COUNT(DISTINCT l.id) as with_email
       FROM leads l
       WHERE l.id IN (
         SELECT id FROM leads WHERE database_id = $1
         UNION
         SELECT lead_id FROM lead_database_relations WHERE database_id = $1
       )
       AND l.email IS NOT NULL AND TRIM(l.email) != ''`,
      [id]
    );

    // Leads avec SIRET (pour dédoublonnage)
    const siretResult = await q(
      `SELECT COUNT(DISTINCT l.id) as with_siret
       FROM leads l
       WHERE l.id IN (
         SELECT id FROM leads WHERE database_id = $1
         UNION
         SELECT lead_id FROM lead_database_relations WHERE database_id = $1
       )
       AND l.siret IS NOT NULL AND TRIM(l.siret) != ''`,
      [id]
    );

    // Compter les potentiels doublons par SIRET
    const duplicatesResult = await q(
      `SELECT COUNT(*) as duplicates
       FROM (
         SELECT siret, COUNT(*) as cnt
         FROM leads l
         WHERE l.id IN (
           SELECT id FROM leads WHERE database_id = $1
           UNION
           SELECT lead_id FROM lead_database_relations WHERE database_id = $1
         )
         AND l.siret IS NOT NULL AND TRIM(l.siret) != ''
         GROUP BY siret
         HAVING COUNT(*) > 1
       ) dups`,
      [id]
    );

    // Leads uniques par SIRET (dédoublonnés)
    const uniqueBysiretResult = await q(
      `SELECT COUNT(DISTINCT siret) as unique_siret
       FROM leads l
       WHERE l.id IN (
         SELECT id FROM leads WHERE database_id = $1
         UNION
         SELECT lead_id FROM lead_database_relations WHERE database_id = $1
       )
       AND l.siret IS NOT NULL AND TRIM(l.siret) != ''`,
      [id]
    );

    const stats = {
      total_leads: parseInt(totalResult.rows[0]?.total || 0),
      with_phone: parseInt(phoneResult.rows[0]?.with_phone || 0),
      with_email: parseInt(emailResult.rows[0]?.with_email || 0),
      with_siret: parseInt(siretResult.rows[0]?.with_siret || 0),
      unique_by_siret: parseInt(uniqueBysiretResult.rows[0]?.unique_siret || 0),
      potential_duplicates: parseInt(duplicatesResult.rows[0]?.duplicates || 0)
    };

    // Calculer les pourcentages
    stats.phone_rate = stats.total_leads > 0 ? Math.round((stats.with_phone / stats.total_leads) * 100) : 0;
    stats.email_rate = stats.total_leads > 0 ? Math.round((stats.with_email / stats.total_leads) * 100) : 0;
    stats.siret_rate = stats.total_leads > 0 ? Math.round((stats.with_siret / stats.total_leads) * 100) : 0;

    log(`✅ Stats détaillées: ${stats.total_leads} leads, ${stats.unique_by_siret} SIRET uniques`);

    return res.json({
      success: true,
      stats
    });
  } catch (err) {
    error('❌ Erreur GET stats-detailed:', err);
    return res.status(500).json({ error: err.message });
  }
});

// POST /lead-databases/:id/add-lead - Ajouter un lead à une base (migration)
router.post('/:id/add-lead', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    const { id: databaseId } = req.params;
    const { lead_id } = req.body;

    if (!lead_id) {
      return res.status(400).json({ error: 'lead_id requis' });
    }

    // Vérifier que la base existe et appartient au tenant
    const { rows: dbRows } = await q(
      'SELECT id FROM lead_databases WHERE id = $1 AND tenant_id = $2',
      [databaseId, tenantId]
    );

    if (!dbRows.length) {
      return res.status(404).json({ error: 'Base non trouvée' });
    }

    // Vérifier que le lead existe et appartient au tenant
    const { rows: leadRows } = await q(
      'SELECT id FROM leads WHERE id = $1 AND tenant_id = $2',
      [lead_id, tenantId]
    );

    if (!leadRows.length) {
      return res.status(404).json({ error: 'Lead non trouvé' });
    }

    // Ajouter la relation (ou ignorer si elle existe déjà)
    await q(
      `INSERT INTO lead_database_relations (lead_id, database_id, added_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (lead_id, database_id) DO NOTHING`,
      [lead_id, databaseId]
    );

    // Mettre à jour le compteur
    await q(
      `UPDATE lead_databases
       SET total_leads = (
         SELECT COUNT(DISTINCT lead_id)
         FROM lead_database_relations
         WHERE database_id = $1
       ),
       updated_at = NOW()
       WHERE id = $1`,
      [databaseId]
    );

    log(`✅ Lead ${lead_id} ajouté à la base ${databaseId}`);
    return res.json({ success: true, message: 'Lead ajouté à la base' });
  } catch (err) {
    error('❌ Erreur POST add-lead:', err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;