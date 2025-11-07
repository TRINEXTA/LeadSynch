// api/auth/me.js
import { authMiddleware } from '../../middleware/auth.js';

// Handler sans auth pour OPTIONS
function optionsHandler(req, res) {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
  return res.status(200).end();
}

// Handler avec auth pour GET
async function getHandler(req, res) {
  console.log('========== /auth/me REQUEST ==========');
  console.log('Method:', req.method);
  console.log('Origin:', req.headers.origin);
  console.log('Authorization header:', req.headers.authorization);
  console.log('User from middleware:', req.user ? 'OK' : 'NULL');
  
  if (req.user) {
    console.log('User ID:', req.user.id);
    console.log('User email:', req.user.email);
  }
  
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  
  return res.json({
    id: req.user.id,
    email: req.user.email,
    name: req.user.name,
    role: req.user.role,
    tenant_id: req.user.tenant_id
  });
}

// Export un handler qui choisit selon la méthode
export default function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return optionsHandler(req, res);
  }
  // Pour GET, utiliser authMiddleware
  return authMiddleware(getHandler)(req, res);
}