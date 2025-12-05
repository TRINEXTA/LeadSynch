import { log, error, warn } from "../lib/logger.js";
/**
 * API Lead Sector Assignment - Gestion assignation leads aux secteurs géographiques
 * Permet de réassigner manuellement, obtenir stats, et filtrer leads par secteur
 */

import { query, queryOne, queryAll, execute } from '../lib/db.js';
import { verifyAuth } from '../middleware/auth.js';

export default async function handler(req, res) {
  // Vérifier authentification
  const authResult = await verifyAuth(req);
  if (!authResult.authenticated) {
    return res.status(401).json({ error: 'Non authentifié' });
  }

  const { userId, tenantId } = authResult;

  try {
    // POST - Assigner/Réassigner un lead à un secteur
    if (req.method === 'POST' && req.url.includes('/assign')) {
      const { lead_id, sector_id } = req.body;

      if (!lead_id) {
        return res.status(400).json({ error: 'lead_id requis' });
      }

      // Vérifier que le lead appartient au tenant
      const lead = await queryOne(
        'SELECT id FROM leads WHERE id = $1 AND tenant_id = $2',
        [lead_id, tenantId]
      );

      if (!lead) {
        return res.status(404).json({ error: 'Lead introuvable' });
      }

      // Si sector_id null, on supprime l'assignation
      if (sector_id === null) {
        await execute(
          'UPDATE leads SET geographic_sector_id = NULL WHERE id = $1',
          [lead_id]
        );

        return res.json({
          success: true,
          message: 'Secteur désassigné'
        });
      }

      // Vérifier que le secteur existe et appartient au tenant
      const sector = await queryOne(
        'SELECT id FROM geographic_sectors WHERE id = $1 AND tenant_id = $2',
        [sector_id, tenantId]
      );

      if (!sector) {
        return res.status(404).json({ error: 'Secteur introuvable' });
      }

      // Assigner le secteur
      await execute(
        'UPDATE leads SET geographic_sector_id = $1 WHERE id = $2',
        [sector_id, lead_id]
      );

      log(`✅ Lead ${lead_id} assigné au secteur ${sector_id}`);

      return res.json({
        success: true,
        message: 'Lead assigné au secteur avec succès'
      });
    }

    // POST - Assigner en masse par code postal
    if (req.method === 'POST' && req.url.includes('/bulk-assign')) {
      const { lead_ids } = req.body;

      if (!lead_ids || !Array.isArray(lead_ids) || lead_ids.length === 0) {
        return res.status(400).json({ error: 'lead_ids requis (array)' });
      }

      // Mettre à jour tous les leads en forçant le recalcul du secteur
      const result = await query(
        `UPDATE leads
         SET geographic_sector_id = assign_geographic_sector_by_prefix(tenant_id, postal_code)
         WHERE id = ANY($1::uuid[])
           AND tenant_id = $2
           AND postal_code IS NOT NULL
         RETURNING id, geographic_sector_id`,
        [lead_ids, tenantId]
      );

      const assigned = result.rows.filter(r => r.geographic_sector_id !== null).length;

      log(`✅ ${assigned}/${lead_ids.length} leads assignés aux secteurs`);

      return res.json({
        success: true,
        total: lead_ids.length,
        assigned,
        message: `${assigned} leads assignés avec succès`
      });
    }

    // POST - Réassigner TOUS les leads du tenant (attention!)
    if (req.method === 'POST' && req.url.includes('/reassign-all')) {
      const result = await query(
        `UPDATE leads
         SET geographic_sector_id = assign_geographic_sector_by_prefix(tenant_id, postal_code)
         WHERE tenant_id = $1
           AND postal_code IS NOT NULL
           AND postal_code != ''
         RETURNING id`,
        [tenantId]
      );

      const count = result.rows.length;

      log(`✅ ${count} leads réassignés aux secteurs pour tenant ${tenantId}`);

      return res.json({
        success: true,
        count,
        message: `${count} leads réassignés avec succès`
      });
    }

    // GET - Stats par secteur
    if (req.method === 'GET' && req.url.includes('/stats')) {
      const stats = await queryAll(
        `SELECT
          gs.id,
          gs.name,
          gs.code,
          gs.zone,
          gs.region,
          COUNT(l.id) as total_leads,
          COUNT(CASE WHEN l.status = 'active' THEN 1 END) as active_leads,
          COUNT(CASE WHEN l.status = 'qualified' THEN 1 END) as qualified_leads,
          COUNT(CASE WHEN l.assigned_to IS NOT NULL THEN 1 END) as assigned_leads
         FROM geographic_sectors gs
         LEFT JOIN leads l ON l.geographic_sector_id = gs.id AND l.tenant_id = gs.tenant_id
         WHERE gs.tenant_id = $1 AND gs.is_active = true
         GROUP BY gs.id, gs.name, gs.code, gs.zone, gs.region
         ORDER BY gs.zone, gs.name`,
        [tenantId]
      );

      return res.json({
        success: true,
        stats
      });
    }

    // GET - Leads d'un secteur
    if (req.method === 'GET' && req.url.includes('/sector/')) {
      const sectorId = req.url.split('/sector/')[1].split('?')[0];

      const leads = await queryAll(
        `SELECT
          l.id,
          l.company_name,
          l.contact_name,
          l.email,
          l.phone,
          l.postal_code,
          l.city,
          l.status,
          l.assigned_to,
          l.created_at
         FROM leads l
         WHERE l.geographic_sector_id = $1 AND l.tenant_id = $2
         ORDER BY l.created_at DESC`,
        [sectorId, tenantId]
      );

      return res.json({
        success: true,
        leads,
        total: leads.length
      });
    }

    // GET - Leads sans secteur
    if (req.method === 'GET' && req.url.includes('/unassigned')) {
      const leads = await queryAll(
        `SELECT
          l.id,
          l.company_name,
          l.contact_name,
          l.postal_code,
          l.city,
          l.status
         FROM leads l
         WHERE l.tenant_id = $1
           AND l.geographic_sector_id IS NULL
           AND l.postal_code IS NOT NULL
         ORDER BY l.created_at DESC
         LIMIT 100`,
        [tenantId]
      );

      return res.json({
        success: true,
        leads,
        total: leads.length
      });
    }

    return res.status(405).json({ error: 'Méthode non autorisée' });

  } catch (error) {
    error('❌ Erreur lead-sector-assignment:', error);
    return res.status(500).json({ error: error.message });
  }
}
