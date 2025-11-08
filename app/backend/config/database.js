// Export wrapper for db connection
import { pool } from '../lib/db.js';

const db = {
  query: async (text, params) => {
    try {
      return await pool.query(text, params);
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }
};

export default db;
