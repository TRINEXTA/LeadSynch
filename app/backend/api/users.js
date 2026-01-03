import { log, error, warn } from "../lib/logger.js";
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
  role: z.enum(['admin', 'manager', 'supervisor', 'user', 'commercial']).default('user'),
  phone: z.string().optional(),
  team_id: z.string().optional().nullable(),
  permissions: z.record(z.boolean()).optional(), // Permissions pour les managers
  // Nouveaux champs hiérarchie et commissions
  hierarchical_level: z.string().optional().nullable(),
  commission_rate: z.number().min(0).max(100).optional().default(0),
  team_commission_rate: z.number().min(0).max(100).optional().default(0),
  commission_type: z.enum(['percentage', 'fixed', 'mixed']).optional().default('percentage'),
  base_salary: z.number().optional().nullable()
});

// Permissions par défaut pour un manager (toutes désactivées)
const DEFAULT_MANAGER_PERMISSIONS = {
  view_all_leads: false,
  import_leads: false,
  generate_leads: false,
  create_campaigns: false,
  view_all_campaigns: false,
  email_templates_marketing: false,
  mailing_config: false,
  spam_diagnostic: false,
  test_mailing: false,
  recategorize_ai: false,
  detect_duplicates: false,
  business_config: false,
  manage_all_users: false,
  view_databases: false
};

async function handler(req, res) {
  const { method } = req;

  // Check for /team subpath
  const urlPath = req.url.split('?')[0];
  const isTeamEndpoint = urlPath.includes('/team');

  try {
    // GET /api/users/team - Get team members for current user (manager/admin)
    if (method === 'GET' && isTeamEndpoint) {
      return await getTeamMembers(req, res);
    }

    // GET - List users
    if (method === 'GET') {
      log('🔍 GET /api/users - User:', req.user.email, 'Role:', req.user.role, 'Tenant:', req.user.tenant_id);

      const userRole = req.user.role;
      const userId = req.user.id;
      const isSuperAdmin = req.user.is_super_admin === true;

      let users = [];

      // Super admin ou admin : voir tous les utilisateurs du tenant
      if (isSuperAdmin || userRole === 'admin') {
        users = await queryAll(
          `SELECT u.id, u.email, u.first_name, u.last_name, u.role,
                  u.phone, u.avatar_url, u.is_active, u.last_login, u.created_at,
                  u.is_super_admin, u.permissions,
                  u.hierarchical_level, u.commission_rate, u.team_commission_rate,
                  u.commission_type, u.base_salary, u.department_id,
                  t.name as tenant_name
           FROM users u
           LEFT JOIN tenants t ON u.tenant_id = t.id
           WHERE u.tenant_id = $1
           ORDER BY u.created_at DESC`,
          [req.user.tenant_id]
        );
        log('✅ Admin - tous les users:', users.length);
      }
      // Manager/Supervisor : voir uniquement les membres de ses équipes (où il est manager)
      else if (userRole === 'manager' || userRole === 'supervisor') {
        users = await queryAll(
          `SELECT DISTINCT u.id, u.email, u.first_name, u.last_name, u.role,
                  u.phone, u.avatar_url, u.is_active, u.last_login, u.created_at,
                  u.is_super_admin, u.permissions,
                  u.hierarchical_level, u.commission_rate, u.team_commission_rate,
                  u.commission_type, u.base_salary, u.department_id,
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
        log('✅ Manager - membres équipe uniquement:', users.length);
      }
      // User ou commercial : voir uniquement eux-mêmes
      else {
        users = await queryAll(
          `SELECT u.id, u.email, u.first_name, u.last_name, u.role,
                  u.phone, u.avatar_url, u.is_active, u.last_login, u.created_at,
                  u.hierarchical_level, u.commission_rate, u.team_commission_rate,
                  u.commission_type, u.base_salary,
                  t.name as tenant_name
           FROM users u
           LEFT JOIN tenants t ON u.tenant_id = t.id
           WHERE u.id = $1`,
          [userId]
        );
        log('✅ User - lui-même uniquement:', users.length);
      }

      return res.status(200).json({
        success: true,
        users
      });
    }

    // POST - Create user
    if (method === 'POST') {
      if (!['admin', 'manager', 'supervisor'].includes(req.user.role)) {
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

      // Déterminer les permissions selon le rôle
      let permissions = {};
      if (data.role === 'manager' || data.role === 'supervisor') {
        // Pour un manager ou supervisor, utiliser les permissions fournies ou les défauts
        permissions = data.permissions || DEFAULT_MANAGER_PERMISSIONS;
      } else if (data.role === 'admin') {
        // Les admins ont toutes les permissions
        permissions = Object.keys(DEFAULT_MANAGER_PERMISSIONS).reduce((acc, key) => {
          acc[key] = true;
          return acc;
        }, {});
      }

      const newUser = await queryOne(
        `INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role, phone, permissions, requires_password_change,
                           hierarchical_level, commission_rate, team_commission_rate, commission_type, base_salary)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9, $10, $11, $12, $13)
         RETURNING id, email, first_name, last_name, role, phone, permissions, created_at,
                   hierarchical_level, commission_rate, team_commission_rate, commission_type, base_salary`,
        [
          req.user.tenant_id,
          data.email,
          password_hash,
          data.first_name,
          data.last_name,
          data.role,
          data.phone || null,
          JSON.stringify(permissions),
          data.hierarchical_level || null,
          data.commission_rate || 0,
          data.team_commission_rate || 0,
          data.commission_type || 'percentage',
          data.base_salary || null
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
        log(`✅ Email envoyé à ${data.email}`);
      } catch (emailError) {
        error('⚠️ Erreur envoi email:', emailError.message);
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

      if (!['admin', 'manager', 'supervisor'].includes(req.user.role)) {
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

      // 🔒 Les managers/supervisors ne peuvent PAS modifier les admins ou super admins
      if (req.user.role === 'manager' || req.user.role === 'supervisor') {
        if (targetUser.role === 'admin' || targetUser.is_super_admin === true) {
          log(`🚫 ${req.user.role} ${req.user.email} tentative modification admin/superadmin ${userId}`);
          return res.status(403).json({
            error: 'Accès refusé',
            message: 'Vous ne pouvez pas modifier un compte administrateur'
          });
        }

        // Vérifier que l'utilisateur cible fait partie de l'équipe du manager/supervisor
        const isInTeam = await queryOne(
          `SELECT 1 FROM team_members tm
           JOIN teams t ON tm.team_id = t.id
           WHERE tm.user_id = $1 AND t.manager_id = $2`,
          [userId, req.user.id]
        );

        if (!isInTeam && userId !== req.user.id) {
          log(`🚫 ${req.user.role} ${req.user.email} tentative modification user hors équipe ${userId}`);
          return res.status(403).json({
            error: 'Accès refusé',
            message: 'Cet utilisateur ne fait pas partie de votre équipe'
          });
        }
      }

      const {
        first_name, last_name, role, phone, team_id, permissions,
        hierarchical_level, commission_rate, team_commission_rate, commission_type, base_salary
      } = req.body;

      if (!first_name || !last_name || !role) {
        return res.status(400).json({
          error: 'Prénom, nom et rôle requis'
        });
      }

      // 🔒 Les managers/supervisors ne peuvent PAS promouvoir quelqu'un en admin
      if ((req.user.role === 'manager' || req.user.role === 'supervisor') && role === 'admin') {
        return res.status(403).json({
          error: 'Accès refusé',
          message: 'Vous ne pouvez pas promouvoir un utilisateur en administrateur'
        });
      }

      // 🔒 Seuls les admins peuvent modifier les permissions
      if (permissions && req.user.role !== 'admin' && !req.user.is_super_admin) {
        return res.status(403).json({
          error: 'Accès refusé',
          message: 'Seuls les administrateurs peuvent modifier les permissions'
        });
      }

      // Vérifier que le rôle est valide
      const validRoles = ['admin', 'manager', 'supervisor', 'user', 'commercial'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          error: 'Rôle invalide'
        });
      }

      // Construire la requête de mise à jour avec tous les champs
      const updateQuery = `UPDATE users
         SET first_name = $1, last_name = $2, role = $3, phone = $4,
             permissions = COALESCE($5, permissions),
             hierarchical_level = $6,
             commission_rate = COALESCE($7, commission_rate),
             team_commission_rate = COALESCE($8, team_commission_rate),
             commission_type = COALESCE($9, commission_type),
             base_salary = $10,
             updated_at = NOW()
         WHERE id = $11 AND tenant_id = $12
         RETURNING id, email, first_name, last_name, role, phone, permissions, is_active, created_at,
                   hierarchical_level, commission_rate, team_commission_rate, commission_type, base_salary`;

      const updateParams = [
        first_name,
        last_name,
        role,
        phone || null,
        permissions ? JSON.stringify(permissions) : null,
        (role === 'manager' || role === 'supervisor') ? (hierarchical_level || null) : null,
        commission_rate !== undefined ? commission_rate : null,
        team_commission_rate !== undefined ? team_commission_rate : null,
        commission_type || null,
        base_salary || null,
        userId,
        req.user.tenant_id
      ];

      const updatedUser = await queryOne(updateQuery, updateParams);

      // Gérer l'équipe (team_members)
      if (team_id !== undefined) {
        // Supprimer l'ancienne association d'équipe
        await execute(
          'DELETE FROM team_members WHERE user_id = $1',
          [userId]
        );

        // Ajouter la nouvelle équipe si spécifiée
        if (team_id && team_id !== '') {
          await execute(
            `INSERT INTO team_members (id, team_id, user_id, role, joined_at)
             VALUES (gen_random_uuid(), $1, $2, 'member', NOW())
             ON CONFLICT (user_id, team_id) DO NOTHING`,
            [team_id, userId]
          );
          log(`✅ Équipe ${team_id} assignée à l'utilisateur ${userId}`);
        }
      }

      log('✅ User modifié:', updatedUser.id);

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

      if (!['admin', 'manager', 'supervisor'].includes(req.user.role)) {
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

      // 🔒 Les managers/supervisors ne peuvent PAS bloquer/modifier les admins ou super admins
      if (req.user.role === 'manager' || req.user.role === 'supervisor') {
        if (targetUser.role === 'admin' || targetUser.is_super_admin === true) {
          log(`🚫 ${req.user.role} ${req.user.email} tentative ${action} sur admin/superadmin ${userId}`);
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

        log('🔴 User bloqué:', updatedUser.id);
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

        log('🟢 User débloqué:', updatedUser.id);
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

        log('🔐 Changement de mot de passe forcé pour:', updatedUser.id);
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

      log(`🔄 Suppression utilisateur ${userToDelete.email}: ${totalLeads} leads à dispatcher`);

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

          log(`✅ ${totalLeads} leads transférés vers ${targetUser.id}`);
        } else {
          // Dispatcher vers les managers/supervisors/admins du tenant
          const managers = await queryAll(
            `SELECT id FROM users
             WHERE tenant_id = $1
             AND role IN ('admin', 'manager', 'supervisor')
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

            log(`✅ ${totalLeads} leads transférés vers manager ${managers[0].id}`);
          } else {
            // Aucun manager → désassigner les leads
            await execute(
              `UPDATE leads
               SET assigned_to = NULL, updated_at = NOW()
               WHERE assigned_to = $1 AND tenant_id = $2`,
              [userId, req.user.tenant_id]
            );

            log(`⚠️ ${totalLeads} leads désassignés (aucun manager disponible)`);
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

  } catch (err) {
    error('❌ Users API error:', err);
    error('Stack:', err.stack);

    if (err.name === 'ZodError') {
      return res.status(400).json({
        error: 'Données invalides',
        details: err.errors
      });
    }

    return res.status(500).json({
      error: 'Erreur serveur',
      message: err.message
    });
  }
}

// GET /api/users/team - Récupérer les membres de l'équipe pour le planning
async function getTeamMembers(req, res) {
  const userId = req.user.id;
  const tenantId = req.user.tenant_id;
  const userRole = req.user.role;

  log('🔍 GET /api/users/team - User:', req.user.email, 'Role:', userRole);

  let users = [];
  let team = null;

  try {
    if (userRole === 'admin') {
      // Admin voit tous les utilisateurs du tenant
      users = await queryAll(
        `SELECT u.id, u.email, u.first_name, u.last_name, u.role,
                u.phone, u.avatar_url, u.is_active, u.planning_color,
                u.hierarchical_level
         FROM users u
         WHERE u.tenant_id = $1 AND u.is_active = true
         ORDER BY u.first_name, u.last_name`,
        [tenantId]
      );
    } else if (userRole === 'manager' || userRole === 'supervisor') {
      // Manager/Supervisor voit les membres de ses équipes
      // D'abord récupérer l'équipe du manager/supervisor
      const managerTeam = await queryOne(
        `SELECT t.id, t.name FROM teams t WHERE t.manager_id = $1 AND t.tenant_id = $2`,
        [userId, tenantId]
      );

      team = managerTeam;

      // Puis récupérer les membres
      users = await queryAll(
        `SELECT DISTINCT u.id, u.email, u.first_name, u.last_name, u.role,
                u.phone, u.avatar_url, u.is_active, u.planning_color,
                u.hierarchical_level
         FROM users u
         LEFT JOIN team_members tm ON tm.user_id = u.id
         LEFT JOIN teams t ON t.id = tm.team_id
         WHERE u.tenant_id = $1
           AND u.is_active = true
           AND (
             -- Utilisateurs avec ce manager_id
             u.manager_id = $2
             -- OU membres d'une équipe gérée par ce manager
             OR t.manager_id = $2
           )
         ORDER BY u.first_name, u.last_name`,
        [tenantId, userId]
      );

      log(`📅 Équipe manager ${userId}: ${users.length} membres`);
    } else {
      // Commercial ne voit que lui-même
      users = await queryAll(
        `SELECT u.id, u.email, u.first_name, u.last_name, u.role,
                u.phone, u.avatar_url, u.is_active, u.planning_color,
                u.hierarchical_level
         FROM users u
         WHERE u.id = $1`,
        [userId]
      );
    }

    return res.status(200).json({
      success: true,
      users,
      team
    });
  } catch (err) {
    error('❌ Error getting team members:', err);
    return res.status(500).json({ error: err.message });
  }
}

export default authMiddleware(handler);