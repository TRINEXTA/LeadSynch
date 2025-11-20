// ================================================================
// Script : Activer un utilisateur en tant que Super-Admin
// Usage : node activate-super-admin.js <email>
// Exemple : node activate-super-admin.js admin@trinexta.fr
// ================================================================

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

const ALLOWED_EMAILS = [
  'admin@trinexta.fr',
  'direction@trinexta.fr',
  'dev@trinexta.fr',
  'support@trinexta.fr',
  'vprince@trinexta.fr'
];

async function activateSuperAdmin(email) {
  // Vérifier que l'email est autorisé
  if (!ALLOWED_EMAILS.includes(email)) {
    console.error(`❌ Email ${email} n'est PAS dans la whitelist TRINEXTA`);
    console.log('✅ Emails autorisés:', ALLOWED_EMAILS.join(', '));
    process.exit(1);
  }

  const client = new Client({
    connectionString: process.env.POSTGRES_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Connecté à Neon');

    // Vérifier que l'utilisateur existe
    const checkResult = await client.query(
      'SELECT id, email, first_name, last_name, is_super_admin FROM users WHERE email = $1',
      [email]
    );

    if (checkResult.rows.length === 0) {
      console.error(`❌ Aucun utilisateur trouvé avec l'email: ${email}`);
      console.log('💡 Créez d\'abord un compte avec cet email dans LeadSynch');
      process.exit(1);
    }

    const user = checkResult.rows[0];

    if (user.is_super_admin) {
      console.log(`⚠️  ${email} est DÉJÀ super-admin`);
      console.log('✅ Rien à faire !');
      process.exit(0);
    }

    // Activer super-admin
    await client.query(
      `UPDATE users
       SET is_super_admin = true,
           super_admin_permissions = $1,
           updated_at = NOW()
       WHERE email = $2`,
      [JSON.stringify(['*']), email]
    );

    console.log('');
    console.log('========================================');
    console.log('✅ Super-Admin activé avec succès !');
    console.log('========================================');
    console.log(`👤 Utilisateur: ${user.first_name} ${user.last_name}`);
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Permissions: * (toutes)`);
    console.log('========================================');
    console.log('');
    console.log('🚀 Vous pouvez maintenant vous connecter et accéder à:');
    console.log('   👉 /super-admin (Dashboard)');
    console.log('   👉 /super-admin/tenants (Gestion clients)');
    console.log('');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Récupérer l'email depuis les arguments
const email = process.argv[2];

if (!email) {
  console.error('❌ Usage: node activate-super-admin.js <email>');
  console.log('');
  console.log('Exemple:');
  console.log('  node activate-super-admin.js admin@trinexta.fr');
  console.log('');
  console.log('Emails autorisés:', ALLOWED_EMAILS.join(', '));
  process.exit(1);
}

activateSuperAdmin(email);
