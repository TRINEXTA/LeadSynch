// api/auth/me.js
import { authMiddleware } from '../../middleware/auth.js';

async function handler(req, res) {
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