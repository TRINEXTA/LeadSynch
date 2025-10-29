import { authMiddleware } from '../../middleware/auth.js';
import { queryOne } from '../../lib/db.js';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    // Get full user data from database
    const user = await queryOne(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.role, 
              u.phone, u.avatar_url, u.last_login, u.created_at,
              t.id as tenant_id, t.name as tenant_name, t.plan as tenant_plan
       FROM users u
       JOIN tenants t ON u.tenant_id = t.id
       WHERE u.id = $1 AND u.is_active = true`,
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({ 
        error: 'Utilisateur non trouvé' 
      });
    }

    return res.status(200).json({
      success: true,
      user
    });

  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({ 
      error: 'Erreur serveur' 
    });
  }
}

export default authMiddleware(handler);
