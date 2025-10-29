import { authMiddleware } from '../middleware/auth.js';
import { queryAll, queryOne } from '../lib/db.js';
import { hashPassword } from '../lib/auth.js';
import { z } from 'zod';

// Validation schema
const createUserSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Mot de passe minimum 6 caractères'),
  first_name: z.string().min(1, 'Prénom requis'),
  last_name: z.string().min(1, 'Nom requis'),
  role: z.enum(['admin', 'manager', 'user']).default('user'),
  phone: z.string().optional()
});

async function handler(req, res) {
  const { method } = req;

  try {
    // GET - List users
    if (method === 'GET') {
      const users = await queryAll(
        `SELECT u.id, u.email, u.first_name, u.last_name, u.role, 
                u.phone, u.avatar_url, u.is_active, u.last_login, u.created_at,
                t.name as tenant_name
         FROM users u
         JOIN tenants t ON u.tenant_id = t.id
         WHERE u.tenant_id = $1
         ORDER BY u.created_at DESC`,
        [req.user.tenant_id]
      );

      return res.status(200).json({
        success: true,
        users
      });
    }

    // POST - Create user
    if (method === 'POST') {
      // Only admin/manager can create users
      if (!['admin', 'manager'].includes(req.user.role)) {
        return res.status(403).json({ 
          error: 'Permissions insuffisantes' 
        });
      }

      const data = createUserSchema.parse(req.body);
      
      // Check if email exists
      const existing = await queryOne(
        'SELECT id FROM users WHERE email = $1',
        [data.email]
      );

      if (existing) {
        return res.status(400).json({ 
          error: 'Email déjà utilisé' 
        });
      }

      // Hash password
      const password_hash = await hashPassword(data.password);

      // Create user
      const newUser = await queryOne(
        `INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role, phone)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, email, first_name, last_name, role, phone, created_at`,
        [
          req.user.tenant_id,
          data.email,
          password_hash,
          data.first_name,
          data.last_name,
          data.role,
          data.phone || null
        ]
      );

      return res.status(201).json({
        success: true,
        user: newUser
      });
    }

    return res.status(405).json({ error: 'Méthode non autorisée' });

  } catch (error) {
    console.error('Users API error:', error);

    if (error.name === 'ZodError') {
      return res.status(400).json({ 
        error: 'Données invalides',
        details: error.errors 
      });
    }

    return res.status(500).json({ 
      error: 'Erreur serveur' 
    });
  }
}

export default authMiddleware(handler);
