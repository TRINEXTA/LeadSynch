import { queryAll } from '../lib/db.js';

async function checkColumns() {
  try {
    console.log('?? Colonnes de la table leads:\n');

    const columns = await queryAll(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'leads'
      ORDER BY ordinal_position
    `);

    console.log('Colonnes disponibles:');
    columns.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('? Erreur:', error);
    process.exit(1);
  }
}

checkColumns();
