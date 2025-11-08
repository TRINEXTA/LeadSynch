// api/auth/login.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../../config/db.js';

async function handler(req, res) {
  console.log('========== LOGIN REQUEST ==========');
  console.log('Method:', req.method);
  console.log('Origin:', req.headers.origin);
  console.log('Content-Type:', req.headers['content-type']);
  console.log('Body:', JSON.stringify(req.body, null, 2));
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;

    console.log('Email recu:', email);
    console.log('Password length:', password?.length);

    if (!email || !password) {
      console.log('ERREUR: Email ou mot de passe manquant');
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    // Chercher l'utilisateur avec first_name et last_name
    const { rows } = await db.query(
      `SELECT u.*, t.name as tenant_name 
       FROM users u
       LEFT JOIN tenants t ON u.tenant_id = t.id
       WHERE u.email = $1`,
      [email.toLowerCase()]
    );

    console.log('Utilisateur trouve:', rows.length > 0 ? 'OUI' : 'NON');

    if (rows.length === 0) {
      console.log('ERREUR: Utilisateur non trouve');
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    const user = rows[0];
    console.log('User ID:', user.id);
    console.log('User role:', user.role);
    console.log('User active:', user.is_active);
    console.log('User name:', user.first_name, user.last_name);

    if (!user.is_active) {
      console.log('ERREUR: Compte desactive');
      return res.status(401).json({ error: 'Compte désactivé' });
    }

    // Vérifier le mot de passe
    console.log('Verification bcrypt...');
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    console.log('bcrypt.compare result:', isPasswordValid);

    if (!isPasswordValid) {
      console.log('ERREUR: Mot de passe incorrect');
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    // ✅ CORRECTION 1 : Mettre à jour last_login
    await db.query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );
    console.log('✅ last_login mis à jour');

    // Générer le token JWT avec first_name et last_name
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        tenant_id: user.tenant_id,
        first_name: user.first_name,
        last_name: user.last_name
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('Token genere avec succes');
    console.log('========== LOGIN SUCCESS ==========');

    // ✅ CORRECTION 2 : Retourner first_name et last_name
    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        tenant_id: user.tenant_id,
        tenant_name: user.tenant_name
      }
    });

  } catch (error) {
    console.error('========== LOGIN ERROR ==========');
    console.error('Error:', error);
    console.error('Stack:', error.stack);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

export default handler;