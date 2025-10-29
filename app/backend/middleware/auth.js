import jwt from 'jsonwebtoken';

/**
 * Middleware d'authentification HYBRIDE
 * Compatible : Express (router) ET Serverless (wrapper)
 */
export function authMiddleware(handlerOrReq, res, next) {
  // CAS 1: Utilisé comme wrapper serverless - authMiddleware(handler)
  if (typeof handlerOrReq === 'function') {
    const handler = handlerOrReq;
    
    return async (req, res) => {
      // CORS pour Vercel
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
      res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

      if (req.method === 'OPTIONS') {
        return res.status(200).end();
      }

      try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          console.log(' Token manquant');
          return res.status(401).json({ error: 'Non autorisé - Token manquant' });
        }

        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        console.log(' Token valide pour:', decoded.email || decoded.id);
        
        req.user = decoded;
        
        return handler(req, res);
        
      } catch (error) {
        console.error(' Token error:', error.message);
        return res.status(401).json({ 
          error: 'Non autorisé - ' + (error.name === 'TokenExpiredError' ? 'Token expiré' : 'Token invalide')
        });
      }
    };
  }
  
  // CAS 2: Utilisé comme middleware Express - router.use(authMiddleware)
  const req = handlerOrReq;
  
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log(' Token manquant');
      return res.status(401).json({ error: 'Non autorisé - Token manquant' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    console.log(' Token valide pour:', decoded.email || decoded.id);
    
    req.user = decoded;
    
    if (typeof next === 'function') {
      next();
    }
    
  } catch (error) {
    console.error(' Token error:', error.message);
    return res.status(401).json({ 
      error: 'Non autorisé - ' + (error.name === 'TokenExpiredError' ? 'Token expiré' : 'Token invalide')
    });
  }
}

export default authMiddleware;
