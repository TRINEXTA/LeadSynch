import { log, error, warn } from "../../lib/logger.js";
﻿// api/auth/me.js
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
  log('========== /auth/me REQUEST ==========');
  log('Method:', req.method);
  log('Origin:', req.headers.origin);
  log('Authorization header:', req.headers.authorization);
  log('User from middleware:', req.user ? 'OK' : 'NULL');
  
  if (req.user) {
    log('User ID:', req.user.id);
    log('User email:', req.user.email);
    log('User name:', req.user.first_name, req.user.last_name);
  }
  
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  
  // ✅ CORRECTION : Retourner first_name, last_name et is_super_admin
  return res.json({
    id: req.user.id,
    email: req.user.email,
    first_name: req.user.first_name,
    last_name: req.user.last_name,
    role: req.user.role,
    tenant_id: req.user.tenant_id,
    is_super_admin: req.user.is_super_admin || false
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