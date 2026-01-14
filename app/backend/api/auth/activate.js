import { log, error } from "../../lib/logger.js";
import { queryOne, execute } from '../../lib/db.js';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Token manquant' });
  }

  try {
    // Vérification du token JWT signé contenant l'ID user
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(400).json({ error: 'Lien d\'activation invalide ou expiré' });
    }

    const userId = decoded.id;

    if (!userId) {
      return res.status(400).json({ error: 'Token invalide' });
    }

    // Vérifier si l'utilisateur existe
    const user = await queryOne(
      'SELECT id, is_active, email FROM users WHERE id = $1',
      [userId]
    );

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    if (user.is_active) {
      return res.json({ success: true, message: 'Compte déjà activé' });
    }

    // Activer le compte
    await execute(
      'UPDATE users SET is_active = true, email_verified_at = NOW(), updated_at = NOW() WHERE id = $1',
      [userId]
    );

    log(`✅ Compte activé pour : ${user.email}`);

    return res.json({
      success: true,
      message: 'Compte activé avec succès. Vous pouvez maintenant vous connecter.'
    });

  } catch (err) {
    error('❌ Erreur activation:', err);
    return res.status(500).json({ error: 'Erreur serveur lors de l\'activation' });
  }
}
