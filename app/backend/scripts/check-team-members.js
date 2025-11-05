import { queryAll } from '../lib/db.js';

async function checkTeamMembers() {
  try {
    console.log('?? Vérification table team_members:\n');

    const columns = await queryAll(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'team_members'
      ORDER BY ordinal_position
    `);

    if (columns.length === 0) {
      console.log('? Table team_members n\'existe pas !');
      console.log('\n?? On va la créer !');
    } else {
      console.log('? Colonnes de la table team_members:');
      columns.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type})`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('? Erreur:', error.message);
    process.exit(1);
  }
}

checkTeamMembers();
