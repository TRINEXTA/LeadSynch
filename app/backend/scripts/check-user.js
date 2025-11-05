import { queryAll } from '../lib/db.js';

async function checkUser() {
  try {
    console.log('?? Recherche de ton compte...\n');

    const users = await queryAll(
      `SELECT id, email, role, tenant_id, created_at 
       FROM users 
       WHERE email = 'vprince@trinexta.fr'`
    );

    if (users.length > 0) {
      console.log('? Compte trouvé:');
      console.log(users[0]);
    } else {
      console.log('? Aucun compte trouvé avec cet email !');
    }

    process.exit(0);
  } catch (error) {
    console.error('? Erreur:', error);
    process.exit(1);
  }
}

checkUser();
