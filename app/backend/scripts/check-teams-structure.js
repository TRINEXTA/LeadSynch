import { queryAll } from '../lib/db.js';

async function checkTeams() {
  try {
    console.log('?? Structure de la table teams:\n');

    const columns = await queryAll(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'teams'
      ORDER BY ordinal_position
    `);

    if (columns.length === 0) {
      console.log('? Table teams n\'existe pas !');
      console.log('\n?? Il faut la créer !');
    } else {
      console.log('? Colonnes de la table teams:');
      columns.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type})`);
      });

      console.log('\n?? Équipes existantes:');
      const teams = await queryAll('SELECT * FROM teams LIMIT 5');
      console.log(teams);
    }

    process.exit(0);
  } catch (error) {
    console.error('? Erreur:', error.message);
    process.exit(1);
  }
}

checkTeams();
