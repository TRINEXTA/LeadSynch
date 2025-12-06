import { log, error, warn } from "./lib/logger.js";
﻿import { pool } from './lib/db.js';
import fs from 'fs';

async function migrate() {
  try {
    const sql = fs.readFileSync('./create_follow_ups_table.sql', 'utf8');
    await pool.query(sql);
    log(' Migration follow_ups réussie !');
    process.exit(0);
  } catch (error) {
    error(' Erreur migration:', error);
    process.exit(1);
  }
}

migrate();
