import { log, error, warn } from "../lib/logger.js";
﻿import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

async function checkTables() {
  try {
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    log('\n=== TABLES EXISTANTES ===');
    result.rows.forEach(row => {
      log(`- ${row.table_name}`);
    });
    log('=========================\n');
    
    // Vérifier si search_jobs existe
    const searchJobsExists = result.rows.some(r => r.table_name === 'search_jobs');
    
    if (searchJobsExists) {
      log('✅ Table search_jobs existe deja !');
      
      // Voir sa structure
      const cols = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'search_jobs'
        ORDER BY ordinal_position
      `);
      
      log('\nStructure search_jobs:');
      cols.rows.forEach(col => {
        log(`  ${col.column_name}: ${col.data_type}`);
      });
    } else {
      log('❌ Table search_jobs n\'existe PAS');
    }
    
    await pool.end();
    process.exit(0);
    
  } catch (error) {
    error('Erreur:', error.message);
    await pool.end();
    process.exit(1);
  }
}

checkTables();
