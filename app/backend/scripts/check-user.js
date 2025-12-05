import { log, error, warn } from "../lib/logger.js";
import { queryAll } from '../lib/db.js';

async function checkUser() {
  try {
    log('?? Recherche de ton compte...\n');

    const users = await queryAll(
      `SELECT id, email, role, tenant_id, created_at 
       FROM users 
       WHERE email = 'vprince@trinexta.fr'`
    );

    if (users.length > 0) {
      log('? Compte trouvé:');
      log(users[0]);
    } else {
      log('? Aucun compte trouvé avec cet email !');
    }

    process.exit(0);
  } catch (error) {
    error('? Erreur:', error);
    process.exit(1);
  }
}

checkUser();
