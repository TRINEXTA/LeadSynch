/**
 * Generate Leads V2 - Endpoint de génération de leads optimisé
 *
 * Améliorations vs V1:
 * - Recherche base interne AVANT génération externe
 * - Intégration API Sirene INSEE (GRATUIT)
 * - Enrichissement intelligent des données
 * - Score de qualité pour chaque lead
 * - Choix de destination (nouvelle DB ou existante)
 * - Streaming SSE pour feedback temps réel
 *
 * @author LeadSynch
 * @version 2.0.0
 */

import { log, error, warn } from '../lib/logger.js';
import { authMiddleware } from '../middleware/auth.js';
import { queryAll, queryOne, execute } from '../lib/db.js';
import { Client } from '@googlemaps/google-maps-services-js';
import LeadEnrichmentService from '../services/leadEnrichmentService.js';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { v4 as uuidv4 } from 'uuid';

// Google Maps Client
const googleMapsClient = new Client({});
const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_API_KEY;

// Configuration
const CONFIG = {
  MAX_QUANTITY: 500,
  DEFAULT_RADIUS: 10,
  COST_PER_LEAD: 0.10
};

// Mapping secteur -> types Google Maps
const SECTOR_TO_GOOGLE_TYPES = {
  informatique: ['computer_store', 'electronics_store', 'it_services'],
  juridique: ['lawyer', 'legal_services'],
  comptabilite: ['accounting', 'finance'],
  sante: ['doctor', 'dentist', 'pharmacy', 'physiotherapist', 'hospital'],
  btp: ['general_contractor', 'electrician', 'plumber', 'roofing_contractor'],
  hotellerie: ['restaurant', 'cafe', 'hotel', 'bar', 'lodging'],
  immobilier: ['real_estate_agency'],
  commerce: ['store', 'shopping_mall', 'supermarket'],
  logistique: ['moving_company', 'storage'],
  education: ['school', 'university', 'training_center'],
  consulting: ['business_consultant', 'consulting'],
  marketing: ['marketing_agency', 'advertising_agency'],
  rh: ['employment_agency', 'staffing_agency'],
  industrie: ['factory', 'manufacturing'],
  automobile: ['car_repair', 'car_dealer']
};

// Gestion des recherches actives
const activeSearches = new Map();

// Fallback - Grandes villes par région (en cas d'échec API geo.gouv.fr)
const FALLBACK_CITIES_BY_REGION = {
  '11': ['Paris', 'Boulogne-Billancourt', 'Saint-Denis', 'Argenteuil', 'Montreuil', 'Nanterre', 'Créteil', 'Versailles', 'Vitry-sur-Seine', 'Colombes'], // Île-de-France
  '84': ['Lyon', 'Saint-Étienne', 'Grenoble', 'Villeurbanne', 'Clermont-Ferrand', 'Annecy', 'Chambéry', 'Valence', 'Vénissieux', 'Caluire-et-Cuire'], // Auvergne-Rhône-Alpes
  '93': ['Marseille', 'Nice', 'Toulon', 'Aix-en-Provence', 'Avignon', 'Cannes', 'Antibes', 'La Seyne-sur-Mer', 'Hyères', 'Fréjus'], // PACA
  '75': ['Bordeaux', 'Limoges', 'Poitiers', 'La Rochelle', 'Pau', 'Mérignac', 'Pessac', 'Angoulême', 'Niort', 'Biarritz'], // Nouvelle-Aquitaine
  '76': ['Toulouse', 'Montpellier', 'Nîmes', 'Perpignan', 'Béziers', 'Colomiers', 'Narbonne', 'Albi', 'Tarbes', 'Castres'], // Occitanie
  '32': ['Lille', 'Roubaix', 'Tourcoing', 'Dunkerque', 'Calais', 'Villeneuve-d\'Ascq', 'Valenciennes', 'Arras', 'Lens', 'Cambrai'], // Hauts-de-France
  '44': ['Strasbourg', 'Reims', 'Metz', 'Mulhouse', 'Nancy', 'Colmar', 'Troyes', 'Charleville-Mézières', 'Châlons-en-Champagne', 'Épinal'], // Grand Est
  '52': ['Nantes', 'Angers', 'Le Mans', 'Saint-Nazaire', 'Cholet', 'La Roche-sur-Yon', 'Laval', 'Saumur', 'Saint-Herblain', 'Rezé'], // Pays de la Loire
  '53': ['Rennes', 'Brest', 'Quimper', 'Lorient', 'Vannes', 'Saint-Brieuc', 'Saint-Malo', 'Lanester', 'Fougères', 'Concarneau'], // Bretagne
  '28': ['Rouen', 'Le Havre', 'Caen', 'Cherbourg-en-Cotentin', 'Évreux', 'Dieppe', 'Saint-Lô', 'Alençon', 'Lisieux', 'Fécamp'], // Normandie
  '27': ['Dijon', 'Besançon', 'Belfort', 'Chalon-sur-Saône', 'Auxerre', 'Nevers', 'Mâcon', 'Sens', 'Montbéliard', 'Le Creusot'], // Bourgogne-Franche-Comté
  '24': ['Tours', 'Orléans', 'Bourges', 'Blois', 'Chartres', 'Châteauroux', 'Joué-lès-Tours', 'Dreux', 'Vierzon', 'Montargis'], // Centre-Val de Loire
  '94': ['Ajaccio', 'Bastia', 'Porto-Vecchio', 'Corte', 'Calvi', 'Bonifacio', 'Propriano', 'Sartène', 'Ghisonaccia', 'Île-Rousse'] // Corse
};

// Fallback - Grandes villes par département
const FALLBACK_CITIES_BY_DEPARTMENT = {
  '75': ['Paris'],
  '13': ['Marseille', 'Aix-en-Provence', 'Arles', 'Martigues', 'Aubagne', 'Istres', 'Salon-de-Provence'],
  '69': ['Lyon', 'Villeurbanne', 'Vénissieux', 'Caluire-et-Cuire', 'Saint-Priest', 'Vaulx-en-Velin', 'Bron'],
  '31': ['Toulouse', 'Colomiers', 'Tournefeuille', 'Blagnac', 'Muret', 'Cugnaux', 'Balma'],
  '06': ['Nice', 'Cannes', 'Antibes', 'Grasse', 'Cagnes-sur-Mer', 'Le Cannet', 'Menton'],
  '33': ['Bordeaux', 'Mérignac', 'Pessac', 'Talence', 'Villenave-d\'Ornon', 'Bègles', 'Gradignan'],
  '59': ['Lille', 'Roubaix', 'Tourcoing', 'Dunkerque', 'Villeneuve-d\'Ascq', 'Valenciennes', 'Wattrelos'],
  '44': ['Nantes', 'Saint-Nazaire', 'Saint-Herblain', 'Rezé', 'Orvault', 'Vertou', 'Couëron'],
  '34': ['Montpellier', 'Béziers', 'Sète', 'Agde', 'Lunel', 'Mauguio', 'Frontignan'],
  '67': ['Strasbourg', 'Haguenau', 'Schiltigheim', 'Illkirch-Graffenstaden', 'Lingolsheim', 'Sélestat', 'Bischwiller'],
  '92': ['Boulogne-Billancourt', 'Nanterre', 'Colombes', 'Courbevoie', 'Asnières-sur-Seine', 'Rueil-Malmaison', 'Levallois-Perret'],
  '93': ['Saint-Denis', 'Montreuil', 'Aubervilliers', 'Aulnay-sous-Bois', 'Drancy', 'Noisy-le-Grand', 'Pantin'],
  '94': ['Créteil', 'Vitry-sur-Seine', 'Champigny-sur-Marne', 'Ivry-sur-Seine', 'Saint-Maur-des-Fossés', 'Maisons-Alfort', 'Fontenay-sous-Bois'],
  '78': ['Versailles', 'Sartrouville', 'Mantes-la-Jolie', 'Saint-Germain-en-Laye', 'Poissy', 'Conflans-Sainte-Honorine', 'Montigny-le-Bretonneux'],
  '91': ['Évry-Courcouronnes', 'Corbeil-Essonnes', 'Massy', 'Savigny-sur-Orge', 'Sainte-Geneviève-des-Bois', 'Viry-Châtillon', 'Athis-Mons'],
  '95': ['Argenteuil', 'Cergy', 'Sarcelles', 'Garges-lès-Gonesse', 'Franconville', 'Goussainville', 'Bezons'],
  '77': ['Meaux', 'Chelles', 'Melun', 'Pontault-Combault', 'Savigny-le-Temple', 'Villeparisis', 'Torcy'],
  '38': ['Grenoble', 'Saint-Martin-d\'Hères', 'Échirolles', 'Vienne', 'Voiron', 'Fontaine', 'Bourgoin-Jallieu'],
  '83': ['Toulon', 'La Seyne-sur-Mer', 'Hyères', 'Fréjus', 'Draguignan', 'Saint-Raphaël', 'Six-Fours-les-Plages'],
  '35': ['Rennes', 'Saint-Malo', 'Fougères', 'Bruz', 'Cesson-Sévigné', 'Vitré', 'Betton'],
  '29': ['Brest', 'Quimper', 'Concarneau', 'Morlaix', 'Landerneau', 'Douarnenez', 'Guipavas']
};

/**
 * Obtenir les villes de fallback pour une région
 */
function getFallbackCitiesForRegion(regionCode) {
  const cities = FALLBACK_CITIES_BY_REGION[regionCode];
  if (cities && cities.length > 0) {
    return cities;
  }
  // Fallback générique - grandes villes de France
  return ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Bordeaux', 'Lille', 'Nantes', 'Strasbourg', 'Nice', 'Rennes'];
}

/**
 * Obtenir les villes de fallback pour un département
 */
function getFallbackCitiesForDepartment(deptCode) {
  const cities = FALLBACK_CITIES_BY_DEPARTMENT[deptCode];
  if (cities && cities.length > 0) {
    return cities;
  }
  // Fallback générique - utiliser le nom de département comme recherche
  return [`Département ${deptCode}`];
}

/**
 * Handler principal
 */
async function handler(req, res) {
  const tenant_id = req.user.tenant_id;
  const user_id = req.user.id;
  const url = req.originalUrl || req.url || '';

  try {
    // IMPORTANT: Vérifier les endpoints spécifiques AVANT le endpoint général
    log(`[generate-leads-v2] ${req.method} ${url}`);

    // ============================================================
    // ENDPOINT: POST /generate-leads-v2/preview
    // ============================================================
    if (req.method === 'POST' && url.includes('/preview')) {
      log('[generate-leads-v2] -> handlePreviewSearch');
      return await handlePreviewSearch(req, res, tenant_id);
    }

    // ============================================================
    // ENDPOINT: POST /generate-leads-v2/save
    // ============================================================
    if (req.method === 'POST' && url.includes('/save')) {
      log('[generate-leads-v2] -> handleSaveLeads');
      return await handleSaveLeads(req, res, tenant_id, user_id);
    }

    // ============================================================
    // ENDPOINT: POST /generate-leads-v2/pause
    // ============================================================
    if (req.method === 'POST' && url.includes('/pause')) {
      const { searchId } = req.body;
      const search = activeSearches.get(searchId);
      if (search) {
        search.paused = true;
        return res.json({ success: true, paused: true });
      }
      return res.status(404).json({ error: 'Search not found' });
    }

    // ============================================================
    // ENDPOINT: POST /generate-leads-v2/resume
    // ============================================================
    if (req.method === 'POST' && url.includes('/resume')) {
      const { searchId } = req.body;
      const search = activeSearches.get(searchId);
      if (search) {
        search.paused = false;
        return res.json({ success: true, paused: false });
      }
      return res.status(404).json({ error: 'Search not found' });
    }

    // ============================================================
    // ENDPOINT: POST /generate-leads-v2/stop
    // ============================================================
    if (req.method === 'POST' && url.includes('/stop')) {
      const { searchId } = req.body;
      const search = activeSearches.get(searchId);
      if (search) {
        search.active = false;
        activeSearches.delete(searchId);
        return res.json({ success: true, stopped: true });
      }
      return res.status(404).json({ error: 'Search not found' });
    }

    // ============================================================
    // ENDPOINT: GET /generate-leads-v2/databases
    // ============================================================
    if (req.method === 'GET' && url.includes('/databases')) {
      const databases = await queryAll(
        'SELECT id, name, sector, leads_count FROM lead_databases WHERE tenant_id = $1 ORDER BY name',
        [tenant_id]
      );
      return res.json({ success: true, databases });
    }

    // ============================================================
    // ENDPOINT: POST /generate-leads-v2 (Streaming SSE) - DOIT ÊTRE EN DERNIER
    // ============================================================
    if (req.method === 'POST') {
      return await handleGenerateLeads(req, res, tenant_id, user_id);
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    error('Generate leads V2 error:', err);
    return res.status(500).json({ error: 'Server error', details: err.message });
  }
}

/**
 * Générer des leads (streaming)
 */
async function handleGenerateLeads(req, res, tenant_id, user_id) {
  const {
    sector,
    city,           // Peut être un nom de ville OU une liste de villes séparées par virgule
    cities,         // Liste de villes (array)
    geoType,        // 'city', 'department', 'region'
    geoCode,        // Code géographique
    radius = CONFIG.DEFAULT_RADIUS,
    quantity = 50,
    searchId,
    skipExternal = false // Si true, ne cherche que dans les bases internes
  } = req.body;

  // Validation
  if (!sector) {
    return res.status(400).json({ error: 'Secteur requis' });
  }

  // Déterminer les villes à rechercher
  let citiesToSearch = [];

  log(`🔍 [GENERATE] Params reçus: sector=${sector}, geoType=${geoType}, geoCode=${geoCode}, city=${city}, cities=${cities?.length || 0}`);

  if (cities && Array.isArray(cities) && cities.length > 0) {
    // Liste de villes fournie directement
    citiesToSearch = cities;
    log(`🏙️ [GENERATE] ${cities.length} villes fournies directement`);
  } else if (geoType && geoCode) {
    // Récupérer les villes selon le type géographique
    log(`🗺️ [GENERATE] Récupération villes pour ${geoType}: ${geoCode}`);

    try {
      const geoService = (await import('../lib/geoService.js')).default;

      if (geoType === 'region') {
        const regionCities = await geoService.getTopCitiesByRegion(geoCode, 100);
        log(`🗺️ [GENERATE] getTopCitiesByRegion retourné: ${regionCities?.length || 0} villes`);
        citiesToSearch = regionCities.map(c => c.nom);

        // Fallback si l'API échoue - utiliser les grandes villes par région
        if (citiesToSearch.length === 0) {
          log(`⚠️ [GENERATE] API geo échouée, utilisation fallback pour région ${geoCode}`);
          citiesToSearch = getFallbackCitiesForRegion(geoCode);
        }
      } else if (geoType === 'department') {
        // geoCode peut contenir plusieurs départements séparés par virgule
        const deptCodes = geoCode.split(',');
        for (const deptCode of deptCodes) {
          const deptCities = await geoService.getCitiesByDepartment(deptCode.trim());
          log(`🗺️ [GENERATE] getCitiesByDepartment(${deptCode}) retourné: ${deptCities?.length || 0} villes`);
          citiesToSearch.push(...deptCities.slice(0, 50).map(c => c.nom)); // Top 50 par département
        }

        // Fallback si l'API échoue
        if (citiesToSearch.length === 0) {
          log(`⚠️ [GENERATE] API geo échouée, utilisation fallback pour départements ${geoCode}`);
          for (const deptCode of deptCodes) {
            citiesToSearch.push(...getFallbackCitiesForDepartment(deptCode.trim()));
          }
        }
      } else if (geoType === 'city') {
        citiesToSearch = [geoCode];
      }
    } catch (geoError) {
      error(`❌ [GENERATE] Erreur geoService: ${geoError.message}`);
      // Utiliser le fallback en cas d'erreur
      if (geoType === 'region') {
        citiesToSearch = getFallbackCitiesForRegion(geoCode);
      } else if (geoType === 'department') {
        const deptCodes = geoCode.split(',');
        for (const deptCode of deptCodes) {
          citiesToSearch.push(...getFallbackCitiesForDepartment(deptCode.trim()));
        }
      } else if (geoType === 'city') {
        citiesToSearch = [geoCode];
      }
    }

    log(`🏙️ [GENERATE] ${citiesToSearch.length} villes trouvées`);
  } else if (city) {
    // Fallback: une seule ville fournie
    citiesToSearch = city.includes(',') ? city.split(',').map(c => c.trim()) : [city];
  }

  if (citiesToSearch.length === 0) {
    error(`❌ [GENERATE] Aucune ville trouvée! geoType=${geoType}, geoCode=${geoCode}, city=${city}`);
    return res.status(400).json({
      error: 'Aucune ville à rechercher',
      details: `geoType=${geoType}, geoCode=${geoCode}, city=${city}`,
      suggestion: 'Vérifiez que vous avez sélectionné une zone géographique valide'
    });
  }

  if (quantity > CONFIG.MAX_QUANTITY) {
    return res.status(400).json({ error: `Maximum ${CONFIG.MAX_QUANTITY} leads par recherche` });
  }

  // Vérification des crédits (sauf super admin)
  const isSuperAdmin = req.user.is_super_admin === true;

  if (!isSuperAdmin && !skipExternal) {
    const creditCheck = await checkCredits(tenant_id, quantity);
    if (!creditCheck.hasEnough) {
      return res.status(403).json({
        error: 'Quota insuffisant',
        message: creditCheck.message,
        available: creditCheck.available,
        requested: quantity,
        action: 'buy_credits',
        redirect: '/settings/billing'
      });
    }
  }

  // Setup SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendProgress = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // État de la recherche
  const searchState = { active: true, paused: false, searchId };
  activeSearches.set(searchId, searchState);

  try {
    sendProgress({ type: 'start', message: `Initialisation de la recherche dans ${citiesToSearch.length} ville(s)...` });

    const allLeads = [];
    const stats = {
      fromInternalDb: 0,
      fromGlobalCache: 0,
      fromSirene: 0,
      fromGoogleMaps: 0,
      total: 0
    };

    const totalCities = citiesToSearch.length;
    let processedCities = 0;

    // ========== ÉTAPE 1: BASE INTERNE DU TENANT (ville par ville) ==========
    sendProgress({ type: 'progress', percent: 5, message: `Recherche dans votre base (${totalCities} villes)...` });

    for (const cityName of citiesToSearch) {
      if (allLeads.length >= quantity || !searchState.active) break;
      await waitIfPaused(searchState);

      const remaining = quantity - allLeads.length;
      const cityLeads = await searchInternalDatabase(tenant_id, sector, cityName, remaining);

      if (cityLeads.length > 0) {
        stats.fromInternalDb += cityLeads.length;
        allLeads.push(...cityLeads);

        for (const lead of cityLeads) {
          sendProgress({ type: 'internal_lead', lead, city: cityName });
        }
      }

      processedCities++;
      const percent = 5 + Math.floor((processedCities / totalCities) * 10);
      sendProgress({ type: 'progress', percent, message: `Base interne: ${cityName} (${allLeads.length} leads)` });
    }

    if (stats.fromInternalDb > 0) {
      sendProgress({
        type: 'internal_results',
        percent: 15,
        found: stats.fromInternalDb,
        message: `${stats.fromInternalDb} leads trouvés dans votre base`
      });
    }

    if (allLeads.length >= quantity) {
      sendProgress({
        type: 'complete',
        percent: 100,
        total: allLeads.length,
        message: `Recherche terminée ! ${allLeads.length} leads trouvés dans votre base.`,
        stats
      });
      res.end();
      return;
    }

    // ========== ÉTAPE 2: CACHE GLOBAL (ville par ville) ==========
    sendProgress({ type: 'progress', percent: 20, message: `Recherche cache global (${totalCities} villes)...` });
    processedCities = 0;

    for (const cityName of citiesToSearch) {
      if (allLeads.length >= quantity || !searchState.active) break;
      await waitIfPaused(searchState);

      const remaining = quantity - allLeads.length;
      const cacheLeads = await searchGlobalCache(sector, cityName, remaining, allLeads);

      if (cacheLeads.length > 0) {
        stats.fromGlobalCache += cacheLeads.length;
        allLeads.push(...cacheLeads);

        for (const lead of cacheLeads) {
          sendProgress({ type: 'cache_lead', lead, city: cityName });
        }
      }

      processedCities++;
      const percent = 20 + Math.floor((processedCities / totalCities) * 15);
      sendProgress({ type: 'progress', percent, message: `Cache: ${cityName} (${allLeads.length} leads)` });
    }

    if (stats.fromGlobalCache > 0) {
      sendProgress({
        type: 'cache_results',
        percent: 35,
        found: stats.fromGlobalCache,
        message: `${stats.fromGlobalCache} leads trouvés dans le cache`
      });
    }

    if (allLeads.length >= quantity || skipExternal) {
      sendProgress({
        type: 'complete',
        percent: 100,
        total: allLeads.length,
        message: `Recherche terminée ! ${allLeads.length} leads trouvés.`,
        stats
      });
      res.end();
      return;
    }

    // ========== ÉTAPE 3: API SIRENE INSEE (ville par ville) ==========
    sendProgress({ type: 'progress', percent: 40, message: `Recherche Sirene INSEE (${totalCities} villes)...` });
    processedCities = 0;

    for (const cityName of citiesToSearch) {
      if (allLeads.length >= quantity || !searchState.active) break;
      await waitIfPaused(searchState);

      const remaining = Math.min(25, quantity - allLeads.length); // Max 25 par ville pour Sirene
      const sireneLeads = await searchSireneAPI(sector, cityName, remaining, tenant_id, sendProgress, searchState);

      if (sireneLeads.length > 0) {
        stats.fromSirene += sireneLeads.length;
        allLeads.push(...sireneLeads);

        for (const lead of sireneLeads) {
          sendProgress({ type: 'sirene_lead', lead, city: cityName });
        }
      }

      processedCities++;
      const percent = 40 + Math.floor((processedCities / totalCities) * 25);
      sendProgress({ type: 'progress', percent, message: `Sirene: ${cityName} (${allLeads.length} leads)` });

      // Pause pour éviter rate limiting
      if (processedCities < totalCities) {
        await new Promise(r => setTimeout(r, 200));
      }
    }

    if (stats.fromSirene > 0) {
      sendProgress({
        type: 'sirene_results',
        percent: 65,
        found: stats.fromSirene,
        message: `${stats.fromSirene} entreprises trouvées via Sirene`
      });

      // Consommer les crédits
      if (!isSuperAdmin) {
        await consumeCredits(tenant_id, stats.fromSirene, 'sirene_insee');
      }
    }

    if (allLeads.length >= quantity) {
      sendProgress({
        type: 'complete',
        percent: 100,
        total: allLeads.length,
        message: `Recherche terminée ! ${allLeads.length} leads trouvés.`,
        stats
      });
      res.end();
      return;
    }

    // ========== ÉTAPE 4: GOOGLE MAPS (si nécessaire et configuré) ==========
    if (GOOGLE_API_KEY && allLeads.length < quantity) {
      sendProgress({ type: 'progress', percent: 70, message: 'Recherche Google Maps...' });

      for (const cityName of citiesToSearch.slice(0, 10)) { // Max 10 villes pour Google Maps
        if (allLeads.length >= quantity || !searchState.active) break;
        await waitIfPaused(searchState);

        const remaining = quantity - allLeads.length;
        const googleLeads = await searchGoogleMaps(
          sector, cityName, radius, remaining,
          tenant_id, allLeads, sendProgress, searchState
        );

        if (googleLeads.length > 0) {
          stats.fromGoogleMaps += googleLeads.length;
          allLeads.push(...googleLeads);
        }
      }

      // Consommer les crédits pour Google Maps
      if (!isSuperAdmin && stats.fromGoogleMaps > 0) {
        await consumeCredits(tenant_id, stats.fromGoogleMaps, 'google_maps');
      }
    }

    // ========== ENRICHISSEMENT FINAL ==========
    sendProgress({ type: 'progress', percent: 90, message: 'Enrichissement des données...' });

    const enrichmentService = new LeadEnrichmentService(tenant_id, user_id);
    const enrichedLeads = await enrichmentService.enrichLeads(allLeads.slice(0, quantity));

    stats.total = enrichedLeads.length;

    // Envoyer les leads enrichis un par un
    for (const lead of enrichedLeads) {
      sendProgress({ type: 'enriched_lead', lead });
    }

    sendProgress({
      type: 'complete',
      percent: 100,
      total: enrichedLeads.length,
      message: getCompleteMessage(stats),
      stats
    });

    res.end();

  } catch (err) {
    error('Erreur génération:', err);
    sendProgress({ type: 'error', message: err.message });
    res.end();
  } finally {
    activeSearches.delete(searchId);
  }
}

/**
 * Rechercher dans la base interne du tenant
 */
async function searchInternalDatabase(tenant_id, sector, city, limit) {
  try {
    const leads = await queryAll(`
      SELECT
        l.id, l.company_name, l.contact_name, l.email, l.phone,
        l.address, l.city, l.postal_code, l.website,
        l.sector, l.industry, l.siren, l.siret,
        l.employee_count, l.naf_code, l.quality_score,
        'internal_db' as data_source
      FROM leads l
      WHERE l.tenant_id = $1
        AND (l.sector ILIKE $2 OR l.industry ILIKE $2 OR $2 = '')
        AND l.city ILIKE $3
        AND l.status NOT IN ('lost', 'deleted')
      ORDER BY l.quality_score DESC NULLS LAST, l.updated_at DESC
      LIMIT $4
    `, [tenant_id, `%${sector}%`, `%${city}%`, limit]);

    return leads;
  } catch (err) {
    error('Erreur recherche interne:', err);
    return [];
  }
}

/**
 * Rechercher dans le cache global
 */
async function searchGlobalCache(sector, city, limit, excludeLeads = []) {
  try {
    // Vérifier si la table existe pour éviter les erreurs
    const tableCheck = await queryOne(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'global_leads'
      ) as table_exists
    `);

    if (!tableCheck?.table_exists) {
      log('⚠️ Table global_leads non trouvée, skip cache');
      return [];
    }

    const excludeNames = excludeLeads.map(l => l.company_name?.toLowerCase()).filter(Boolean);

    let query = `
      SELECT
        id, company_name, contact_name, phone, website, email, all_emails,
        address, city, postal_code, latitude, longitude,
        industry, siret, siren, naf_code, employee_count,
        rating, review_count, quality_score,
        'global_cache' as data_source
      FROM global_leads
      WHERE industry ILIKE $1
        AND city ILIKE $2
        AND (company_status IS NULL OR company_status = 'active')
    `;

    const params = [`%${sector}%`, `%${city}%`];

    if (excludeNames.length > 0) {
      query += ` AND LOWER(company_name) NOT IN (${excludeNames.map((_, i) => `$${i + 3}`).join(', ')})`;
      params.push(...excludeNames);
    }

    query += ` ORDER BY quality_score DESC NULLS LAST, last_verified_at DESC NULLS LAST LIMIT $${params.length + 1}`;
    params.push(limit);

    const leads = await queryAll(query, params);
    return leads;
  } catch (err) {
    warn('Cache global non disponible:', err.message);
    return []; // Continuer sans bloquer
  }
}

/**
 * Rechercher via API Sirene (GRATUIT)
 */
async function searchSireneAPI(sector, city, limit, tenant_id, sendProgress, searchState) {
  try {
    const response = await axios.get('https://recherche-entreprises.api.gouv.fr/search', {
      params: {
        q: `${sector} ${city}`,
        per_page: Math.min(limit, 25),
        page: 1
      },
      timeout: 10000
    });

    if (!response.data?.results) {
      return [];
    }

    const leads = [];

    for (const company of response.data.results) {
      await waitIfPaused(searchState);
      if (!searchState.active) break;

      const lead = formatSireneResult(company, sector);

      // Sauvegarder dans le cache global
      await saveToGlobalCache(lead, tenant_id);

      leads.push(lead);

      if (leads.length >= limit) break;
    }

    return leads;

  } catch (err) {
    if (err.response?.status !== 429) {
      error('Erreur Sirene:', err.message);
    }
    return [];
  }
}

/**
 * Rechercher via Google Maps
 */
async function searchGoogleMaps(sector, city, radius, limit, tenant_id, excludeLeads, sendProgress, searchState) {
  const leads = [];
  const googleTypes = SECTOR_TO_GOOGLE_TYPES[sector] || ['establishment'];
  const excludeNames = excludeLeads.map(l => l.company_name?.toLowerCase()).filter(Boolean);

  for (const type of googleTypes) {
    if (leads.length >= limit || !searchState.active) break;

    await waitIfPaused(searchState);

    try {
      const response = await googleMapsClient.textSearch({
        params: {
          query: `${type} ${city}`,
          radius: radius * 1000,
          key: GOOGLE_API_KEY,
          language: 'fr'
        }
      });

      const places = response.data.results || [];

      for (const place of places) {
        if (leads.length >= limit || !searchState.active) break;

        await waitIfPaused(searchState);

        // Vérifier si déjà trouvé
        if (excludeNames.includes(place.name?.toLowerCase())) continue;

        // Vérifier si déjà dans global_leads
        const existing = await queryOne(
          'SELECT id FROM global_leads WHERE google_place_id = $1',
          [place.place_id]
        );
        if (existing) continue;

        // Récupérer les détails
        const detailsResponse = await googleMapsClient.placeDetails({
          params: {
            place_id: place.place_id,
            fields: ['name', 'formatted_address', 'geometry', 'formatted_phone_number', 'website', 'rating', 'user_ratings_total', 'types'],
            key: GOOGLE_API_KEY,
            language: 'fr'
          }
        });

        const details = detailsResponse.data.result;

        // Scraper les emails du site web
        let emails = [];
        if (details.website) {
          emails = await scrapeEmailsFromWebsite(details.website);
        }

        const lead = {
          company_name: details.name,
          phone: details.formatted_phone_number || null,
          website: details.website || null,
          email: emails[0] || null,
          all_emails: emails.join(', ') || null,
          address: details.formatted_address || null,
          city: city,
          latitude: details.geometry?.location?.lat || null,
          longitude: details.geometry?.location?.lng || null,
          industry: sector,
          google_place_id: place.place_id,
          google_types: JSON.stringify(details.types || []),
          rating: details.rating || null,
          review_count: details.user_ratings_total || null,
          data_source: 'google_maps'
        };

        // Sauvegarder dans le cache global
        await saveToGlobalCache(lead, tenant_id);

        leads.push(lead);
        excludeNames.push(lead.company_name?.toLowerCase());

        sendProgress({
          type: 'new_lead',
          percent: 55 + Math.floor((leads.length / limit) * 35),
          generated: leads.length,
          lead: lead
        });

      }
    } catch (err) {
      error(`Erreur Google Maps (${type}):`, err.message);
    }
  }

  return leads;
}

/**
 * Formater un résultat Sirene
 */
function formatSireneResult(company, sector) {
  const siege = company.siege || {};
  const dirigeants = company.dirigeants || [];

  return {
    company_name: company.nom_complet || company.nom_raison_sociale,
    siret: siege.siret || null,
    siren: company.siren || null,
    naf_code: company.activite_principale || null,
    naf_label: company.libelle_activite_principale || null,
    employee_count: parseEmployeeCount(company.tranche_effectif_salarie),
    employee_range: company.tranche_effectif_salarie || null,
    legal_form: company.nature_juridique || null,
    creation_date: company.date_creation || null,
    address: siege.adresse || null,
    city: siege.commune || null,
    postal_code: siege.code_postal || null,
    latitude: siege.latitude || null,
    longitude: siege.longitude || null,
    contact_name: dirigeants[0]?.nom_complet || null,
    contact_role: dirigeants[0]?.qualite || null,
    industry: company.libelle_activite_principale || sector,
    data_source: 'sirene_insee'
  };
}

/**
 * Parser le nombre d'employés
 */
function parseEmployeeCount(tranche) {
  if (!tranche) return null;

  const mapping = {
    '0 salarié': 0,
    '1 ou 2 salariés': 2,
    '3 à 5 salariés': 5,
    '6 à 9 salariés': 9,
    '10 à 19 salariés': 15,
    '20 à 49 salariés': 35,
    '50 à 99 salariés': 75,
    '100 à 199 salariés': 150,
    '200 à 249 salariés': 225,
    '250 à 499 salariés': 375,
    '500 à 999 salariés': 750,
    '1 000 à 1 999 salariés': 1500,
    '2 000 à 4 999 salariés': 3500,
    '5 000 à 9 999 salariés': 7500,
    '10 000 salariés et plus': 10000
  };

  return mapping[tranche] || null;
}

/**
 * Sauvegarder dans le cache global (non bloquant)
 */
async function saveToGlobalCache(lead, tenant_id) {
  // Skip si pas de company_name
  if (!lead?.company_name) return;

  try {
    // Vérifier si la table existe
    const tableCheck = await queryOne(`
      SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'global_leads') as exists
    `);

    if (!tableCheck?.exists) {
      return; // Table n'existe pas, skip silencieusement
    }

    // Générer un google_place_id unique si absent (pour éviter les conflits NULL)
    const placeId = lead.google_place_id || `sirene_${lead.siret || lead.siren || Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    await execute(`
      INSERT INTO global_leads (
        company_name, phone, website, email, all_emails,
        address, city, postal_code, latitude, longitude,
        industry, google_place_id, google_types, rating, review_count,
        siren, siret, naf_code, employee_count,
        source, first_discovered_by, last_verified_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, NOW()
      )
      ON CONFLICT (google_place_id) DO UPDATE SET
        email = COALESCE(EXCLUDED.email, global_leads.email),
        phone = COALESCE(EXCLUDED.phone, global_leads.phone),
        website = COALESCE(EXCLUDED.website, global_leads.website),
        siren = COALESCE(EXCLUDED.siren, global_leads.siren),
        siret = COALESCE(EXCLUDED.siret, global_leads.siret),
        last_verified_at = NOW()
    `, [
      lead.company_name, lead.phone, lead.website, lead.email, lead.all_emails,
      lead.address, lead.city, lead.postal_code, lead.latitude, lead.longitude,
      lead.industry || lead.sector, placeId, lead.google_types, lead.rating, lead.review_count,
      lead.siren, lead.siret, lead.naf_code, lead.employee_count,
      lead.data_source || 'sirene_insee', tenant_id
    ]);
  } catch (err) {
    // Ignorer TOUTES les erreurs - ne pas bloquer la génération
    // Le cache global est optionnel
  }
}

/**
 * Scraper les emails d'un site web
 */
async function scrapeEmailsFromWebsite(url) {
  if (!url) return [];

  try {
    let cleanUrl = url;
    if (!cleanUrl.startsWith('http')) {
      cleanUrl = 'https://' + cleanUrl;
    }

    const response = await axios.get(cleanUrl, {
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const html = response.data;
    const $ = cheerio.load(html);
    const emails = new Set();

    // Regex emails
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const textEmails = html.match(emailRegex) || [];

    textEmails.forEach(email => {
      const clean = email.toLowerCase();
      if (isValidEmail(clean)) {
        emails.add(clean);
      }
    });

    // Mailto links
    $('a[href^="mailto:"]').each((i, elem) => {
      const mailto = $(elem).attr('href');
      const email = mailto.replace('mailto:', '').split('?')[0].toLowerCase();
      if (isValidEmail(email)) {
        emails.add(email);
      }
    });

    return Array.from(emails).slice(0, 5);

  } catch {
    return [];
  }
}

/**
 * Valider un email
 */
function isValidEmail(email) {
  if (!email || email.length < 5 || !email.includes('@')) return false;

  const ignore = ['example.com', 'domain.com', 'test.com', 'wix.com', 'wordpress.com', 'sentry.io'];
  for (const pattern of ignore) {
    if (email.includes(pattern)) return false;
  }

  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
}

/**
 * Vérifier les crédits disponibles
 */
async function checkCredits(tenant_id, requested) {
  try {
    const result = await queryOne(
      'SELECT COALESCE(credits_remaining, 0) as credits FROM lead_credits WHERE tenant_id = $1',
      [tenant_id]
    );

    const available = parseInt(result?.credits || 0);

    return {
      hasEnough: available >= requested,
      available,
      message: available < requested
        ? `Vous avez ${available} crédit(s) mais vous demandez ${requested} leads.`
        : null
    };
  } catch {
    return { hasEnough: false, available: 0, message: 'Erreur vérification crédits' };
  }
}

/**
 * Consommer des crédits
 */
async function consumeCredits(tenant_id, amount, source) {
  try {
    await execute(
      'UPDATE lead_credits SET credits_remaining = credits_remaining - $1, credits_used = credits_used + $1 WHERE tenant_id = $2',
      [amount, tenant_id]
    );

    await execute(
      'INSERT INTO credit_usage (tenant_id, credits_used, source, cost_euros, created_at) VALUES ($1, $2, $3, $4, NOW())',
      [tenant_id, amount, source, amount * CONFIG.COST_PER_LEAD]
    );
  } catch (err) {
    error('Erreur consommation crédits:', err);
  }
}

/**
 * Attendre si la recherche est en pause
 */
async function waitIfPaused(searchState) {
  while (searchState.paused && searchState.active) {
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

/**
 * Message de fin
 */
function getCompleteMessage(stats) {
  const parts = [];

  if (stats.fromInternalDb > 0) {
    parts.push(`${stats.fromInternalDb} de votre base`);
  }
  if (stats.fromGlobalCache > 0) {
    parts.push(`${stats.fromGlobalCache} du cache`);
  }
  if (stats.fromSirene > 0) {
    parts.push(`${stats.fromSirene} de Sirene`);
  }
  if (stats.fromGoogleMaps > 0) {
    parts.push(`${stats.fromGoogleMaps} de Google Maps`);
  }

  const total = stats.total || (stats.fromInternalDb + stats.fromGlobalCache + stats.fromSirene + stats.fromGoogleMaps);

  if (parts.length === 0) {
    return 'Aucun lead trouvé pour cette recherche.';
  }

  return `${total} leads trouvés (${parts.join(', ')})`;
}

/**
 * Prévisualisation de recherche (sans crédits)
 */
async function handlePreviewSearch(req, res, tenant_id) {
  const { sector, city, quantity = 50 } = req.body;

  if (!sector || !city) {
    return res.status(400).json({ error: 'Secteur et ville requis' });
  }

  try {
    // Chercher uniquement dans les bases internes
    const internalLeads = await searchInternalDatabase(tenant_id, sector, city, quantity);
    const remaining = quantity - internalLeads.length;

    let globalLeads = [];
    if (remaining > 0) {
      globalLeads = await searchGlobalCache(sector, city, remaining, internalLeads);
    }

    const totalFound = internalLeads.length + globalLeads.length;
    const needsExternal = quantity - totalFound;

    return res.json({
      success: true,
      preview: {
        requested: quantity,
        foundInternal: internalLeads.length,
        foundGlobal: globalLeads.length,
        totalAvailable: totalFound,
        needsGeneration: Math.max(0, needsExternal),
        estimatedCost: Math.max(0, needsExternal) * CONFIG.COST_PER_LEAD
      },
      leads: [...internalLeads, ...globalLeads]
    });

  } catch (err) {
    error('Erreur preview:', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Sauvegarder les leads dans une base de données
 */
async function handleSaveLeads(req, res, tenant_id, user_id) {
  const { leads, database_id, create_new_database, new_database_name } = req.body;

  log(`📥 [SAVE] Demande de sauvegarde: ${leads?.length || 0} leads`);
  log(`📥 [SAVE] Options: database_id=${database_id}, create_new=${create_new_database}, name=${new_database_name}`);

  // Debug: afficher le premier lead pour voir la structure
  if (leads?.length > 0) {
    log(`📥 [SAVE] Premier lead:`, JSON.stringify(leads[0], null, 2));
  } else {
    log(`⚠️ [SAVE] ATTENTION: leads array est vide ou undefined!`);
  }

  if (!leads || !Array.isArray(leads) || leads.length === 0) {
    return res.status(400).json({ error: 'Leads requis' });
  }

  const errors = [];

  try {
    let targetDatabaseId = database_id;

    // Créer une nouvelle base si demandé
    if (create_new_database && new_database_name) {
      log(`📁 [SAVE] Création nouvelle base: ${new_database_name}`);
      const newDb = await queryOne(`
        INSERT INTO lead_databases (id, tenant_id, name, sector, created_by, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING id
      `, [uuidv4(), tenant_id, new_database_name, leads[0]?.sector || leads[0]?.industry || 'Divers', user_id]);

      targetDatabaseId = newDb.id;
      log(`✅ [SAVE] Base créée: ${targetDatabaseId}`);
    }

    if (!targetDatabaseId) {
      return res.status(400).json({ error: 'database_id requis ou create_new_database avec new_database_name' });
    }

    // Insérer les leads
    let inserted = 0;
    let duplicates = 0;

    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i];

      try {
        // Vérifier doublon (seulement si email existe)
        let existing = null;
        if (lead.email) {
          existing = await queryOne(
            'SELECT id FROM leads WHERE tenant_id = $1 AND email = $2',
            [tenant_id, lead.email]
          );
        }

        // Vérifier aussi par nom+ville
        if (!existing && lead.company_name && lead.city) {
          existing = await queryOne(
            'SELECT id FROM leads WHERE tenant_id = $1 AND company_name = $2 AND city = $3',
            [tenant_id, lead.company_name, lead.city]
          );
        }

        if (existing) {
          // Le lead existe déjà - l'ajouter à la nouvelle base via relation
          await execute(`
            INSERT INTO lead_database_relations (lead_id, database_id, added_at)
            VALUES ($1, $2, NOW())
            ON CONFLICT (lead_id, database_id) DO NOTHING
          `, [existing.id, targetDatabaseId]);

          // Mettre à jour aussi le database_id du lead si pas déjà défini
          await execute(`
            UPDATE leads SET database_id = COALESCE(database_id, $1) WHERE id = $2
          `, [targetDatabaseId, existing.id]);

          duplicates++;
          inserted++; // Compter comme inséré car ajouté à la base
          continue;
        }

        const newLeadId = uuidv4();

        // 1. Insérer le lead avec database_id
        await execute(`
          INSERT INTO leads (
            id, tenant_id, database_id, company_name, contact_name, email, phone,
            address, city, postal_code, website, sector, industry,
            siren, siret, naf_code, employee_count, quality_score,
            data_source, source, assigned_to, status, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, 'nouveau', NOW(), NOW()
          )
        `, [
          newLeadId, tenant_id, targetDatabaseId,
          lead.company_name || 'Sans nom',
          lead.contact_name || null,
          lead.email || null,
          lead.phone || null,
          lead.address || null,
          lead.city || null,
          lead.postal_code || null,
          lead.website || null,
          lead.sector || lead.industry || null,
          lead.industry || lead.sector || null,
          lead.siren || null,
          lead.siret || null,
          lead.naf_code || null,
          lead.employee_count || null,
          lead.quality_score || 0,
          lead.data_source || 'generated',
          'generation',
          user_id
        ]);

        // 2. Créer aussi la relation (pour compatibilité avec import-csv)
        await execute(`
          INSERT INTO lead_database_relations (lead_id, database_id, added_at)
          VALUES ($1, $2, NOW())
          ON CONFLICT (lead_id, database_id) DO NOTHING
        `, [newLeadId, targetDatabaseId]);

        inserted++;

        // Log progression
        if (inserted % 20 === 0) {
          log(`📊 [SAVE] Progression: ${inserted}/${leads.length} insérés`);
        }

      } catch (err) {
        error(`❌ [SAVE] Erreur lead #${i} (${lead.company_name}):`, err.message);
        errors.push({ index: i, company: lead.company_name, error: err.message });
      }
    }

    // Mettre à jour le compteur de leads
    await execute(`
      UPDATE lead_databases SET
        leads_count = (
          SELECT COUNT(DISTINCT lead_id) FROM (
            SELECT id as lead_id FROM leads WHERE database_id = $1
            UNION
            SELECT lead_id FROM lead_database_relations WHERE database_id = $1
          ) combined
        )
      WHERE id = $1
    `, [targetDatabaseId]);

    log(`✅ [SAVE] Terminé: ${inserted} insérés, ${duplicates} doublons, ${errors.length} erreurs`);

    return res.json({
      success: true,
      inserted,
      duplicates,
      errors: errors.length,
      errorDetails: errors.slice(0, 5), // Renvoyer les 5 premières erreurs
      total: leads.length,
      database_id: targetDatabaseId
    });

  } catch (err) {
    error('❌ [SAVE] Erreur globale:', err);
    return res.status(500).json({
      error: err.message,
      errorDetails: errors.slice(0, 5)
    });
  }
}

export default authMiddleware(handler);
