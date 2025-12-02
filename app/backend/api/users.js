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
      console.log('🔍 GET /api/users - User:', req.user.email, 'Role:', req.user.role, 'Tenant:', req.user.tenant_id);

      const userRole = req.user.role;
      const userId = req.user.id;
      const isSuperAdmin = req.user.is_super_admin === true;

      let users = [];

      // Super admin ou admin : voir tous les utilisateurs du tenant
      if (isSuperAdmin || userRole === 'admin') {
        users = await queryAll(
          `SELECT u.id, u.email, u.first_name, u.last_name, u.role,
                  u.phone, u.avatar_url, u.is_active, u.last_login, u.created_at,
                  u.is_super_admin,
                  t.name as tenant_name
           FROM users u
           LEFT JOIN tenants t ON u.tenant_id = t.id
           WHERE u.tenant_id = $1
           ORDER BY u.created_at DESC`,
          [req.user.tenant_id]
        );
        console.log('✅ Admin - tous les users:', users.length);
      }
      // Manager : voir uniquement les membres de ses équipes (où il est manager)
      else if (userRole === 'manager') {
        users = await queryAll(
          `SELECT DISTINCT u.id, u.email, u.first_name, u.last_name, u.role,
                  u.phone, u.avatar_url, u.is_active, u.last_login, u.created_at,
                  u.is_super_admin,
                  t.name as tenant_name
           FROM users u
           LEFT JOIN tenants t ON u.tenant_id = t.id
           LEFT JOIN team_members tm ON u.id = tm.user_id
           LEFT JOIN teams te ON tm.team_id = te.id
           WHERE u.tenant_id = $1
             AND (
               -- Membres de ses équipes (où il est manager)
               te.manager_id = $2
               -- Ou lui-même
               OR u.id = $2
             )
             -- IMPORTANT : Ne jamais montrer les admins ou super admins aux managers
             AND u.role NOT IN ('admin')
             AND (u.is_super_admin IS NULL OR u.is_super_admin = false)
           ORDER BY u.created_at DESC`,
          [req.user.tenant_id, userId]
        );
        console.log('✅ Manager - membres équipe uniquement:', users.length);
      }
      // User ou commercial : voir uniquement eux-mêmes
      else {
        users = await queryAll(
          `SELECT u.id, u.email, u.first_name, u.last_name, u.role,
                  u.phone, u.avatar_url, u.is_active, u.last_login, u.created_at,
                  t.name as tenant_name
           FROM users u
           LEFT JOIN tenants t ON u.tenant_id = t.id
           WHERE u.id = $1`,
          [userId]
        );
        console.log('✅ User - lui-même uniquement:', users.length);
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
        console.log(`✅ Email envoyé à ${data.email}`);
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

      // 🔒 SÉCURITÉ : Vérifier les permissions sur l'utilisateur cible
      const targetUser = await queryOne(
        'SELECT id, role, is_super_admin FROM users WHERE id = $1 AND tenant_id = $2',
        [userId, req.user.tenant_id]
      );

      if (!targetUser) {
        return res.status(404).json({
          error: 'Utilisateur non trouvé'
        });
      }

      // 🔒 Les managers ne peuvent PAS modifier les admins ou super admins
      if (req.user.role === 'manager') {
        if (targetUser.role === 'admin' || targetUser.is_super_admin === true) {
          console.log(`🚫 Manager ${req.user.email} tentative modification admin/superadmin ${userId}`);
          return res.status(403).json({
            error: 'Accès refusé',
            message: 'Vous ne pouvez pas modifier un compte administrateur'
          });
        }

        // Vérifier que l'utilisateur cible fait partie de l'équipe du manager
        const isInTeam = await queryOne(
          `SELECT 1 FROM team_members tm
           JOIN teams t ON tm.team_id = t.id
           WHERE tm.user_id = $1 AND t.manager_id = $2`,
          [userId, req.user.id]
        );

        if (!isInTeam && userId !== req.user.id) {
          console.log(`🚫 Manager ${req.user.email} tentative modification user hors équipe ${userId}`);
          return res.status(403).json({
            error: 'Accès refusé',
            message: 'Cet utilisateur ne fait pas partie de votre équipe'
          });
        }
      }

      const { first_name, last_name, role, phone, team_id } = req.body;

      if (!first_name || !last_name || !role) {
        return res.status(400).json({
          error: 'Prénom, nom et rôle requis'
        });
      }

      // 🔒 Les managers ne peuvent PAS promouvoir quelqu'un en admin
      if (req.user.role === 'manager' && role === 'admin') {
        return res.status(403).json({
          error: 'Accès refusé',
          message: 'Vous ne pouvez pas promouvoir un utilisateur en administrateur'
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

      console.log('✅ User modifié:', updatedUser.id);

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

      // 🔒 SÉCURITÉ : Vérifier les permissions sur l'utilisateur cible
      const targetUser = await queryOne(
        'SELECT id, role, is_super_admin FROM users WHERE id = $1 AND tenant_id = $2',
        [userId, req.user.tenant_id]
      );

      if (!targetUser) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }

      // 🔒 Les managers ne peuvent PAS bloquer/modifier les admins ou super admins
      if (req.user.role === 'manager') {
        if (targetUser.role === 'admin' || targetUser.is_super_admin === true) {
          console.log(`🚫 Manager ${req.user.email} tentative ${action} sur admin/superadmin ${userId}`);
          return res.status(403).json({
            error: 'Accès refusé',
            message: 'Vous ne pouvez pas effectuer cette action sur un compte administrateur'
          });
        }
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

        console.log('🔴 User bloqué:', updatedUser.id);
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

        console.log('🟢 User débloqué:', updatedUser.id);
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

        console.log('🔐 Changement de mot de passe forcé pour:', updatedUser.id);
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

    // DELETE - Delete user (avec dispatch des leads)
    if (method === 'DELETE') {
      const userId = req.url.split('/').pop();
      const { reassign_to } = req.body; // ID du commercial qui récupère les leads, ou null pour admin

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

      // Vérifier que l'utilisateur existe
      const userToDelete = await queryOne(
        'SELECT id, email, first_name, last_name FROM users WHERE id = $1 AND tenant_id = $2',
        [userId, req.user.tenant_id]
      );

      if (!userToDelete) {
        return res.status(404).json({
          error: 'Utilisateur non trouvé'
        });
      }

      // Compter les leads assignés
      const leadsCount = await queryOne(
        'SELECT COUNT(*) as count FROM leads WHERE assigned_to = $1 AND tenant_id = $2',
        [userId, req.user.tenant_id]
      );

      const totalLeads = parseInt(leadsCount.count);

      console.log(`🔄 Suppression utilisateur ${userToDelete.email}: ${totalLeads} leads à dispatcher`);

      // DISPATCHER LES LEADS
      if (totalLeads > 0) {
        if (reassign_to) {
          // Vérifier que le commercial de réassignation existe
          const targetUser = await queryOne(
            'SELECT id, role FROM users WHERE id = $1 AND tenant_id = $2',
            [reassign_to, req.user.tenant_id]
          );

          if (!targetUser) {
            return res.status(400).json({
              error: 'Utilisateur de réassignation introuvable'
            });
          }

          // Dispatcher vers un commercial spécifique
          await execute(
            `UPDATE leads
             SET assigned_to = $1, updated_at = NOW()
             WHERE assigned_to = $2 AND tenant_id = $3`,
            [reassign_to, userId, req.user.tenant_id]
          );

          console.log(`✅ ${totalLeads} leads transférés vers ${targetUser.id}`);
        } else {
          // Dispatcher vers les managers/admins du tenant
          const managers = await queryAll(
            `SELECT id FROM users
             WHERE tenant_id = $1
             AND role IN ('admin', 'manager')
             AND is_active = true
             AND id != $2
             ORDER BY RANDOM()
             LIMIT 1`,
            [req.user.tenant_id, userId]
          );

          if (managers.length > 0) {
            await execute(
              `UPDATE leads
               SET assigned_to = $1, updated_at = NOW()
               WHERE assigned_to = $2 AND tenant_id = $3`,
              [managers[0].id, userId, req.user.tenant_id]
            );

            console.log(`✅ ${totalLeads} leads transférés vers manager ${managers[0].id}`);
          } else {
            // Aucun manager → désassigner les leads
            await execute(
              `UPDATE leads
               SET assigned_to = NULL, updated_at = NOW()
               WHERE assigned_to = $1 AND tenant_id = $2`,
              [userId, req.user.tenant_id]
            );

            console.log(`⚠️ ${totalLeads} leads désassignés (aucun manager disponible)`);
          }
        }
      }

      // Retirer des campaign_assignments
      await execute(
        'DELETE FROM campaign_assignments WHERE user_id = $1',
        [userId]
      );

      // Retirer des team_members
      await execute(
        'DELETE FROM team_members WHERE user_id = $1',
        [userId]
      );

      // Supprimer l'utilisateur
      await execute(
        'DELETE FROM users WHERE id = $1 AND tenant_id = $2',
        [userId, req.user.tenant_id]
      );

      return res.status(200).json({
        success: true,
        message: 'Utilisateur supprimé',
        leads_dispatched: totalLeads
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