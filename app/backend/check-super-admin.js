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
    console.log('🔍 Vérification du compte:', email);
    console.log('=====================================\n');

    const result = await client.query(
      `SELECT id, email, first_name, last_name, role, is_super_admin, super_admin_permissions, tenant_id
       FROM users
       WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      console.log('❌ Aucun utilisateur trouvé avec cet email');
      return;
    }

    const user = result.rows[0];
    console.log('✅ Utilisateur trouvé:');
    console.log('   ID:', user.id);
    console.log('   Email:', user.email);
    console.log('   Nom:', user.first_name, user.last_name);
    console.log('   Role:', user.role);
    console.log('   Tenant ID:', user.tenant_id);
    console.log('   is_super_admin:', user.is_super_admin);
    console.log('   Permissions:', user.super_admin_permissions);
    console.log('');

    if (user.is_super_admin) {
      console.log('✅ Super-Admin ACTIVÉ');
    } else {
      console.log('❌ Super-Admin NON ACTIVÉ');
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await client.end();
  }
}

const email = process.argv[2];

if (!email) {
  console.log('Usage: node check-super-admin.js <email>');
  process.exit(1);
}

checkSuperAdmin(email);
