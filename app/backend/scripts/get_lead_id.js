import { log, error, warn } from "../lib/logger.js";
﻿import db from '../lib/db.js';

async function getLeadId() {
  try {
    const result = await db.queryOne(
      "SELECT id, email, company_name FROM leads WHERE email = $1",
      ['valous_price@yahoo.fr']
    );
    
    if (result) {
      log('\n✅ Lead trouvé !');
      log('ID:', result.id);
      log('Email:', result.email);
      log('Company:', result.company_name);
      log('\n🔗 URL de test:');
      log(`http://localhost:5173/unsubscribe/${result.id}`);
    } else {
      log('❌ Lead introuvable');
    }
    
    process.exit(0);
  } catch (error) {
    error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

getLeadId();
