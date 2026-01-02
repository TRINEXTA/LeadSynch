import { log, error, warn } from "./lib/logger.js";
import pg from 'pg';
import dotenv from 'dotenv';
import { getSSLConfig } from './lib/ssl-config.js';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: getSSLConfig()
});

async function makeSuperAdmin() {
  try {
    log('Creation Super Admin pour vprince@trinexta.fr...');
    
    const user_id = '7a5198ca-557d-49ea-93aa-040b46683cfe';
    const tenant_id = '584544e5-892c-4550-a9f6-f8360d7c3eb9';
    
    // 1. Mettre le role super_admin
    await pool.query(`
      UPDATE users 
      SET role = 'super_admin'
      WHERE id = $1
    `, [user_id]);
    
    log('Role mis a jour: super_admin');
    
    // 2. Créer ou mettre à jour la subscription avec quotas illimités
    await pool.query(`
      INSERT INTO subscriptions (
        tenant_id, 
        plan,
        status,
        google_leads_quota,
        google_leads_used,
        local_leads_quota,
        local_leads_used,
        emails_quota,
        emails_used,
        campaigns_quota,
        active_campaigns,
        users_quota,
        started_at,
        current_period_start,
        current_period_end,
        created_at,
        updated_at
      ) VALUES (
        $1, 
        'super_admin', 
        'active',
        999999,
        0,
        999999,
        0,
        999999,
        0,
        999999,
        0,
        999,
        NOW(),
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '100 years',
        NOW(),
        NOW()
      )
      ON CONFLICT (tenant_id) 
      DO UPDATE SET
        plan = 'super_admin',
        status = 'active',
        google_leads_quota = 999999,
        google_leads_used = 0,
        local_leads_quota = 999999,
        local_leads_used = 0,
        emails_quota = 999999,
        emails_used = 0,
        campaigns_quota = 999999,
        active_campaigns = 0,
        users_quota = 999,
        current_period_end = CURRENT_DATE + INTERVAL '100 years',
        updated_at = NOW()
    `, [tenant_id]);
    
    log('Subscription creee avec quotas illimites');
    
    // 3. Vérifier
    const result = await pool.query(`
      SELECT 
        u.email,
        u.role,
        u.first_name,
        s.plan,
        s.status,
        s.google_leads_quota,
        s.google_leads_used,
        s.local_leads_quota,
        s.emails_quota,
        s.campaigns_quota,
        s.users_quota,
        s.current_period_end
      FROM users u
      LEFT JOIN subscriptions s ON u.tenant_id = s.tenant_id
      WHERE u.id = $1
    `, [user_id]);
    
    log('\n========== SUPER ADMIN ==========');
    log('Email:', result.rows[0].email);
    log('Role:', result.rows[0].role);
    log('Plan:', result.rows[0].plan);
    log('Status:', result.rows[0].status);
    log('Google Leads:', result.rows[0].google_leads_quota, '(utilises:', result.rows[0].google_leads_used + ')');
    log('Local Leads:', result.rows[0].local_leads_quota);
    log('Emails:', result.rows[0].emails_quota);
    log('Campagnes:', result.rows[0].campaigns_quota);
    log('Utilisateurs:', result.rows[0].users_quota);
    log('Expire le:', result.rows[0].current_period_end);
    log('=================================\n');
    
    await pool.end();
    process.exit(0);
    
  } catch (error) {
    error('Erreur:', error.message);
    error(error);
    await pool.end();
    process.exit(1);
  }
}

makeSuperAdmin();
