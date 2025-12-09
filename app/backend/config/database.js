import { log, error, warn } from "../lib/logger.js";
﻿// Export wrapper for db connection
import { pool } from '../lib/db.js';

const db = {
  query: async (text, params) => {
    try {
      return await pool.query(text, params);
    } catch (err) {
      error('Database query error:', err);
      throw err;
    }
  }
};

export default db;
