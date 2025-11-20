// ================================================================
// MIDDLEWARE : Super-Admin Authentication & Authorization
// Description : Sécurité renforcée pour l'espace TRINEXTA
// ================================================================

import { query as q } from '../lib/db.js';

// ========================================
// WHITELIST EMAILS SUPER-ADMIN TRINEXTA
// ========================================
const SUPER_ADMIN_EMAILS = [
  'admin@trinexta.fr',
  'direction@trinexta.fr',
  'dev@trinexta.fr',
  'support@trinexta.fr'
];

// ========================================
// LOG ACTIVITÉ SUPER-ADMIN
// ========================================
async function logSuperAdminAction(userId, method, endpoint, details = {}) {
  try {
    await q(
      `INSERT INTO super_admin_activity_log
       (user_id, action, entity_type, entity_id, method, endpoint, changes, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        userId,
        details.action || `${method} ${endpoint}`,
        details.entity_type || null,
        details.entity_id || null,
        method,
        endpoint,
        JSON.stringify(details.changes || {}),
        details.ip_address || null,
        details.user_agent || null
      ]
    );
  } catch (error) {
    console.error('❌ Erreur log super-admin:', error);
    // Ne pas bloquer l'opération si le log échoue
  }
}

// ========================================
// MIDDLEWARE : REQUIRE SUPER-ADMIN
// ========================================
export async function requireSuperAdmin(req, res, next) {
  try {
    const user = req.user;

    // 1. Vérifier que l'utilisateur est authentifié
    if (!user) {
      console.warn('🚨 [SUPER-ADMIN] Tentative accès sans authentification');
      return res.status(401).json({
        error: 'Non authentifié',
        code: 'UNAUTHENTICATED'
      });
    }

    // 2. Vérifier que l'utilisateur a le flag super-admin
    if (!user.is_super_admin) {
      console.warn(`🚨 [SUPER-ADMIN] Accès refusé: ${user.email} (is_super_admin = false)`);
      return res.status(403).json({
        error: 'Accès refusé - Privilèges super-admin requis',
        code: 'FORBIDDEN_NOT_SUPER_ADMIN'
      });
    }

    // 3. Vérifier que l'email est dans la whitelist TRINEXTA
    if (!SUPER_ADMIN_EMAILS.includes(user.email)) {
      console.error(`🚨 [SUPER-ADMIN] Email non autorisé: ${user.email}`);

      // ⚠️ ALERTE SÉCURITÉ : Email non whitelist mais is_super_admin=true
      // Cela ne devrait JAMAIS arriver sauf en cas de compromission
      await q(
        `INSERT INTO super_admin_activity_log
         (user_id, action, method, endpoint)
         VALUES ($1, $2, $3, $4)`,
        [user.id, 'SECURITY_ALERT_INVALID_SUPER_ADMIN', req.method, req.originalUrl]
      );

      return res.status(403).json({
        error: 'Accès refusé - Email non autorisé',
        code: 'FORBIDDEN_INVALID_EMAIL'
      });
    }

    // 4. Vérifier que le compte est actif
    const { rows } = await q(
      `SELECT is_active FROM users WHERE id = $1`,
      [user.id]
    );

    if (!rows.length || !rows[0].is_active) {
      console.warn(`🚨 [SUPER-ADMIN] Compte inactif: ${user.email}`);
      return res.status(403).json({
        error: 'Compte désactivé',
        code: 'FORBIDDEN_ACCOUNT_DISABLED'
      });
    }

    // ✅ ACCÈS AUTORISÉ
    console.log(`✅ [SUPER-ADMIN] Accès autorisé: ${user.email} → ${req.method} ${req.originalUrl}`);

    // Logger l'action
    await logSuperAdminAction(
      user.id,
      req.method,
      req.originalUrl,
      {
        action: `super_admin_${req.method.toLowerCase()}_${req.originalUrl.replace(/\//g, '_')}`,
        ip_address: req.ip || req.connection.remoteAddress,
        user_agent: req.headers['user-agent']
      }
    );

    // Attacher des helpers à req pour faciliter le logging dans les routes
    req.logSuperAdminAction = async (action, entity_type, entity_id, changes) => {
      await logSuperAdminAction(user.id, req.method, req.originalUrl, {
        action,
        entity_type,
        entity_id,
        changes,
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });
    };

    next();

  } catch (error) {
    console.error('❌ [SUPER-ADMIN] Erreur middleware:', error);
    return res.status(500).json({
      error: 'Erreur interne',
      code: 'INTERNAL_ERROR'
    });
  }
}

// ========================================
// MIDDLEWARE : CHECK PERMISSIONS
// ========================================
export function requirePermission(permission) {
  return async (req, res, next) => {
    const user = req.user;

    if (!user?.super_admin_permissions) {
      // Si pas de permissions définies, super-admin a TOUT
      return next();
    }

    const permissions = user.super_admin_permissions;

    if (permissions.includes(permission) || permissions.includes('*')) {
      return next();
    }

    console.warn(`🚨 [SUPER-ADMIN] Permission refusée: ${user.email} n'a pas '${permission}'`);

    return res.status(403).json({
      error: `Permission refusée - '${permission}' requis`,
      code: 'FORBIDDEN_INSUFFICIENT_PERMISSIONS'
    });
  };
}

// ========================================
// HELPER : Marquer utilisateur comme super-admin
// ========================================
export async function grantSuperAdmin(userId, email) {
  // Vérifier que l'email est dans la whitelist
  if (!SUPER_ADMIN_EMAILS.includes(email)) {
    throw new Error(`Email ${email} n'est pas dans la whitelist TRINEXTA`);
  }

  await q(
    `UPDATE users
     SET is_super_admin = true,
         super_admin_permissions = $1,
         updated_at = NOW()
     WHERE id = $2 AND email = $3`,
    [JSON.stringify(['*']), userId, email]
  );

  console.log(`✅ Super-admin accordé à: ${email}`);
}

// ========================================
// HELPER : Révoquer super-admin
// ========================================
export async function revokeSuperAdmin(userId) {
  await q(
    `UPDATE users
     SET is_super_admin = false,
         super_admin_permissions = NULL,
         updated_at = NOW()
     WHERE id = $1`,
    [userId]
  );

  console.log(`❌ Super-admin révoqué pour user_id: ${userId}`);
}

export default { requireSuperAdmin, requirePermission, grantSuperAdmin, revokeSuperAdmin };
