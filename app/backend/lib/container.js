// lib/container.js
import * as db from './db.js';
import * as logger from './logger.js';

const container = {};

/**
 * Enregistre une dépendance dans le conteneur.
 * @param {string} name - Nom de la dépendance.
 * @param {any} service - Le service ou la valeur à enregistrer.
 */
export const register = (name, service) => {
  container[name] = service;
};

/**
 * Récupère une dépendance du conteneur.
 * @param {string} name - Nom de la dépendance.
 * @returns {any} Le service ou la valeur.
 */
export const resolve = (name) => {
  if (!container[name]) {
    throw new Error(`Dépendance non trouvée: ${name}`);
  }
  return container[name];
};

// Enregistrement des dépendances de base
register('db', db);
register('logger', logger);

// Exporter le conteneur pour l'utiliser dans les tests si nécessaire
export default container;
