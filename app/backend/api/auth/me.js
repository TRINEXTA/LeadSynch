import { log, error, warn } from "../../lib/logger.js";
// api/auth/me.js
import { authMiddleware } from '../../middleware/auth.js';
import { allowedOrigins } from '../../config/middlewares.js';

// Pattern pour les URLs Vercel dynamiques
const vercelPattern = /^https:\/\/leadsynch-.*\.vercel\.app$/;

// Valider l'origine contre la liste blanche
function isOriginAllowed(origin) {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  if (vercelPattern.test(origin)) return true;
  return false;
}

// Handler sans auth pour OPTIONS - CORS sécurisé
function optionsHandler(req, res) {
  const origin = req.headers.origin;
  if (origin && isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
  return res.status(200).end();
}

// Handler avec auth pour GET
async function getHandler(req, res) {
  const origin = req.headers.origin;
  if (origin && isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  // Retourner toutes les infos user incluant les permissions
  return res.json({
    id: req.user.id,
    email: req.user.email,
    first_name: req.user.first_name,
    last_name: req.user.last_name,
    role: req.user.role,
    tenant_id: req.user.tenant_id,
    is_super_admin: req.user.is_super_admin || false,
    permissions: req.user.permissions || {}
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