// logger.js - Système de logging conditionnel pour LeadSynch
// Les logs de debug sont désactivés en production

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Log de debug - Désactivé en production
 */
export const log = (...args) => {
  if (!isProduction) {
    console.log(...args);
  }
};

/**
 * Log d'erreur - Toujours actif (nécessaire pour le monitoring)
 */
export const error = (...args) => {
  console.error(...args);
};

/**
 * Log d'avertissement - Désactivé en production
 */
export const warn = (...args) => {
  if (!isProduction) {
    console.warn(...args);
  }
};
