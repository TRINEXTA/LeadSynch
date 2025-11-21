import jwt from 'jsonwebtoken';
import db from '../config/database.js'; // ✅ CORRECTION ICI

/**
 * Middleware d'authentification HYBRIDE
 * Compatible : Express (router) ET Serverless (wrapper)
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
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          console.log('⚠️ Token manquant');
          return res.status(401).json({ error: 'Non autorisé - Token manquant' });
        }
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        console.log('✅ Token valide pour:', decoded.email || decoded.id);
        
        // Charger les infos complètes de l'utilisateur depuis la DB
        const { rows } = await db.query(
          `SELECT id, email, first_name, last_name, role, tenant_id, is_super_admin
           FROM users
           WHERE id = $1`,
          [decoded.id]
        );
        
        if (rows.length === 0) {
          console.log('⚠️ Utilisateur non trouvé');
          return res.status(401).json({ error: 'Utilisateur non trouvé' });
        }
        
        // Attacher les infos complètes à req.user
        req.user = rows[0];
        
        console.log('👤 User chargé:', req.user.first_name, req.user.last_name);
        
        return handler(req, res);
        
      } catch (error) {
        console.error('❌ Token error:', error.message);
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
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('⚠️ Token manquant');
        return res.status(401).json({ error: 'Non autorisé - Token manquant' });
      }
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      console.log('✅ Token valide pour:', decoded.email || decoded.id);
      
      // Charger les infos complètes de l'utilisateur depuis la DB
      const { rows } = await db.query(
        `SELECT id, email, first_name, last_name, role, tenant_id, is_super_admin
         FROM users
         WHERE id = $1`,
        [decoded.id]
      );
      
      if (rows.length === 0) {
        console.log('⚠️ Utilisateur non trouvé');
        return res.status(401).json({ error: 'Utilisateur non trouvé' });
      }
      
      // Attacher les infos complètes à req.user
      req.user = rows[0];
      
      console.log('👤 User chargé:', req.user.first_name, req.user.last_name);
      
      if (typeof next === 'function') {
        next();
      }
      
    } catch (error) {
      console.error('❌ Token error:', error.message);
      return res.status(401).json({ 
        error: 'Non autorisé - ' + (error.name === 'TokenExpiredError' ? 'Token expiré' : 'Token invalide')
      });
    }
  })();
}

/**
 * Helper pour vérifier l'authentification dans les endpoints serverless
 * Retourne { authenticated: true, userId, tenantId, role, user } ou { authenticated: false, error }
 */
export async function verifyAuth(req) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { authenticated: false, error: 'Token manquant' };
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Charger les infos complètes de l'utilisateur depuis la DB
    const { rows } = await db.query(
      `SELECT id, email, first_name, last_name, role, tenant_id, is_super_admin
       FROM users
       WHERE id = $1`,
      [decoded.id]
    );

    if (rows.length === 0) {
      return { authenticated: false, error: 'Utilisateur non trouvé' };
    }

    const user = rows[0];

    return {
      authenticated: true,
      userId: user.id,
      tenantId: user.tenant_id,
      role: user.role,
      user: user
    };

  } catch (error) {
    console.error('❌ Auth error:', error.message);
    return {
      authenticated: false,
      error: error.name === 'TokenExpiredError' ? 'Token expiré' : 'Token invalide'
    };
  }
}

export default authMiddleware;