/**
 * Configuration SSL centralisée pour PostgreSQL
 *
 * Cette configuration est rétrocompatible et permet de sécuriser
 * les connexions SSL en production via une variable d'environnement.
 *
 * Variables d'environnement :
 * - SSL_REJECT_UNAUTHORIZED: 'true' pour activer la vérification stricte
 * - NODE_ENV: 'production' pour le mode production
 *
 * Usage:
 *   import { getSSLConfig } from './ssl-config.js';
 *   const client = new pg.Client({
 *     connectionString: process.env.POSTGRES_URL,
 *     ssl: getSSLConfig()
 *   });
 */

/**
 * Retourne la configuration SSL pour PostgreSQL
 *
 * Logique :
 * 1. Si sslmode=disable dans l'URL → SSL désactivé (false)
 * 2. Si SSL_REJECT_UNAUTHORIZED=true → Mode strict (rejectUnauthorized: true)
 * 3. Sinon → Mode permissif rétrocompatible (rejectUnauthorized: false)
 *
 * @param {string} connectionString - URL de connexion PostgreSQL (optionnel)
 * @returns {boolean|object} Configuration SSL
 */
export function getSSLConfig(connectionString = '') {
  const connStr = connectionString || process.env.POSTGRES_URL || process.env.DATABASE_URL || '';

  // Si sslmode=disable est explicite dans l'URL, désactiver SSL
  if (connStr.includes('sslmode=disable')) {
    return false;
  }

  // Si SSL_REJECT_UNAUTHORIZED est explicitement 'true', activer le mode strict
  // C'est la configuration recommandée pour la production
  if (process.env.SSL_REJECT_UNAUTHORIZED === 'true') {
    return { rejectUnauthorized: true };
  }

  // Mode rétrocompatible : accepte les certificats auto-signés
  // C'est le comportement par défaut pour ne pas casser les installations existantes
  return { rejectUnauthorized: false };
}

/**
 * Vérifie si le mode SSL strict est activé
 * @returns {boolean}
 */
export function isSSLStrictMode() {
  return process.env.SSL_REJECT_UNAUTHORIZED === 'true';
}

/**
 * Log des informations de configuration SSL (pour debug)
 */
export function logSSLConfig() {
  const config = getSSLConfig();
  const mode = config === false
    ? 'DISABLED'
    : config.rejectUnauthorized
      ? 'STRICT'
      : 'PERMISSIVE';

  console.log(`[SSL] Mode: ${mode}`);
  if (mode === 'PERMISSIVE') {
    console.log('[SSL] ⚠️  Pour activer le mode strict, définir SSL_REJECT_UNAUTHORIZED=true');
  }
}

export default { getSSLConfig, isSSLStrictMode, logSSLConfig };
