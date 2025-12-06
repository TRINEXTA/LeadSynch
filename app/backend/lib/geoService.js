/**
 * Service Géographique France
 * Utilise l'API geo.api.gouv.fr (GRATUITE)
 */

import axios from 'axios';

const GEO_API_BASE = 'https://geo.api.gouv.fr';

// Cache pour éviter les appels répétés
const cache = {
  regions: null,
  departments: {},
  cities: {}
};

/**
 * Régions françaises avec leurs codes
 */
export const REGIONS = [
  { code: '84', nom: 'Auvergne-Rhône-Alpes' },
  { code: '27', nom: 'Bourgogne-Franche-Comté' },
  { code: '53', nom: 'Bretagne' },
  { code: '24', nom: 'Centre-Val de Loire' },
  { code: '94', nom: 'Corse' },
  { code: '44', nom: 'Grand Est' },
  { code: '32', nom: 'Hauts-de-France' },
  { code: '11', nom: 'Île-de-France' },
  { code: '28', nom: 'Normandie' },
  { code: '75', nom: 'Nouvelle-Aquitaine' },
  { code: '76', nom: 'Occitanie' },
  { code: '52', nom: 'Pays de la Loire' },
  { code: '93', nom: 'Provence-Alpes-Côte d\'Azur' }
];

/**
 * Récupérer toutes les régions
 */
export async function getRegions() {
  if (cache.regions) return cache.regions;

  try {
    const response = await axios.get(`${GEO_API_BASE}/regions`);
    cache.regions = response.data.map(r => ({
      code: r.code,
      nom: r.nom
    })).sort((a, b) => a.nom.localeCompare(b.nom));
    return cache.regions;
  } catch (err) {
    // Fallback sur la liste statique
    return REGIONS;
  }
}

/**
 * Récupérer les départements d'une région
 */
export async function getDepartmentsByRegion(regionCode) {
  if (cache.departments[regionCode]) return cache.departments[regionCode];

  try {
    const response = await axios.get(`${GEO_API_BASE}/regions/${regionCode}/departements`);
    cache.departments[regionCode] = response.data.map(d => ({
      code: d.code,
      nom: d.nom
    })).sort((a, b) => a.nom.localeCompare(b.nom));
    return cache.departments[regionCode];
  } catch (err) {
    console.error('Erreur getDepartmentsByRegion:', err.message);
    return [];
  }
}

/**
 * Récupérer les villes d'un département
 */
export async function getCitiesByDepartment(departmentCode) {
  if (cache.cities[departmentCode]) return cache.cities[departmentCode];

  try {
    const response = await axios.get(`${GEO_API_BASE}/departements/${departmentCode}/communes`, {
      params: { fields: 'nom,code,population,centre', limit: 500 }
    });
    cache.cities[departmentCode] = response.data
      .map(c => ({
        code: c.code,
        nom: c.nom,
        population: c.population || 0,
        latitude: c.centre?.coordinates?.[1],
        longitude: c.centre?.coordinates?.[0]
      }))
      .sort((a, b) => (b.population || 0) - (a.population || 0)); // Trier par population
    return cache.cities[departmentCode];
  } catch (err) {
    console.error('Erreur getCitiesByDepartment:', err.message);
    return [];
  }
}

/**
 * Récupérer toutes les villes d'une région
 */
export async function getCitiesByRegion(regionCode) {
  const departments = await getDepartmentsByRegion(regionCode);
  const allCities = [];

  for (const dept of departments) {
    const cities = await getCitiesByDepartment(dept.code);
    allCities.push(...cities.map(c => ({ ...c, departement: dept.nom, departementCode: dept.code })));
  }

  // Trier par population
  return allCities.sort((a, b) => (b.population || 0) - (a.population || 0));
}

/**
 * Récupérer les principales villes d'une région (top N par population)
 */
export async function getTopCitiesByRegion(regionCode, limit = 50) {
  const cities = await getCitiesByRegion(regionCode);
  return cities.slice(0, limit);
}

/**
 * Récupérer les régions voisines
 */
export const REGION_NEIGHBORS = {
  '11': ['32', '44', '24', '27'], // Île-de-France -> Hauts-de-France, Grand Est, Centre, Bourgogne
  '32': ['11', '44', '28'], // Hauts-de-France -> IDF, Grand Est, Normandie
  '44': ['11', '32', '27'], // Grand Est -> IDF, Hauts-de-France, Bourgogne
  '24': ['11', '27', '75', '52'], // Centre -> IDF, Bourgogne, Nouvelle-Aquitaine, Pays de Loire
  '27': ['11', '44', '24', '84'], // Bourgogne -> IDF, Grand Est, Centre, Auvergne
  '28': ['32', '52', '53'], // Normandie -> Hauts-de-France, Pays de Loire, Bretagne
  '52': ['28', '53', '24', '75'], // Pays de Loire -> Normandie, Bretagne, Centre, Nouvelle-Aquitaine
  '53': ['28', '52'], // Bretagne -> Normandie, Pays de Loire
  '75': ['24', '52', '76', '84'], // Nouvelle-Aquitaine -> Centre, Pays de Loire, Occitanie, Auvergne
  '76': ['75', '84', '93'], // Occitanie -> Nouvelle-Aquitaine, Auvergne, PACA
  '84': ['27', '75', '76', '93'], // Auvergne-Rhône-Alpes -> Bourgogne, Nouvelle-Aquitaine, Occitanie, PACA
  '93': ['76', '84', '94'], // PACA -> Occitanie, Auvergne, Corse
  '94': ['93'] // Corse -> PACA
};

/**
 * Récupérer les régions voisines avec leurs noms
 */
export function getNeighborRegions(regionCode) {
  const neighborCodes = REGION_NEIGHBORS[regionCode] || [];
  return neighborCodes.map(code => {
    const region = REGIONS.find(r => r.code === code);
    return region || { code, nom: 'Inconnu' };
  });
}

/**
 * Rechercher une ville par nom
 */
export async function searchCity(query) {
  try {
    const response = await axios.get(`${GEO_API_BASE}/communes`, {
      params: { nom: query, fields: 'nom,code,departement,region,population', limit: 10 }
    });
    return response.data.map(c => ({
      code: c.code,
      nom: c.nom,
      departement: c.departement?.nom,
      departementCode: c.departement?.code,
      region: c.region?.nom,
      regionCode: c.region?.code,
      population: c.population
    }));
  } catch (err) {
    console.error('Erreur searchCity:', err.message);
    return [];
  }
}

export default {
  getRegions,
  getDepartmentsByRegion,
  getCitiesByDepartment,
  getCitiesByRegion,
  getTopCitiesByRegion,
  getNeighborRegions,
  searchCity,
  REGIONS,
  REGION_NEIGHBORS
};
