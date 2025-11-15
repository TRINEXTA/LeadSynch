import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

// Configuration SSL sécurisée : strict en production, permissif en dev
const sslConfig = process.env.NODE_ENV === 'production'
  ? { rejectUnauthorized: true }  // Production : vérifie les certificats SSL
  : { rejectUnauthorized: false }; // Dev local : accepte les certificats auto-signés

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
  ssl: sslConfig
});

export async function query(query, params = []) {
  try {
    const result = await pool.query(query, params);
    return result;
  } catch (error) {
    console.error('Database query error:', error);
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
