// api/auth/me.js
import { authMiddleware } from '../../middleware/auth.js';

async function handler(req, res) {
  // ✅ FORCER LES HEADERS CORS EXPLICITEMENT
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
  
  // Gérer OPTIONS pour preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  console.log('========== /auth/me REQUEST ==========');
  console.log('Method:', req.method);
  console.log('Origin:', req.headers.origin);
  console.log('Authorization header:', req.headers.authorization);
  console.log('User from middleware:', req.user ? 'OK' : 'NULL');
  
  if (req.user) {
    console.log('User ID:', req.user.id);
    console.log('User email:', req.user.email);
  }
  
  return res.json({
    id: req.user.id,
    email: req.user.email,
    name: req.user.name,
    role: req.user.role,
    tenant_id: req.user.tenant_id
  });
}

export default authMiddleware(handler);