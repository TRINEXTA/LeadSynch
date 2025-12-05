import { log, error, warn } from "../lib/logger.js";
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    // Si tu utilises des cookies pour l'auth, les supprimer ici
    res.clearCookie('token');
    
    return res.json({ 
      success: true, 
      message: 'Déconnexion réussie' 
    });
  } catch (error) {
    error('Logout error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}