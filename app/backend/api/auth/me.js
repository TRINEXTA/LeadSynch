import { authMiddleware } from '../../middleware/auth.js';
import { queryOne } from '../../lib/db.js';

async function handler(req, res) {
  try {
    const user = await queryOne(
      'SELECT id, email, first_name, last_name, role, tenant_id, avatar_url FROM users WHERE id = $1',
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    return res.json({ success: true, user });
  } catch (error) {
    console.error('Me error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

export default authMiddleware(handler);
