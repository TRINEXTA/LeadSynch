import { log, error, warn } from "../../lib/logger.js";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../../config/db.js';
import { z } from 'zod';

// Schéma de validation Zod pour le login
const loginSchema = z.object({
  email: z.string()
    .email('Format d\'email invalide')
    .min(1, 'Email requis')
    .max(255, 'Email trop long')
    .transform(val => val.toLowerCase().trim()),
  password: z.string()
    .min(1, 'Mot de passe requis')
    .max(128, 'Mot de passe trop long')
});

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validation des inputs avec Zod
    const validationResult = loginSchema.safeParse(req.body);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(e => e.message).join(', ');
      return res.status(400).json({ error: errors });
    }

    const { email, password } = validationResult.data;

    // Chercher l'utilisateur
    const { rows } = await db.query(
      `SELECT u.*, t.name as tenant_name
       FROM users u
       LEFT JOIN tenants t ON u.tenant_id = t.id
       WHERE u.email = $1`,
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    const user = rows[0];

    if (!user.is_active) {
      return res.status(401).json({ error: 'Compte désactivé' });
    }

    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    // Mettre à jour last_login
    await db.query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    // Générer le token JWT
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

    log('✅ Login successful:', email);

    // ✅ SÉCURITÉ : Envoi du token via Cookie HttpOnly
    // Le cookie n'est pas accessible via JavaScript (protection contre XSS)
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // HTTPS uniquement en prod
      sameSite: 'strict', // Protection CSRF
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
      path: '/'
    });

    return res.json({
      success: true,
      // 🔒 Token toujours renvoyé pour rétrocompatibilité (phase de transition)
      // À terme, supprimer cette ligne une fois le frontend entièrement migré
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

  } catch (err) {
    error('Login error:', err.message);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

export default handler;