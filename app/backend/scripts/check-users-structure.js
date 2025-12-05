import { log, error, warn } from "../lib/logger.js";
import { queryAll } from '../lib/db.js';

async function checkStructure() {
  try {
    log('?? Structure de la table users:\n');

    const columns = await queryAll(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);

    log('Colonnes disponibles:');
    columns.forEach(col => {
      log(`  - ${col.column_name} (${col.data_type})`);
    });

    log('\n?? Premier utilisateur:');
    const user = await queryAll('SELECT * FROM users LIMIT 1');
    log(user[0]);

    process.exit(0);
  } catch (error) {
    error('? Erreur:', error);
    process.exit(1);
  }
}

checkStructure();
