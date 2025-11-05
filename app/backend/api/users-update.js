import { authMiddleware } from '../middleware/auth.js';
import { queryOne, execute } from '../lib/db.js';

async function handler(req, res) {
  const { method } = req;
  const userId = req.url.split('/')[1];

  try {
    // PUT - Mettre à jour un utilisateur
    if (method === 'PUT') {
      const { email, first_name, last_name, role, phone, team_id } = req.body;

      // Vérifier que l'utilisateur existe
      const existingUser = await queryOne(
        'SELECT id FROM users WHERE id = $1 AND tenant_id = $2', 
        [userId, req.user.tenant_id]
      );
      
      if (!existingUser) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }

      // Vérifier si l'email existe déjà (sauf pour cet utilisateur)
      if (email) {
        const emailExists = await queryOne(
          'SELECT id FROM users WHERE email = $1 AND id != $2', 
          [email, userId]
        );
        
        if (emailExists) {
          return res.status(400).json({ error: 'Cet email est déjà utilisé' });
        }
      }

      // Mettre à jour l'utilisateur
      await execute(
        `UPDATE users 
         SET email = $1, first_name = $2, last_name = $3, role = $4, phone = $5, team_id = $6, updated_at = NOW()
         WHERE id = $7 AND tenant_id = $8`,
        [email, first_name, last_name, role, phone || null, team_id || null, userId, req.user.tenant_id]
      );

      const updatedUser = await queryOne(
        `SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.phone, u.is_active, u.team_id, t.name as tenant_name
         FROM users u 
         LEFT JOIN tenants t ON u.tenant_id = t.id 
         WHERE u.id = $1`,
        [userId]
      );

      console.log('✅ Utilisateur mis à jour:', userId);

      return res.json({ 
        success: true, 
        message: 'Utilisateur mis à jour avec succès',
        user: updatedUser 
      });
    }

    // PATCH - Activer/Désactiver un utilisateur
    if (method === 'PATCH') {
      const user = await queryOne(
        'SELECT is_active FROM users WHERE id = $1 AND tenant_id = $2', 
        [userId, req.user.tenant_id]
      );
      
      if (!user) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }

      const newStatus = !user.is_active;
      await execute(
        'UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2', 
        [newStatus, userId]
      );

      console.log(`✅ Utilisateur ${newStatus ? 'activé' : 'désactivé'}:`, userId);

      return res.json({ 
        success: true, 
        message: `Utilisateur ${newStatus ? 'activé' : 'désactivé'} avec succès`,
        is_active: newStatus
      });
    }

    return res.status(405).json({ error: 'Méthode non autorisée' });

  } catch (error) {
    console.error('Users update API error:', error);
    return res.status(500).json({
      error: 'Erreur serveur',
      message: error.message
    });
  }
}

export default authMiddleware(handler);
