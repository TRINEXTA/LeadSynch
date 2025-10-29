import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
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

// ✅ NOUVELLE FONCTION - Pour INSERT/UPDATE/DELETE
export async function execute(query, params = []) {
  const result = await pool.query(query, params);
  return result.rows[0] || null;
}

export default { query, queryOne, queryAll, execute };