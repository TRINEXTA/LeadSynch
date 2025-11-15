import { execute } from '../lib/db.js';
import bcrypt from 'bcryptjs';

async function resetPassword() {
  try {
    const newPassword = 'password123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await execute(
      `UPDATE users 
       SET password_hash = $1 
       WHERE email = 'vprince@trinexta.fr'`,
      [hashedPassword]
    );

    console.log('✅ Mot de passe réinitialisé !');
    console.log(`📧 Email: vprince@trinexta.fr`);
    // ⚠️ SÉCURITÉ: Ne jamais logger les mots de passe en production
    // Ce script est uniquement pour le développement local
    if (process.env.NODE_ENV !== 'production') {
      console.log(`🔐 Nouveau mot de passe: ${newPassword}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('? Erreur:', error);
    process.exit(1);
  }
}

resetPassword();
