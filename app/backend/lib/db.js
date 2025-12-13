import { log, error, warn } from "../lib/logger.js";
﻿import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

// Configuration SSL : désactiver si sslmode=disable dans l'URL ou VPS privé
const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL || '';
const sslDisabled = connectionString.includes('sslmode=disable');

const sslConfig = sslDisabled
  ? false  // SSL désactivé explicitement
  : { rejectUnauthorized: false }; // Accepte certificats auto-signés (VPS privé)

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
  } catch (error) {
    error('Database query error:', error);
    throw error;
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
