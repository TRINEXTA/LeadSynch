/**
 * Lead Availability API
 * Analyse la disponibilité des leads AVANT génération
 *
 * Le client ne voit pas ce qui se passe en arrière-plan.
 * Il voit juste : "Demandé: X, Disponible: Y"
 */

import { log, error } from '../lib/logger.js';
import { authMiddleware } from '../middleware/auth.js';
import { queryAll, queryOne } from '../lib/db.js';
import geoService from '../lib/geoService.js';

/**
 * Handler principal
 */
async function handler(req, res) {
  const tenant_id = req.user.tenant_id;
  const url = req.originalUrl || req.url || '';

  try {
    // ============================================================
    // GET /lead-availability/regions - Liste des régions
    // ============================================================
    if (req.method === 'GET' && url.includes('/regions')) {
      const regions = await geoService.getRegions();
      return res.json({ success: true, regions });
    }

    // ============================================================
    // GET /lead-availability/all-departments - TOUS les départements
    // ============================================================
    if (req.method === 'GET' && url.includes('/all-departments')) {
      const departments = await geoService.getAllDepartments();
      return res.json({ success: true, departments });
    }

    // ============================================================
    // GET /lead-availability/departments/:regionCode
    // ============================================================
    if (req.method === 'GET' && url.includes('/departments/')) {
      const regionCode = url.split('/departments/')[1]?.split('?')[0];
      const departments = await geoService.getDepartmentsByRegion(regionCode);
      return res.json({ success: true, departments });
    }

    // ============================================================
    // POST /lead-availability/analyze - Analyser disponibilité
    // ============================================================
    if (req.method === 'POST' && url.includes('/analyze')) {
      return await handleAnalyze(req, res, tenant_id);
    }

    // ============================================================
    // POST /lead-availability/suggest - Suggestions d'expansion
    // ============================================================
    if (req.method === 'POST' && url.includes('/suggest')) {
      return await handleSuggest(req, res, tenant_id);
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    error('Lead availability error:', err);
    return res.status(500).json({ error: 'Erreur serveur', details: err.message });
  }
}

/**
 * Analyser la disponibilité des leads
 */
async function handleAnalyze(req, res, tenant_id) {
  const { sector, geoType, geoCode, quantity } = req.body;

  // Validation
  if (!sector || !geoType || !geoCode || !quantity) {
    return res.status(400).json({
      error: 'Paramètres requis: sector, geoType (city/department/region), geoCode, quantity'
    });
  }

  log(`📊 [ANALYZE] Secteur: ${sector}, Type: ${geoType}, Code: ${geoCode}, Quantité: ${quantity}`);

  try {
    // Récupérer les villes à rechercher selon le niveau géographique
    let cities = [];
    let geoName = '';

    if (geoType === 'city') {
      // Recherche par ville unique
      const cityInfo = await geoService.searchCity(geoCode);
      if (cityInfo.length > 0) {
        cities = [cityInfo[0].nom];
        geoName = cityInfo[0].nom;
      } else {
        cities = [geoCode]; // Utiliser le code directement comme nom
        geoName = geoCode;
      }
    } else if (geoType === 'department') {
      // Recherche par département
      const deptCities = await geoService.getCitiesByDepartment(geoCode);
      cities = deptCities.map(c => c.nom);
      geoName = deptCities[0]?.departement || geoCode;
    } else if (geoType === 'region') {
      // Recherche par région
      const regionCities = await geoService.getTopCitiesByRegion(geoCode, 100);
      cities = regionCities.map(c => c.nom);
      const regionInfo = geoService.REGIONS.find(r => r.code === geoCode);
      geoName = regionInfo?.nom || geoCode;
    }

    if (cities.length === 0) {
      return res.json({
        success: true,
        analysis: {
          requested: quantity,
          available: 0,
          missing: quantity,
          message: `Aucune ville trouvée pour cette zone géographique.`,
          cities: [],
          canFulfill: false
        }
      });
    }

    // Compter les leads disponibles dans global_leads
    const availability = await countAvailableLeads(sector, cities, quantity);

    // Calculer le résultat
    const totalAvailable = availability.total;
    const missing = Math.max(0, quantity - totalAvailable);
    const canFulfill = totalAvailable >= quantity;

    // Message pour le client
    let message = '';
    if (canFulfill) {
      message = `${totalAvailable} leads disponibles pour "${sector}" en ${geoName}. Votre demande de ${quantity} leads peut être satisfaite.`;
    } else if (totalAvailable > 0) {
      message = `${totalAvailable} leads disponibles sur ${quantity} demandés pour "${sector}" en ${geoName}. Il manque ${missing} leads.`;
    } else {
      message = `Aucun lead disponible pour "${sector}" en ${geoName}. Une recherche sera effectuée.`;
    }

    log(`📊 [ANALYZE] Résultat: ${totalAvailable}/${quantity} disponibles`);

    return res.json({
      success: true,
      analysis: {
        requested: quantity,
        available: totalAvailable,
        missing,
        message,
        canFulfill,
        geoName,
        geoType,
        geoCode,
        sector,
        breakdown: availability.byCity.slice(0, 10), // Top 10 villes
        totalCities: availability.byCity.length
      }
    });

  } catch (err) {
    error('Erreur analyse:', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Compter les leads disponibles
 */
async function countAvailableLeads(sector, cities, limit) {
  try {
    // Construire la requête pour compter par ville
    const cityPlaceholders = cities.map((_, i) => `$${i + 2}`).join(', ');

    const query = `
      SELECT
        city,
        COUNT(*) as count
      FROM global_leads
      WHERE industry ILIKE $1
        AND city IN (${cityPlaceholders})
        AND (company_status IS NULL OR company_status = 'active')
      GROUP BY city
      ORDER BY count DESC
    `;

    const params = [`%${sector}%`, ...cities];
    const results = await queryAll(query, params);

    // Si global_leads n'existe pas ou est vide, essayer avec leads
    if (!results || results.length === 0) {
      const leadsQuery = `
        SELECT
          city,
          COUNT(*) as count
        FROM leads
        WHERE industry ILIKE $1
          AND city IN (${cityPlaceholders})
          AND status NOT IN ('lost', 'deleted')
        GROUP BY city
        ORDER BY count DESC
      `;

      try {
        const leadsResults = await queryAll(leadsQuery, params);
        const total = leadsResults.reduce((sum, r) => sum + parseInt(r.count), 0);
        return {
          total: Math.min(total, limit),
          byCity: leadsResults.map(r => ({ city: r.city, count: parseInt(r.count) }))
        };
      } catch {
        // Table leads n'a peut-être pas les bonnes colonnes
        return { total: 0, byCity: [] };
      }
    }

    const total = results.reduce((sum, r) => sum + parseInt(r.count), 0);
    return {
      total: Math.min(total, limit),
      byCity: results.map(r => ({ city: r.city, count: parseInt(r.count) }))
    };

  } catch (err) {
    error('Erreur countAvailableLeads:', err);
    return { total: 0, byCity: [] };
  }
}

/**
 * Suggérer des zones d'expansion
 */
async function handleSuggest(req, res, tenant_id) {
  const { sector, geoType, geoCode, missing } = req.body;

  if (!sector || !geoCode || !missing) {
    return res.status(400).json({ error: 'Paramètres requis: sector, geoCode, missing' });
  }

  log(`💡 [SUGGEST] Recherche de ${missing} leads supplémentaires pour ${sector}`);

  try {
    const suggestions = [];

    if (geoType === 'city' || geoType === 'department') {
      // Suggérer la région entière
      const cityInfo = await geoService.searchCity(geoCode);
      if (cityInfo.length > 0 && cityInfo[0].regionCode) {
        const regionCities = await geoService.getTopCitiesByRegion(cityInfo[0].regionCode, 50);
        const regionAvailability = await countAvailableLeads(sector, regionCities.map(c => c.nom), missing);

        if (regionAvailability.total > 0) {
          suggestions.push({
            type: 'region',
            code: cityInfo[0].regionCode,
            name: cityInfo[0].region,
            available: regionAvailability.total,
            message: `${regionAvailability.total} leads disponibles en ${cityInfo[0].region}`
          });
        }
      }
    }

    // Suggérer les régions voisines
    let regionCode = geoCode;
    if (geoType === 'city' || geoType === 'department') {
      const cityInfo = await geoService.searchCity(geoCode);
      if (cityInfo.length > 0) {
        regionCode = cityInfo[0].regionCode;
      }
    }

    const neighbors = geoService.getNeighborRegions(regionCode);

    for (const neighbor of neighbors.slice(0, 3)) {
      const neighborCities = await geoService.getTopCitiesByRegion(neighbor.code, 30);
      const neighborAvailability = await countAvailableLeads(sector, neighborCities.map(c => c.nom), missing);

      if (neighborAvailability.total > 0) {
        suggestions.push({
          type: 'region',
          code: neighbor.code,
          name: neighbor.nom,
          available: neighborAvailability.total,
          message: `${neighborAvailability.total} leads disponibles en ${neighbor.nom}`
        });
      }
    }

    // Trier par disponibilité
    suggestions.sort((a, b) => b.available - a.available);

    return res.json({
      success: true,
      suggestions: suggestions.slice(0, 5),
      message: suggestions.length > 0
        ? `${suggestions.length} zone(s) suggérée(s) pour compléter votre demande`
        : `Aucune suggestion disponible. Une recherche sera effectuée.`
    });

  } catch (err) {
    error('Erreur suggest:', err);
    return res.status(500).json({ error: err.message });
  }
}

export default authMiddleware(handler);
