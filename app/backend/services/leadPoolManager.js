import { log, error, warn } from "../lib/logger.js";
﻿import db from '../config/db.js';

/**
 * SYSTÈME DE POOL GLOBAL DES LEADS
 * - Mutualisation automatique
 * - Déduplication intelligente
 * - Enrichissement données
 */

class LeadPoolManager {
  /**
   * Vérifier si un lead existe déjà dans le pool global
   * Critères: email, phone, ou (company_name + city)
   */
  async findDuplicate(leadData, tenantId) {
    try {
      const query = `
        SELECT * FROM leads 
        WHERE tenant_id = $1 
        AND (
          ($2 IS NOT NULL AND email = $2) OR
          ($3 IS NOT NULL AND phone = $3) OR
          ($4 IS NOT NULL AND $5 IS NOT NULL AND company_name = $4 AND city = $5)
        )
        LIMIT 1
      `;

      const result = await db.query(query, [
        tenantId,
        leadData.email || null,
        leadData.phone || null,
        leadData.company_name || null,
        leadData.city || null
      ]);

      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      error('Erreur recherche doublon:', error);
      return null;
    }
  }

  /**
   * Récupérer les leads d'une base avec déduplication
   */
  async getDatabaseLeads(databaseId, tenantId) {
    try {
      const query = `
        SELECT DISTINCT l.* 
        FROM leads l
        INNER JOIN lead_database_relations ldr ON l.id = ldr.lead_id
        WHERE ldr.database_id = $1 
        AND l.tenant_id = $2
        ORDER BY l.created_at DESC
      `;

      const result = await db.query(query, [databaseId, tenantId]);
      return result.rows;
    } catch (error) {
      error('Erreur récupération leads:', error);
      throw error;
    }
  }

  /**
   * Statistiques pool global
   */
  async getPoolStats(tenantId) {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_leads,
          COUNT(DISTINCT email) as unique_emails,
          COUNT(DISTINCT phone) as unique_phones,
          COUNT(CASE WHEN email IS NOT NULL AND email != '' THEN 1 END) as with_email,
          COUNT(CASE WHEN phone IS NOT NULL AND phone != '' THEN 1 END) as with_phone,
          COUNT(CASE WHEN website IS NOT NULL AND website != '' THEN 1 END) as with_website
        FROM leads
        WHERE tenant_id = $1
      `;

      const result = await db.query(query, [tenantId]);
      return result.rows[0];
    } catch (error) {
      error('Erreur stats pool:', error);
      throw error;
    }
  }

  /**
   * Export sécurisé (stats uniquement)
   */
  async getExportableStats(databaseId, tenantId) {
    try {
      const leads = await this.getDatabaseLeads(databaseId, tenantId);

      // Stats agrégées uniquement (pas de données individuelles)
      const stats = {
        total: leads.length,
        by_sector: {},
        with_email: 0,
        with_phone: 0,
        with_website: 0,
        by_city: {},
        top_sectors: []
      };

      leads.forEach(lead => {
        // Comptage par secteur
        const sector = lead.sector || 'autre';
        stats.by_sector[sector] = (stats.by_sector[sector] || 0) + 1;

        // Comptage données disponibles
        if (lead.email) stats.with_email++;
        if (lead.phone) stats.with_phone++;
        if (lead.website) stats.with_website++;

        // Comptage par ville
        if (lead.city) {
          stats.by_city[lead.city] = (stats.by_city[lead.city] || 0) + 1;
        }
      });

      // Top 10 secteurs
      stats.top_sectors = Object.entries(stats.by_sector)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([sector, count]) => ({ sector, count }));

      return stats;
    } catch (error) {
      error('Erreur export stats:', error);
      throw error;
    }
  }
}

export default new LeadPoolManager();
