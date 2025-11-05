import { queryAll } from '../lib/db.js';

async function checkStructure() {
  try {
    console.log('?? Structure de la table users:\n');

    const columns = await queryAll(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);

    console.log('Colonnes disponibles:');
    columns.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });

    console.log('\n?? Premier utilisateur:');
    const user = await queryAll('SELECT * FROM users LIMIT 1');
    console.log(user[0]);

    process.exit(0);
  } catch (error) {
    console.error('? Erreur:', error);
    process.exit(1);
  }
}

checkStructure();
