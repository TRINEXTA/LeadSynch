import db from '../lib/db.js';

async function getLeadId() {
  try {
    const result = await db.queryOne(
      "SELECT id, email, company_name FROM leads WHERE email = $1",
      ['valous_price@yahoo.fr']
    );
    
    if (result) {
      console.log('\n✅ Lead trouvé !');
      console.log('ID:', result.id);
      console.log('Email:', result.email);
      console.log('Company:', result.company_name);
      console.log('\n🔗 URL de test:');
      console.log(`http://localhost:5173/unsubscribe/${result.id}`);
    } else {
      console.log('❌ Lead introuvable');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

getLeadId();
