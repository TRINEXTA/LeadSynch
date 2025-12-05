import { log, error, warn } from "../lib/logger.js";
import { queryAll } from '../lib/db.js';

async function checkTeams() {
  try {
    log('?? Structure de la table teams:\n');

    const columns = await queryAll(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'teams'
      ORDER BY ordinal_position
    `);

    if (columns.length === 0) {
      log('? Table teams n\'existe pas !');
      log('\n?? Il faut la créer !');
    } else {
      log('? Colonnes de la table teams:');
      columns.forEach(col => {
        log(`  - ${col.column_name} (${col.data_type})`);
      });

      log('\n?? Équipes existantes:');
      const teams = await queryAll('SELECT * FROM teams LIMIT 5');
      log(teams);
    }

    process.exit(0);
  } catch (error) {
    error('? Erreur:', error.message);
    process.exit(1);
  }
}

checkTeams();
