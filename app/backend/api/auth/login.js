import { log, error, warn } from "../lib/logger.js";
﻿import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../../config/db.js';

async function handler(req, res) {
  log('========== LOGIN REQUEST ==========');
  log('Method:', req.method);
  log('Origin:', req.headers.origin);
  log('Content-Type:', req.headers['content-type']);
  // ⚠️ SÉCURITÉ: Ne jamais logger le body complet (contient le mot de passe)
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;
    log('📧 Tentative de connexion pour:', email);

    if (!email || !password) {
      log('ERREUR: Email ou mot de passe manquant');
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    // Chercher l'utilisateur avec first_name, last_name et is_super_admin
    const { rows } = await db.query(
      `SELECT u.*, t.name as tenant_name
       FROM users u
       LEFT JOIN tenants t ON u.tenant_id = t.id
       WHERE u.email = $1`,
      [email.toLowerCase()]
    );

    log('Utilisateur trouve:', rows.length > 0 ? 'OUI' : 'NON');

    if (rows.length === 0) {
      log('ERREUR: Utilisateur non trouve');
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    const user = rows[0];
    log('User ID:', user.id);
    log('User role:', user.role);
    log('User active:', user.is_active);
    log('User name:', user.first_name, user.last_name);

    if (!user.is_active) {
      log('ERREUR: Compte desactive');
      return res.status(401).json({ error: 'Compte désactivé' });
    }

    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      log('ERREUR: Mot de passe incorrect');
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    // ✅ CORRECTION : Mettre à jour last_login
    await db.query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );
    log('✅ last_login mis à jour');

    // Générer le token JWT avec first_name, last_name et is_super_admin
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        tenant_id: user.tenant_id,
        first_name: user.first_name,
        last_name: user.last_name,
        is_super_admin: user.is_super_admin || false
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    log('Token genere avec succes');
    log('========== LOGIN SUCCESS ==========');

    // Retourner first_name, last_name et is_super_admin
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
        tenant_name: user.tenant_name,
        is_super_admin: user.is_super_admin || false
      }
    });

  } catch (error) {
    error('========== LOGIN ERROR ==========');
    error('Error:', error);
    error('Stack:', error.stack);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

export default handler;