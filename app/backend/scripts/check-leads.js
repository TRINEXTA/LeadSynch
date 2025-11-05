import { queryAll } from '../lib/db.js';

async function checkLeads() {
  try {
    console.log('?? Vérification des bases et leads...\n');

    // 1. Vérifier les bases
    const databases = await queryAll('SELECT * FROM lead_databases ORDER BY id');
    console.log(`? ${databases.length} base(s) de données trouvée(s):\n`);
    
    for (const db of databases) {
      console.log(`- ${db.name} (ID: ${db.id})`);
      
      // Compter les leads
      const count = await queryAll(
        'SELECT COUNT(*) as count FROM leads WHERE database_id = $1',
        [db.id]
      );
      
      const leadsCount = count[0]?.count || 0;
      console.log(`  ? ${leadsCount} leads trouvés\n`);
    }

    // 2. Total des leads
    const totalLeads = await queryAll('SELECT COUNT(*) as count FROM leads');
    console.log(`\n?? TOTAL : ${totalLeads[0]?.count || 0} leads dans toute la DB\n`);

    process.exit(0);
  } catch (error) {
    console.error('? Erreur:', error);
    process.exit(1);
  }
}

checkLeads();
