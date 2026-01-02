import { log, error, warn } from "./lib/logger.js";
// ================================================================
// Script : Fix migration - Supprime les anciennes tables
// Usage : node fix-migration.js
// ================================================================

import pg from 'pg';
import dotenv from 'dotenv';
import { getSSLConfig } from './lib/ssl-config.js';

dotenv.config();

const { Client } = pg;

async function fixMigration() {
  const client = new Client({
    connectionString: process.env.POSTGRES_URL,
    ssl: getSSLConfig()
  });

  try {
    await client.connect();
    log('✅ Connecté à Neon');

    log('\n⚠️  Suppression des anciennes tables pour migration propre...\n');

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
        log(`✅ Table ${table} supprimée (si elle existait)`);
      } catch (error) {
        log(`⚠️  Erreur suppression ${table}:`, error.message);
      }
    }

    log('\n✅ Nettoyage terminé ! Vous pouvez maintenant relancer:');
    log('   npm run migrate\n');

  } catch (error) {
    error('❌ Erreur:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

fixMigration();
