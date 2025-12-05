import { log, error, warn } from "../lib/logger.js";
﻿import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

async function fixRole() {
  try {
    log('Correction role en admin...');
    
    const user_id = '7a5198ca-557d-49ea-93aa-040b46683cfe';
    
    // Remettre le role à admin (au lieu de super_admin)
    await pool.query(`
      UPDATE users 
      SET role = 'admin'
      WHERE id = $1
    `, [user_id]);
    
    log('Role corrige: admin (avec quotas illimites)');
    
    // Vérifier
    const result = await pool.query(`
      SELECT 
        u.email,
        u.role,
        s.plan,
        s.status,
        s.google_leads_quota,
        s.emails_quota
      FROM users u
      LEFT JOIN subscriptions s ON u.tenant_id = s.tenant_id
      WHERE u.id = $1
    `, [user_id]);
    
    log('\n========== ADMIN ILLIMITE ==========');
    log('Email:', result.rows[0].email);
    log('Role:', result.rows[0].role);
    log('Plan:', result.rows[0].plan);
    log('Google Leads:', result.rows[0].google_leads_quota);
    log('Emails:', result.rows[0].emails_quota);
    log('====================================\n');
    
    await pool.end();
    process.exit(0);
    
  } catch (error) {
    error('Erreur:', error.message);
    await pool.end();
    process.exit(1);
  }
}

fixRole();
