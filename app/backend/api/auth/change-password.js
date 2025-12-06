import { log, error, warn } from "../../lib/logger.js";
﻿import { queryOne, execute } from '../../lib/db.js';
import { hashPassword, verifyPassword } from '../../lib/auth.js';
import { authMiddleware } from '../../middleware/auth.js';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        error: 'Mot de passe actuel et nouveau mot de passe requis' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        error: 'Le nouveau mot de passe doit contenir au moins 6 caractères' 
      });
    }

    // Vérifier le mot de passe actuel
    const user = await queryOne(
      'SELECT id, password_hash FROM users WHERE id = $1',
      [req.user.id]
    );

    const isValid = await verifyPassword(currentPassword, user.password_hash);
    
    if (!isValid) {
      return res.status(400).json({ 
        error: 'Mot de passe actuel incorrect' 
      });
    }

    // Mettre à jour le mot de passe
    const newPasswordHash = await hashPassword(newPassword);
    
    await execute(
      `UPDATE users 
       SET password_hash = $1, requires_password_change = false
       WHERE id = $2`,
      [newPasswordHash, req.user.id]
    );

    return res.json({ 
      success: true, 
      message: 'Mot de passe modifié avec succès' 
    });

  } catch (error) {
    error('Change password error:', error);
    return res.status(500).json({ 
      error: 'Erreur lors du changement de mot de passe' 
    });
  }
}

export default authMiddleware(handler);
