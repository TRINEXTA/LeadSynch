import { verifyToken } from '../lib/auth.js';

/**
 * Authentication middleware for serverless functions
 * Verifies JWT token from Authorization header
 */
export function authMiddleware(handler) {
  return async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

    // Handle preflight
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    // Extract token
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Non autorisé - Token manquant' 
      });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({ 
        error: 'Non autorisé - Token invalide' 
      });
    }

    // Attach user info to request
    req.user = decoded;

    // Call the actual handler
    return handler(req, res);
  };
}

/**
 * Check if user has required role
 */
export function requireRole(...allowedRoles) {
  return (handler) => {
    return authMiddleware(async (req, res) => {
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ 
          error: 'Accès interdit - Permissions insuffisantes' 
        });
      }
      return handler(req, res);
    });
  };
}

export default authMiddleware;
