import { authMiddleware } from '../middleware/auth.js';
import { queryAll, queryOne, execute } from '../lib/db.js';
import { hashPassword } from '../lib/auth.js';
import { sendTemporaryPassword } from '../lib/email.js';
import { z } from 'zod';
import crypto from 'crypto';

const createUserSchema = z.object({
  email: z.string().email('Email invalide'),
  first_name: z.string().min(1, 'Prénom requis'),
  last_name: z.string().min(1, 'Nom requis'),
  role: z.enum(['admin', 'manager', 'user']).default('user'),
  phone: z.string().optional(),
  team_id: z.string().optional().nullable()
});

async function handler(req, res) {
  const { method } = req;

  try {
    // GET - List users
    if (method === 'GET') {
      console.log('🔍 GET /api/users - User:', req.user.email, 'Tenant:', req.user.tenant_id);
      
      const users = await queryAll(
        `SELECT u.id, u.email, u.first_name, u.last_name, u.role,  
                u.phone, u.avatar_url, u.is_active, u.last_login, u.created_at,
                t.name as tenant_name
         FROM users u
         LEFT JOIN tenants t ON u.tenant_id = t.id
         WHERE u.tenant_id = $1
         ORDER BY u.created_at DESC`,
        [req.user.tenant_id]
      );

      console.log('✅ Users trouvés:', users.length);

      return res.status(200).json({
        success: true,
        users
      });
    }

    // POST - Create user
    if (method === 'POST') {
      if (!['admin', 'manager'].includes(req.user.role)) {
        return res.status(403).json({
          error: 'Permissions insuffisantes'
        });
      }

      const data = createUserSchema.parse(req.body);
      const team_id = data.team_id && data.team_id !== '' ? data.team_id : null;

      const existing = await queryOne(
        'SELECT id FROM users WHERE email = $1',
        [data.email]
      );

      if (existing) {
        return res.status(400).json({
          error: 'Email déjà utilisé'
        });
      }

      const tempPassword = crypto.randomBytes(4).toString('hex');  
      console.log('🔐 Mot de passe temporaire généré:', tempPassword);

      const password_hash = await hashPassword(tempPassword);

      const newUser = await queryOne(
        `INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role, phone, requires_password_change)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true)
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

      if (team_id) {
        await execute(
          `INSERT INTO team_members (id, team_id, user_id, role, joined_at)
           VALUES (gen_random_uuid(), $1, $2, 'member', NOW())`,   
          [team_id, newUser.id]
        );
      }

      try {
        await sendTemporaryPassword(data.email, data.first_name, tempPassword);
        console.log(`✅ Email envoyé à ${data.email}`);
      } catch (emailError) {
        console.error('⚠️ Erreur envoi email:', emailError.message);
      }

      return res.status(201).json({
        success: true,
        user: newUser,
        message: 'Utilisateur créé avec succès !'
      });
    }

    return res.status(405).json({ error: 'Méthode non autorisée' });

  } catch (error) {
    console.error('❌ Users API error:', error);
    console.error('Stack:', error.stack);

    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Données invalides',
        details: error.errors
      });
    }

    return res.status(500).json({
      error: 'Erreur serveur',
      message: error.message
    });
  }
}

export default authMiddleware(handler);