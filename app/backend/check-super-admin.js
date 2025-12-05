import { log, error, warn } from "../lib/logger.js";
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

async function checkSuperAdmin(email) {
  const client = new Client({
    connectionString: process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    log('🔍 Vérification du compte:', email);
    log('=====================================\n');

    const result = await client.query(
      `SELECT id, email, first_name, last_name, role, is_super_admin, super_admin_permissions, tenant_id
       FROM users
       WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      log('❌ Aucun utilisateur trouvé avec cet email');
      return;
    }

    const user = result.rows[0];
    log('✅ Utilisateur trouvé:');
    log('   ID:', user.id);
    log('   Email:', user.email);
    log('   Nom:', user.first_name, user.last_name);
    log('   Role:', user.role);
    log('   Tenant ID:', user.tenant_id);
    log('   is_super_admin:', user.is_super_admin);
    log('   Permissions:', user.super_admin_permissions);
    log('');

    if (user.is_super_admin) {
      log('✅ Super-Admin ACTIVÉ');
    } else {
      log('❌ Super-Admin NON ACTIVÉ');
    }

  } catch (error) {
    error('❌ Erreur:', error.message);
  } finally {
    await client.end();
  }
}

const email = process.argv[2];

if (!email) {
  log('Usage: node check-super-admin.js <email>');
  process.exit(1);
}

checkSuperAdmin(email);
