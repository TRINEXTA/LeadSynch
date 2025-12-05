import { log, error, warn } from "../lib/logger.js";
import { queryAll } from '../lib/db.js';

async function checkTeamMembers() {
  try {
    log('?? Vérification table team_members:\n');

    const columns = await queryAll(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'team_members'
      ORDER BY ordinal_position
    `);

    if (columns.length === 0) {
      log('? Table team_members n\'existe pas !');
      log('\n?? On va la créer !');
    } else {
      log('? Colonnes de la table team_members:');
      columns.forEach(col => {
        log(`  - ${col.column_name} (${col.data_type})`);
      });
    }

    process.exit(0);
  } catch (error) {
    error('? Erreur:', error.message);
    process.exit(1);
  }
}

checkTeamMembers();
