import { queryOne } from '../../lib/db.js';
import { generateToken, comparePassword } from '../../lib/auth.js';
import { z } from 'zod';

// Validation schema
const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Mot de passe doit contenir au moins 6 caractères')
});

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    // Validate input
    const { email, password } = loginSchema.parse(req.body);

    // Find user
    const user = await queryOne(
      `SELECT u.*, t.name as tenant_name, t.status as tenant_status
       FROM users u
       JOIN tenants t ON u.tenant_id = t.id
       WHERE u.email = $1 AND u.is_active = true AND t.status = 'active'`,
      [email]
    );

    if (!user) {
      return res.status(401).json({ 
        error: 'Email ou mot de passe incorrect' 
      });
    }

    // Check password
    const isValid = await comparePassword(password, user.password_hash);

    if (!isValid) {
      return res.status(401).json({ 
        error: 'Email ou mot de passe incorrect' 
      });
    }

    // Update last login
    await queryOne(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Generate token
    const token = generateToken(user);

    // Return user data (without password)
    const { password_hash, ...userData } = user;

    return res.status(200).json({
      success: true,
      token,
      user: userData
    });

  } catch (error) {
    console.error('Login error:', error);

    if (error.name === 'ZodError') {
      return res.status(400).json({ 
        error: 'Données invalides',
        details: error.errors 
      });
    }

    return res.status(500).json({ 
      error: 'Erreur serveur lors de la connexion' 
    });
  }
}
