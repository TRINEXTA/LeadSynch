import { log, error, warn } from "../../lib/logger.js";
﻿import { queryOne, execute } from '../../lib/db.js';
import { hashPassword } from '../../lib/auth.js';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '../../lib/email.js';

export default async function handler(req, res) {
  const { method } = req;

  try {
    // POST /api/auth/reset-password - Demander un lien de réinitialisation
    if (method === 'POST' && !req.body.token) {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email requis' });
      }

      const user = await queryOne('SELECT id, first_name FROM users WHERE email = $1', [email]);

      if (!user) {
        // Ne pas révéler si l'email existe ou non (sécurité)
        return res.json({ 
          success: true, 
          message: 'Si cet email existe, un lien de réinitialisation a été envoyé.' 
        });
      }

      // Générer un token de réinitialisation
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 heure

      // Sauvegarder le token
      await execute(
        'UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE id = $3',
        [resetToken, resetTokenExpiry, user.id]
      );

      // Envoyer l'email
      await sendPasswordResetEmail(email, user.first_name, resetToken);

      return res.json({ 
        success: true, 
        message: 'Un email de réinitialisation a été envoyé.' 
      });
    }

    // POST /api/auth/reset-password - Réinitialiser le mot de passe avec le token
    if (method === 'POST' && req.body.token) {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ error: 'Token et nouveau mot de passe requis' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
      }

      // Vérifier le token
      const user = await queryOne(
        'SELECT id FROM users WHERE reset_token = $1 AND reset_token_expiry > NOW()',
        [token]
      );

      if (!user) {
        return res.status(400).json({ error: 'Token invalide ou expiré' });
      }

      // Mettre à jour le mot de passe
      const passwordHash = await hashPassword(newPassword);
      await execute(
        'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expiry = NULL, requires_password_change = false WHERE id = $2',
        [passwordHash, user.id]
      );

      return res.json({ 
        success: true, 
        message: 'Mot de passe réinitialisé avec succès' 
      });
    }

    return res.status(405).json({ error: 'Méthode non autorisée' });

  } catch (error) {
    error('Reset password error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}
