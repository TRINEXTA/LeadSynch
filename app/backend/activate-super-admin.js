import { log, error, warn } from "./lib/logger.js";
// ================================================================
// Script : Activer un utilisateur en tant que Super-Admin
// Usage : node activate-super-admin.js <email>
// Exemple : node activate-super-admin.js admin@trinexta.fr
// ================================================================

import pg from 'pg';
import dotenv from 'dotenv';
import { getSSLConfig } from './lib/ssl-config.js';

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
    error(`❌ Email ${email} n'est PAS dans la whitelist TRINEXTA`);
    log('✅ Emails autorisés:', ALLOWED_EMAILS.join(', '));
    process.exit(1);
  }

  const client = new Client({
    connectionString: process.env.POSTGRES_URL,
    ssl: getSSLConfig()
  });

  try {
    await client.connect();
    log('✅ Connecté à Neon');

    // Vérifier que l'utilisateur existe
    const checkResult = await client.query(
      'SELECT id, email, first_name, last_name, is_super_admin FROM users WHERE email = $1',
      [email]
    );

    if (checkResult.rows.length === 0) {
      error(`❌ Aucun utilisateur trouvé avec l'email: ${email}`);
      log('💡 Créez d\'abord un compte avec cet email dans LeadSynch');
      process.exit(1);
    }

    const user = checkResult.rows[0];

    if (user.is_super_admin) {
      log(`⚠️  ${email} est DÉJÀ super-admin`);
      log('✅ Rien à faire !');
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

    log('');
    log('========================================');
    log('✅ Super-Admin activé avec succès !');
    log('========================================');
    log(`👤 Utilisateur: ${user.first_name} ${user.last_name}`);
    log(`📧 Email: ${email}`);
    log(`🔑 Permissions: * (toutes)`);
    log('========================================');
    log('');
    log('🚀 Vous pouvez maintenant vous connecter et accéder à:');
    log('   👉 /super-admin (Dashboard)');
    log('   👉 /super-admin/tenants (Gestion clients)');
    log('');

  } catch (error) {
    error('❌ Erreur:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Récupérer l'email depuis les arguments
const email = process.argv[2];

if (!email) {
  error('❌ Usage: node activate-super-admin.js <email>');
  log('');
  log('Exemple:');
  log('  node activate-super-admin.js admin@trinexta.fr');
  log('');
  log('Emails autorisés:', ALLOWED_EMAILS.join(', '));
  process.exit(1);
}

activateSuperAdmin(email);
