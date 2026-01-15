import { log, error, warn } from "../lib/logger.js";
import jwt from 'jsonwebtoken';
import db from '../config/database.js'; // ✅ CORRECTION ICI

/**
 * ✅ Helper pour extraire le token (Header OU Cookie)
 * Priorité : Authorization header > Cookie
 */
function extractToken(req) {
  // 1. Essayer d'abord le header Authorization (Bearer token)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // 2. Sinon, essayer le cookie 'token'
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }

  return null;
}

/**
 * Middleware d'authentification HYBRIDE
 * Compatible : Express (router) ET Serverless (wrapper)
 * ✅ Supporte : Authorization header ET cookies HttpOnly
 */
export function authMiddleware(handlerOrReq, res, next) {
  // CAS 1: Utilisé comme wrapper serverless - authMiddleware(handler)
  if (typeof handlerOrReq === 'function') {
    const handler = handlerOrReq;

    return async (req, res) => {
      // Note: CORS est géré par server.js avec liste blanche d'origines
      if (req.method === 'OPTIONS') {
        return res.status(200).end();
      }
      try {
        const token = extractToken(req);

        if (!token) {
          log('⚠️ Token manquant');
          return res.status(401).json({ error: 'Non autorisé - Token manquant' });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        log('✅ Token valide pour:', decoded.email || decoded.id);
        
        // Charger les infos complètes de l'utilisateur depuis la DB (avec permissions)
        const { rows } = await db.query(
          `SELECT id, email, first_name, last_name, role, tenant_id, is_super_admin, permissions,
                  hierarchical_level, commission_rate, team_commission_rate, commission_type,
                  base_salary, department_id, avatar_url
           FROM users
           WHERE id = $1`,
          [decoded.id]
        );
        
        if (rows.length === 0) {
          log('⚠️ Utilisateur non trouvé');
          return res.status(401).json({ error: 'Utilisateur non trouvé' });
        }
        
        // Attacher les infos complètes à req.user
        req.user = rows[0];

        // Parser les permissions si elles sont stockées comme string JSON
        if (req.user.permissions && typeof req.user.permissions === 'string') {
          try {
            req.user.permissions = JSON.parse(req.user.permissions);
          } catch (e) {
            req.user.permissions = {};
          }
        }

        log('👤 User chargé:', req.user.first_name, req.user.last_name, 'Role:', req.user.role, 'Permissions:', JSON.stringify(req.user.permissions || {}));

        return handler(req, res);
        
      } catch (error) {
        error('❌ Token error:', error.message);
        return res.status(401).json({ 
          error: 'Non autorisé - ' + (error.name === 'TokenExpiredError' ? 'Token expiré' : 'Token invalide')
        });
      }
    };
  }
  
  // CAS 2: Utilisé comme middleware Express - router.use(authMiddleware)
  const req = handlerOrReq;

  (async () => {
    try {
      const token = extractToken(req);

      if (!token) {
        log('⚠️ Token manquant');
        return res.status(401).json({ error: 'Non autorisé - Token manquant' });
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      log('✅ Token valide pour:', decoded.email || decoded.id);
      
      // Charger les infos complètes de l'utilisateur depuis la DB (avec permissions)
      const { rows } = await db.query(
        `SELECT id, email, first_name, last_name, role, tenant_id, is_super_admin, permissions,
                hierarchical_level, commission_rate, team_commission_rate, commission_type,
                base_salary, department_id, avatar_url
         FROM users
         WHERE id = $1`,
        [decoded.id]
      );
      
      if (rows.length === 0) {
        log('⚠️ Utilisateur non trouvé');
        return res.status(401).json({ error: 'Utilisateur non trouvé' });
      }
      
      // Attacher les infos complètes à req.user
      req.user = rows[0];

      // Parser les permissions si elles sont stockées comme string JSON
      if (req.user.permissions && typeof req.user.permissions === 'string') {
        try {
          req.user.permissions = JSON.parse(req.user.permissions);
        } catch (e) {
          req.user.permissions = {};
        }
      }

      log('👤 User chargé:', req.user.first_name, req.user.last_name, 'Role:', req.user.role, 'Permissions:', JSON.stringify(req.user.permissions || {}));

      if (typeof next === 'function') {
        next();
      }
      
    } catch (error) {
      error('❌ Token error:', error.message);
      return res.status(401).json({ 
        error: 'Non autorisé - ' + (error.name === 'TokenExpiredError' ? 'Token expiré' : 'Token invalide')
      });
    }
  })();
}

/**
 * Helper pour vérifier l'authentification dans les endpoints serverless
 * Retourne { authenticated: true, userId, tenantId, role, user } ou { authenticated: false, error }
 * ✅ Supporte : Authorization header ET cookies HttpOnly
 */
export async function verifyAuth(req) {
  try {
    const token = extractToken(req);

    if (!token) {
      return { authenticated: false, error: 'Token manquant' };
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Charger les infos complètes de l'utilisateur depuis la DB (avec permissions)
    const { rows } = await db.query(
      `SELECT id, email, first_name, last_name, role, tenant_id, is_super_admin, permissions,
              hierarchical_level, commission_rate, team_commission_rate, commission_type,
              base_salary, department_id, avatar_url
       FROM users
       WHERE id = $1`,
      [decoded.id]
    );

    if (rows.length === 0) {
      return { authenticated: false, error: 'Utilisateur non trouvé' };
    }

    const user = rows[0];

    // Parser les permissions si elles sont stockées comme string JSON
    if (user.permissions && typeof user.permissions === 'string') {
      try {
        user.permissions = JSON.parse(user.permissions);
      } catch (e) {
        user.permissions = {};
      }
    }

    return {
      authenticated: true,
      userId: user.id,
      tenantId: user.tenant_id,
      role: user.role,
      user: user
    };

  } catch (err) {
    console.error('❌ Auth error:', err.message);
    return {
      authenticated: false,
      error: err.name === 'TokenExpiredError' ? 'Token expiré' : 'Token invalide'
    };
  }
}

export default authMiddleware;