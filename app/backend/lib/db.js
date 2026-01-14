import { log, error as logError, warn } from "../lib/logger.js";
import pg from 'pg';
import dotenv from 'dotenv';
import { getSSLConfig } from './ssl-config.js';

dotenv.config();

const { Pool } = pg;

// ✅ SÉCURITÉ : Configuration SSL stricte en production
const isProduction = process.env.NODE_ENV === 'production';

// On utilise getSSLConfig() mais on force la sécurité en production
let sslConfig = getSSLConfig();

if (isProduction) {
  // Surcharge pour garantir la sécurité en prod, peu importe ce que renvoie getSSLConfig
  sslConfig = {
    rejectUnauthorized: true, // 🔒 OBLIGATOIRE : Vérifie le certificat
    ca: process.env.CA_CERT || undefined // Optionnel : si vous utilisez un certificat spécifique
  };
}

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
  ssl: sslConfig,
  // Performance optimizations
  max: 20,                     // Maximum number of connections in pool
  idleTimeoutMillis: 30000,    // Close idle connections after 30s
  connectionTimeoutMillis: 5000 // Timeout if connection takes > 5s
});

export async function query(query, params = []) {
  try {
    const result = await pool.query(query, params);
    return result;
  } catch (err) {
    // ✅ Log plus propre pour éviter de fuiter des infos sensibles
    logError('Database query error:', { message: err.message, code: err.code });
    throw err;
  }
}

export async function queryOne(query, params = []) {
  const result = await pool.query(query, params);
  return result.rows[0] || null;
}

export async function queryAll(query, params = []) {
  const result = await pool.query(query, params);
  return result.rows;
}

//  NOUVELLE FONCTION - Pour INSERT/UPDATE/DELETE
export async function execute(query, params = []) {
  const result = await pool.query(query, params);
  return result.rows[0] || null;
}

//  EXPORTER pool aussi
export { pool };

export default { query, queryOne, queryAll, execute, pool };
