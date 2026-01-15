import { log, error as logError, warn } from "../../lib/logger.js";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    // ✅ SÉCURITÉ : Supprimer le cookie avec les mêmes options que lors de la création
    // Important : les options doivent correspondre pour que le navigateur supprime le cookie
    res.clearCookie('token', {
      httpOnly: true,
      secure: true, // Doit correspondre au login
      sameSite: 'none', // Doit correspondre au login (cross-domain)
      path: '/'
    });

    log('✅ Logout successful');

    return res.json({
      success: true,
      message: 'Déconnexion réussie'
    });
  } catch (err) {
    logError('Logout error:', err.message);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}