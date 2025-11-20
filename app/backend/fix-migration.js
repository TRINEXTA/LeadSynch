// ================================================================
// Script : Fix migration - Supprime les anciennes tables
// Usage : node fix-migration.js
// ================================================================

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

async function fixMigration() {
  const client = new Client({
    connectionString: process.env.POSTGRES_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Connecté à Neon');

    console.log('\n⚠️  Suppression des anciennes tables pour migration propre...\n');

    // Supprimer dans l'ordre inverse des dépendances
    const tables = [
      // Partie 2 : Système Super-Admin
      'super_admin_activity_log',
      'payments',
      'invoices',
      'tenant_subscriptions',
      'subscription_plans',

      // Partie 1 : Configuration Business Clients
      'tenant_payment_links',
      'tenant_legal_documents',
      'tenant_products'
    ];

    for (const table of tables) {
      try {
        await client.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
        console.log(`✅ Table ${table} supprimée (si elle existait)`);
      } catch (error) {
        console.log(`⚠️  Erreur suppression ${table}:`, error.message);
      }
    }

    console.log('\n✅ Nettoyage terminé ! Vous pouvez maintenant relancer:');
    console.log('   npm run migrate\n');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

fixMigration();
