import { authMiddleware } from '../middleware/auth.js';
import { queryAll, queryOne, execute } from '../lib/db.js';
import { hashPassword } from '../lib/auth.js';
import { sendTemporaryPassword } from '../lib/email.js';
import { z } from 'zod';
import crypto from 'crypto';

const createUserSchema = z.object({
  email: z.string().email('Email invalide'),
  first_name: z.string().min(1, 'Prénom requis'),
  last_name: z.string().min(1, 'Nom requis'),
  role: z.enum(['admin', 'manager', 'user', 'commercial']).default('user'), // ✅ AJOUT commercial
  phone: z.string().optional(),
  team_id: z.string().optional().nullable()
});

async function handler(req, res) {
  const { method } = req;

  try {
    // GET - List users
    if (method === 'GET') {
      if (process.env.NODE_ENV !== 'production') {
        console.log('🔍 GET /api/users - User:', req.user.email, 'Tenant:', req.user.tenant_id);
      }

      const users = await queryAll(
        `SELECT u.id, u.email, u.first_name, u.last_name, u.role,
                u.phone, u.avatar_url, u.is_active, u.last_login, u.created_at,
                t.name as tenant_name
         FROM users u
         LEFT JOIN tenants t ON u.tenant_id = t.id
         WHERE u.tenant_id = $1
         ORDER BY u.created_at DESC`,
        [req.user.tenant_id]
      );

      if (process.env.NODE_ENV !== 'production') {
        console.log('✅ Users trouvés:', users.length);
      }

      return res.status(200).json({
        success: true,
        users
      });
    }

    // POST - Create user
    if (method === 'POST') {
      if (!['admin', 'manager'].includes(req.user.role)) {
        return res.status(403).json({
          error: 'Permissions insuffisantes'
        });
      }

      const data = createUserSchema.parse(req.body);
      const team_id = data.team_id && data.team_id !== '' ? data.team_id : null;

      const existing = await queryOne(
        'SELECT id FROM users WHERE email = $1',
        [data.email]
      );

      if (existing) {
        return res.status(400).json({
          error: 'Email déjà utilisé'
        });
      }

      const tempPassword = crypto.randomBytes(4).toString('hex');
      // Note: Le mot de passe temporaire sera envoyé par email à l'utilisateur

      const password_hash = await hashPassword(tempPassword);

      const newUser = await queryOne(
        `INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role, phone, requires_password_change)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true)
         RETURNING id, email, first_name, last_name, role, phone, created_at`,
        [
          req.user.tenant_id,
          data.email,
          password_hash,
          data.first_name,
          data.last_name,
          data.role,
          data.phone || null
        ]
      );

      if (team_id) {
        await execute(
          `INSERT INTO team_members (id, team_id, user_id, role, joined_at)
           VALUES (gen_random_uuid(), $1, $2, 'member', NOW())`,   
          [team_id, newUser.id]
        );
      }

      try {
        await sendTemporaryPassword(data.email, data.first_name, tempPassword);
        if (process.env.NODE_ENV !== 'production') {
          console.log(`✅ Email envoyé à ${data.email}`);
        }
      } catch (emailError) {
        console.error('⚠️ Erreur envoi email:', emailError.message);
      }

      return res.status(201).json({
        success: true,
        user: newUser,
        message: 'Utilisateur créé avec succès !'
      });
    }

    // ✅ PUT - Update user
    if (method === 'PUT') {
      const userId = req.url.split('/').pop();
      
      if (!['admin', 'manager'].includes(req.user.role)) {
        return res.status(403).json({
          error: 'Permissions insuffisantes'
        });
      }

      const { first_name, last_name, role, phone, team_id } = req.body;

      if (!first_name || !last_name || !role) {
        return res.status(400).json({
          error: 'Prénom, nom et rôle requis'
        });
      }

      // Vérifier que le rôle est valide
      const validRoles = ['admin', 'manager', 'user', 'commercial'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          error: 'Rôle invalide'
        });
      }

      const updatedUser = await queryOne(
        `UPDATE users 
         SET first_name = $1, last_name = $2, role = $3, phone = $4, updated_at = NOW()
         WHERE id = $5 AND tenant_id = $6
         RETURNING id, email, first_name, last_name, role, phone, is_active, created_at`,
        [first_name, last_name, role, phone || null, userId, req.user.tenant_id]
      );

      if (!updatedUser) {
        return res.status(404).json({
          error: 'Utilisateur non trouvé'
        });
      }

      if (process.env.NODE_ENV !== 'production') {
        console.log('✅ User modifié:', updatedUser.id);
      }

      return res.status(200).json({
        success: true,
        user: updatedUser,
        message: 'Utilisateur modifié avec succès'
      });
    }

    // PATCH - Bloquer/Débloquer ou Forcer changement de mot de passe
    if (method === 'PATCH') {
      const userId = req.url.split('/')[3]; // /api/users/{userId}/action
      const action = req.url.split('/')[4]; // block, unblock, force-password-change

      if (!['admin', 'manager'].includes(req.user.role)) {
        return res.status(403).json({
          error: 'Permissions insuffisantes'
        });
      }

      if (userId === req.user.id && action === 'block') {
        return res.status(400).json({
          error: 'Vous ne pouvez pas bloquer votre propre compte'
        });
      }

      let updatedUser;

      if (action === 'block') {
        updatedUser = await queryOne(
          `UPDATE users
           SET is_active = false, updated_at = NOW()
           WHERE id = $1 AND tenant_id = $2
           RETURNING id, email, first_name, last_name, is_active`,
          [userId, req.user.tenant_id]
        );

        if (!updatedUser) {
          return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        if (process.env.NODE_ENV !== 'production') {
          console.log('🔴 User bloqué:', updatedUser.id);
        }
        return res.status(200).json({
          success: true,
          user: updatedUser,
          message: 'Utilisateur bloqué avec succès'
        });
      }

      if (action === 'unblock') {
        updatedUser = await queryOne(
          `UPDATE users
           SET is_active = true, updated_at = NOW()
           WHERE id = $1 AND tenant_id = $2
           RETURNING id, email, first_name, last_name, is_active`,
          [userId, req.user.tenant_id]
        );

        if (!updatedUser) {
          return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        if (process.env.NODE_ENV !== 'production') {
          console.log('🟢 User débloqué:', updatedUser.id);
        }
        return res.status(200).json({
          success: true,
          user: updatedUser,
          message: 'Utilisateur débloqué avec succès'
        });
      }

      if (action === 'force-password-change') {
        updatedUser = await queryOne(
          `UPDATE users
           SET requires_password_change = true, updated_at = NOW()
           WHERE id = $1 AND tenant_id = $2
           RETURNING id, email, first_name, last_name, requires_password_change`,
          [userId, req.user.tenant_id]
        );

        if (!updatedUser) {
          return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        if (process.env.NODE_ENV !== 'production') {
          console.log('🔐 Changement de mot de passe forcé pour:', updatedUser.id);
        }
        return res.status(200).json({
          success: true,
          user: updatedUser,
          message: 'L\'utilisateur devra changer son mot de passe à sa prochaine connexion'
        });
      }

      return res.status(400).json({
        error: 'Action invalide',
        message: 'Actions valides: block, unblock, force-password-change'
      });
    }

    // DELETE - Delete user
    if (method === 'DELETE') {
      const userId = req.url.split('/').pop();

      if (req.user.role !== 'admin') {
        return res.status(403).json({
          error: 'Seul un admin peut supprimer un utilisateur'
        });
      }

      if (userId === req.user.id) {
        return res.status(400).json({
          error: 'Vous ne pouvez pas supprimer votre propre compte'
        });
      }

      await execute(
        'DELETE FROM users WHERE id = $1 AND tenant_id = $2',
        [userId, req.user.tenant_id]
      );

      return res.status(200).json({
        success: true,
        message: 'Utilisateur supprimé'
      });
    }

    return res.status(405).json({ error: 'Méthode non autorisée' });

  } catch (error) {
    console.error('❌ Users API error:', error);
    console.error('Stack:', error.stack);

    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Données invalides',
        details: error.errors
      });
    }

    return res.status(500).json({
      error: 'Erreur serveur',
      message: error.message
    });
  }
}

export default authMiddleware(handler);