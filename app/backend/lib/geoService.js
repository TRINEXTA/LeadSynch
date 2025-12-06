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
  allDepartments: null,
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
    })).sort((a, b) => a.code.localeCompare(b.code));
    return cache.departments[regionCode];
  } catch (err) {
    console.error('Erreur getDepartmentsByRegion:', err.message);
    return [];
  }
}

/**
 * Récupérer TOUS les départements de France
 */
export async function getAllDepartments() {
  if (cache.allDepartments) return cache.allDepartments;

  try {
    const response = await axios.get(`${GEO_API_BASE}/departements`);
    cache.allDepartments = response.data.map(d => ({
      code: d.code,
      nom: d.nom,
      regionCode: d.codeRegion
    })).sort((a, b) => a.code.localeCompare(b.code));
    return cache.allDepartments;
  } catch (err) {
    console.error('Erreur getAllDepartments:', err.message);
    // Fallback sur liste statique
    return DEPARTMENTS_STATIC;
  }
}

// Liste statique des départements (fallback)
const DEPARTMENTS_STATIC = [
  { code: '01', nom: 'Ain' },
  { code: '02', nom: 'Aisne' },
  { code: '03', nom: 'Allier' },
  { code: '04', nom: 'Alpes-de-Haute-Provence' },
  { code: '05', nom: 'Hautes-Alpes' },
  { code: '06', nom: 'Alpes-Maritimes' },
  { code: '07', nom: 'Ardèche' },
  { code: '08', nom: 'Ardennes' },
  { code: '09', nom: 'Ariège' },
  { code: '10', nom: 'Aube' },
  { code: '11', nom: 'Aude' },
  { code: '12', nom: 'Aveyron' },
  { code: '13', nom: 'Bouches-du-Rhône' },
  { code: '14', nom: 'Calvados' },
  { code: '15', nom: 'Cantal' },
  { code: '16', nom: 'Charente' },
  { code: '17', nom: 'Charente-Maritime' },
  { code: '18', nom: 'Cher' },
  { code: '19', nom: 'Corrèze' },
  { code: '2A', nom: 'Corse-du-Sud' },
  { code: '2B', nom: 'Haute-Corse' },
  { code: '21', nom: 'Côte-d\'Or' },
  { code: '22', nom: 'Côtes-d\'Armor' },
  { code: '23', nom: 'Creuse' },
  { code: '24', nom: 'Dordogne' },
  { code: '25', nom: 'Doubs' },
  { code: '26', nom: 'Drôme' },
  { code: '27', nom: 'Eure' },
  { code: '28', nom: 'Eure-et-Loir' },
  { code: '29', nom: 'Finistère' },
  { code: '30', nom: 'Gard' },
  { code: '31', nom: 'Haute-Garonne' },
  { code: '32', nom: 'Gers' },
  { code: '33', nom: 'Gironde' },
  { code: '34', nom: 'Hérault' },
  { code: '35', nom: 'Ille-et-Vilaine' },
  { code: '36', nom: 'Indre' },
  { code: '37', nom: 'Indre-et-Loire' },
  { code: '38', nom: 'Isère' },
  { code: '39', nom: 'Jura' },
  { code: '40', nom: 'Landes' },
  { code: '41', nom: 'Loir-et-Cher' },
  { code: '42', nom: 'Loire' },
  { code: '43', nom: 'Haute-Loire' },
  { code: '44', nom: 'Loire-Atlantique' },
  { code: '45', nom: 'Loiret' },
  { code: '46', nom: 'Lot' },
  { code: '47', nom: 'Lot-et-Garonne' },
  { code: '48', nom: 'Lozère' },
  { code: '49', nom: 'Maine-et-Loire' },
  { code: '50', nom: 'Manche' },
  { code: '51', nom: 'Marne' },
  { code: '52', nom: 'Haute-Marne' },
  { code: '53', nom: 'Mayenne' },
  { code: '54', nom: 'Meurthe-et-Moselle' },
  { code: '55', nom: 'Meuse' },
  { code: '56', nom: 'Morbihan' },
  { code: '57', nom: 'Moselle' },
  { code: '58', nom: 'Nièvre' },
  { code: '59', nom: 'Nord' },
  { code: '60', nom: 'Oise' },
  { code: '61', nom: 'Orne' },
  { code: '62', nom: 'Pas-de-Calais' },
  { code: '63', nom: 'Puy-de-Dôme' },
  { code: '64', nom: 'Pyrénées-Atlantiques' },
  { code: '65', nom: 'Hautes-Pyrénées' },
  { code: '66', nom: 'Pyrénées-Orientales' },
  { code: '67', nom: 'Bas-Rhin' },
  { code: '68', nom: 'Haut-Rhin' },
  { code: '69', nom: 'Rhône' },
  { code: '70', nom: 'Haute-Saône' },
  { code: '71', nom: 'Saône-et-Loire' },
  { code: '72', nom: 'Sarthe' },
  { code: '73', nom: 'Savoie' },
  { code: '74', nom: 'Haute-Savoie' },
  { code: '75', nom: 'Paris' },
  { code: '76', nom: 'Seine-Maritime' },
  { code: '77', nom: 'Seine-et-Marne' },
  { code: '78', nom: 'Yvelines' },
  { code: '79', nom: 'Deux-Sèvres' },
  { code: '80', nom: 'Somme' },
  { code: '81', nom: 'Tarn' },
  { code: '82', nom: 'Tarn-et-Garonne' },
  { code: '83', nom: 'Var' },
  { code: '84', nom: 'Vaucluse' },
  { code: '85', nom: 'Vendée' },
  { code: '86', nom: 'Vienne' },
  { code: '87', nom: 'Haute-Vienne' },
  { code: '88', nom: 'Vosges' },
  { code: '89', nom: 'Yonne' },
  { code: '90', nom: 'Territoire de Belfort' },
  { code: '91', nom: 'Essonne' },
  { code: '92', nom: 'Hauts-de-Seine' },
  { code: '93', nom: 'Seine-Saint-Denis' },
  { code: '94', nom: 'Val-de-Marne' },
  { code: '95', nom: 'Val-d\'Oise' },
  { code: '971', nom: 'Guadeloupe' },
  { code: '972', nom: 'Martinique' },
  { code: '973', nom: 'Guyane' },
  { code: '974', nom: 'La Réunion' },
  { code: '976', nom: 'Mayotte' }
];

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
  getAllDepartments,
  getCitiesByDepartment,
  getCitiesByRegion,
  getTopCitiesByRegion,
  getNeighborRegions,
  searchCity,
  REGIONS,
  REGION_NEIGHBORS
};
