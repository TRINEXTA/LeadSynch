/**
 * API Geographic Sectors - Gestion des secteurs géographiques
 * Permet d'attribuer des commerciaux à des zones géographiques
 * Hiérarchie: Commercial → Zone Manager → Regional Manager → Department Head → Commercial Director
 */

import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { queryOne, queryAll, execute } from '../lib/db.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

/**
 * Liste tous les secteurs géographiques
 * GET /api/geographic-sectors
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const { zone, region, is_active = 'true' } = req.query;

    let query = 'SELECT * FROM geographic_sectors WHERE tenant_id = $1';
    const params = [tenant_id];
    let paramIndex = 2;

    if (zone) {
      query += ` AND zone = $${paramIndex++}`;
      params.push(zone);
    }

    if (region) {
      query += ` AND region = $${paramIndex++}`;
      params.push(region);
    }

    if (is_active !== 'all') {
      query += ` AND is_active = $${paramIndex++}`;
      params.push(is_active === 'true');
    }

    query += ' ORDER BY region, zone, name';

    const sectors = await queryAll(query, params);

    // Pour chaque secteur, compter les commerciaux assignés
    for (const sector of sectors) {
      const assignments = await queryOne(
        `SELECT COUNT(*) as count
         FROM sector_assignments
         WHERE sector_id = $1 AND is_active = true`,
        [sector.id]
      );
      sector.assigned_count = parseInt(assignments.count) || 0;
    }

    res.json({
      success: true,
      sectors
    });
  } catch (error) {
    console.error('❌ Erreur liste secteurs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Obtenir un secteur spécifique avec ses assignations
 * GET /api/geographic-sectors/:id
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const { id } = req.params;

    const sector = await queryOne(
      'SELECT * FROM geographic_sectors WHERE id = $1 AND tenant_id = $2',
      [id, tenant_id]
    );

    if (!sector) {
      return res.status(404).json({ success: false, error: 'Secteur introuvable' });
    }

    // Récupérer les assignations de ce secteur
    const assignments = await queryAll(
      `SELECT sa.*, u.first_name, u.last_name, u.email, u.role
       FROM sector_assignments sa
       JOIN users u ON sa.user_id = u.id
       WHERE sa.sector_id = $1 AND sa.is_active = true
       ORDER BY sa.role, u.last_name`,
      [id]
    );

    sector.assignments = assignments;

    res.json({
      success: true,
      sector
    });
  } catch (error) {
    console.error('❌ Erreur get secteur:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Créer un nouveau secteur géographique
 * POST /api/geographic-sectors
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { tenant_id, id: user_id, role } = req.user;

    // Seulement admin et managers peuvent créer des secteurs
    if (role !== 'admin' && role !== 'manager') {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé: admin ou manager requis'
      });
    }

    const {
      name,
      code,
      region,
      department,
      zone,
      postal_codes,
      cities,
      description,
      color
    } = req.body;

    if (!name || !code || !zone) {
      return res.status(400).json({
        success: false,
        error: 'Champs requis: name, code, zone'
      });
    }

    // Vérifier que le code n'existe pas déjà
    const existing = await queryOne(
      'SELECT id FROM geographic_sectors WHERE tenant_id = $1 AND code = $2',
      [tenant_id, code]
    );

    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'Un secteur avec ce code existe déjà'
      });
    }

    const sector = await queryOne(
      `INSERT INTO geographic_sectors (
        id, tenant_id, name, code, region, department, zone,
        postal_codes, cities, description, color
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        uuidv4(),
        tenant_id,
        name,
        code.toUpperCase(),
        region,
        department,
        zone,
        postal_codes || [],
        cities || [],
        description,
        color || '#3B82F6'
      ]
    );

    console.log(`✅ Secteur créé: ${sector.name} (${sector.code})`);

    res.status(201).json({
      success: true,
      sector
    });
  } catch (error) {
    console.error('❌ Erreur création secteur:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Mettre à jour un secteur
 * PUT /api/geographic-sectors/:id
 */
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { tenant_id, role } = req.user;
    const { id } = req.params;

    if (role !== 'admin' && role !== 'manager') {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé: admin ou manager requis'
      });
    }

    const {
      name,
      region,
      department,
      zone,
      postal_codes,
      cities,
      description,
      color,
      is_active
    } = req.body;

    const sector = await queryOne(
      `UPDATE geographic_sectors SET
        name = COALESCE($1, name),
        region = COALESCE($2, region),
        department = COALESCE($3, department),
        zone = COALESCE($4, zone),
        postal_codes = COALESCE($5, postal_codes),
        cities = COALESCE($6, cities),
        description = COALESCE($7, description),
        color = COALESCE($8, color),
        is_active = COALESCE($9, is_active),
        updated_at = NOW()
      WHERE id = $10 AND tenant_id = $11
      RETURNING *`,
      [name, region, department, zone, postal_codes, cities, description, color, is_active, id, tenant_id]
    );

    if (!sector) {
      return res.status(404).json({ success: false, error: 'Secteur introuvable' });
    }

    console.log(`✅ Secteur mis à jour: ${sector.name}`);

    res.json({
      success: true,
      sector
    });
  } catch (error) {
    console.error('❌ Erreur update secteur:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Supprimer un secteur
 * DELETE /api/geographic-sectors/:id
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { tenant_id, role } = req.user;
    const { id } = req.params;

    if (role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé: admin requis'
      });
    }

    // Vérifier qu'il n'y a pas d'assignations actives
    const activeAssignments = await queryOne(
      'SELECT COUNT(*) as count FROM sector_assignments WHERE sector_id = $1 AND is_active = true',
      [id]
    );

    if (parseInt(activeAssignments.count) > 0) {
      return res.status(400).json({
        success: false,
        error: `Impossible de supprimer: ${activeAssignments.count} assignation(s) active(s)`
      });
    }

    await execute(
      'DELETE FROM geographic_sectors WHERE id = $1 AND tenant_id = $2',
      [id, tenant_id]
    );

    console.log(`✅ Secteur supprimé: ${id}`);

    res.json({ success: true });
  } catch (error) {
    console.error('❌ Erreur suppression secteur:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Assigner un commercial à un secteur
 * POST /api/geographic-sectors/:sector_id/assign
 */
router.post('/:sector_id/assign', authMiddleware, async (req, res) => {
  try {
    const { tenant_id, id: assigned_by_id, role } = req.user;
    const { sector_id } = req.params;
    const { user_id, assignment_role = 'commercial', is_primary = false, notes } = req.body;

    if (role !== 'admin' && role !== 'manager') {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé: admin ou manager requis'
      });
    }

    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: 'user_id requis'
      });
    }

    // Vérifier que le secteur existe
    const sector = await queryOne(
      'SELECT id, name FROM geographic_sectors WHERE id = $1 AND tenant_id = $2',
      [sector_id, tenant_id]
    );

    if (!sector) {
      return res.status(404).json({ success: false, error: 'Secteur introuvable' });
    }

    // Vérifier que l'utilisateur existe
    const user = await queryOne(
      'SELECT id, first_name, last_name FROM users WHERE id = $1 AND tenant_id = $2',
      [user_id, tenant_id]
    );

    if (!user) {
      return res.status(404).json({ success: false, error: 'Utilisateur introuvable' });
    }

    // Vérifier si déjà assigné
    const existing = await queryOne(
      'SELECT id FROM sector_assignments WHERE sector_id = $1 AND user_id = $2 AND is_active = true',
      [sector_id, user_id]
    );

    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'Cet utilisateur est déjà assigné à ce secteur'
      });
    }

    // Si c'est l'assignation primaire, désactiver les autres assignations primaires pour cet utilisateur
    if (is_primary) {
      await execute(
        'UPDATE sector_assignments SET is_primary = false WHERE user_id = $1 AND tenant_id = $2',
        [user_id, tenant_id]
      );

      // Mettre à jour le secteur principal dans users
      await execute(
        'UPDATE users SET primary_sector_id = $1 WHERE id = $2',
        [sector_id, user_id]
      );
    }

    const assignment = await queryOne(
      `INSERT INTO sector_assignments (
        id, tenant_id, user_id, sector_id, role, assigned_by, is_primary, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [uuidv4(), tenant_id, user_id, sector_id, assignment_role, assigned_by_id, is_primary, notes]
    );

    console.log(`✅ ${user.first_name} ${user.last_name} assigné(e) au secteur ${sector.name}`);

    res.status(201).json({
      success: true,
      assignment,
      message: `${user.first_name} ${user.last_name} assigné(e) au secteur ${sector.name}`
    });
  } catch (error) {
    console.error('❌ Erreur assignation secteur:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Retirer un commercial d'un secteur
 * DELETE /api/geographic-sectors/:sector_id/assign/:user_id
 */
router.delete('/:sector_id/assign/:user_id', authMiddleware, async (req, res) => {
  try {
    const { tenant_id, role } = req.user;
    const { sector_id, user_id } = req.params;

    if (role !== 'admin' && role !== 'manager') {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé: admin ou manager requis'
      });
    }

    await execute(
      `UPDATE sector_assignments SET is_active = false, updated_at = NOW()
       WHERE sector_id = $1 AND user_id = $2 AND tenant_id = $3`,
      [sector_id, user_id, tenant_id]
    );

    console.log(`✅ Assignation retirée: user ${user_id} du secteur ${sector_id}`);

    res.json({ success: true });
  } catch (error) {
    console.error('❌ Erreur retrait assignation:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Obtenir les assignations d'un utilisateur
 * GET /api/geographic-sectors/user/:user_id/assignments
 */
router.get('/user/:user_id/assignments', authMiddleware, async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const { user_id } = req.params;

    const assignments = await queryAll(
      `SELECT sa.*, gs.name as sector_name, gs.code as sector_code,
              gs.region, gs.zone, gs.color
       FROM sector_assignments sa
       JOIN geographic_sectors gs ON sa.sector_id = gs.id
       WHERE sa.user_id = $1 AND sa.tenant_id = $2 AND sa.is_active = true
       ORDER BY sa.is_primary DESC, gs.name`,
      [user_id, tenant_id]
    );

    res.json({
      success: true,
      assignments
    });
  } catch (error) {
    console.error('❌ Erreur get assignations user:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Statistiques par secteur
 * GET /api/geographic-sectors/:id/stats
 */
router.get('/:id/stats', authMiddleware, async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const { id } = req.params;

    // Nombre de commerciaux assignés
    const commercialsCount = await queryOne(
      `SELECT COUNT(*) as count FROM sector_assignments
       WHERE sector_id = $1 AND is_active = true`,
      [id]
    );

    // TODO: Ajouter stats leads dans ce secteur (quand on aura lié leads aux secteurs par code postal)
    // Pour l'instant, retourner structure de base
    const stats = {
      assigned_commercials: parseInt(commercialsCount.count) || 0,
      total_leads: 0,        // TODO
      active_campaigns: 0,   // TODO
      avg_conversion: 0      // TODO
    };

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('❌ Erreur stats secteur:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
