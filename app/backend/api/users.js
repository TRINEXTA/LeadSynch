import express from 'express';
import bcrypt from 'bcryptjs';
import { authMiddleware } from '../middleware/auth.js';
import db from '../config/database.js';

const router = express.Router();

// Helper functions
const queryOne = async (query, params = []) => {
  const { rows } = await db.query(query, params);
  return rows[0] || null;
};

const queryAll = async (query, params = []) => {
  const { rows } = await db.query(query, params);
  return rows;
};

const execute = async (query, params = []) => {
  return await db.query(query, params);
};

// ==================== GET ALL USERS ====================
router.get('/', authMiddleware, async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    
    console.log('🔍 Loading users for tenant:', tenantId);
    
    const users = await queryAll(
      `SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.role,
        u.phone,
        u.team_id,
        u.is_active,
        u.last_login,
        u.created_at,
        t.name as tenant_name,
        tm.name as team_name
      FROM users u
      LEFT JOIN tenants t ON u.tenant_id = t.id
      LEFT JOIN teams tm ON u.team_id = tm.id
      WHERE u.tenant_id = $1
      ORDER BY u.created_at DESC`,
      [tenantId]
    );
    
    console.log('✅ Users loaded:', users.length);
    
    return res.json({ success: true, users });
    
  } catch (error) {
    console.error('❌ Error loading users:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ==================== GET ONE USER ====================
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    const userId = req.params.id;
    
    const user = await queryOne(
      `SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.role,
        u.phone,
        u.team_id,
        u.is_active,
        u.last_login,
        u.created_at,
        t.name as tenant_name,
        tm.name as team_name
      FROM users u
      LEFT JOIN tenants t ON u.tenant_id = t.id
      LEFT JOIN teams tm ON u.team_id = tm.id
      WHERE u.id = $1 AND u.tenant_id = $2`,
      [userId, tenantId]
    );
    
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    
    return res.json({ success: true, user });
    
  } catch (error) {
    console.error('❌ Error loading user:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ==================== CREATE USER ====================
router.post('/', authMiddleware, async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    const { email, first_name, last_name, role, phone, team_id } = req.body;
    
    console.log('📝 Creating user:', { email, first_name, last_name, role });
    
    // Validation
    if (!email || !first_name || !last_name || !role) {
      return res.status(400).json({ 
        error: 'Email, prénom, nom et rôle requis' 
      });
    }
    
    // Vérifier si l'email existe déjà
    const existing = await queryOne(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    
    if (existing) {
      return res.status(400).json({ 
        error: 'Cet email est déjà utilisé' 
      });
    }
    
    // Générer un mot de passe temporaire
    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    
    // Créer l'utilisateur
    const user = await queryOne(
      `INSERT INTO users (
        tenant_id,
        email,
        first_name,
        last_name,
        password_hash,
        role,
        phone,
        team_id,
        is_active,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, true, NOW(), NOW()
      ) RETURNING id, email, first_name, last_name, role, phone, team_id, is_active, created_at`,
      [tenantId, email.toLowerCase(), first_name, last_name, passwordHash, role, phone || null, team_id || null]
    );
    
    console.log('✅ User created:', user.id);
    
    // Envoyer l'email avec le mot de passe temporaire
    try {
      const { sendPasswordEmail } = await import('../services/emailService.js');
      await sendPasswordEmail(email, first_name, tempPassword);
      console.log('✅ Password email sent');
    } catch (emailError) {
      console.error('⚠️ Error sending email:', emailError);
      // Ne pas bloquer la création si l'email échoue
    }
    
    return res.json({ 
      success: true, 
      user,
      message: 'Utilisateur créé. Un email avec le mot de passe temporaire a été envoyé.'
    });
    
  } catch (error) {
    console.error('❌ Error creating user:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ==================== ✅ UPDATE USER (NOUVEAU) ====================
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    const userId = req.params.id;
    const currentUserId = req.user?.id;
    const currentUserRole = req.user?.role;
    const { first_name, last_name, role, phone, team_id } = req.body;
    
    console.log('📝 Updating user:', userId, { first_name, last_name, role, phone, team_id });
    
    // Vérifier que l'utilisateur existe et appartient au tenant
    const existingUser = await queryOne(
      'SELECT id, role FROM users WHERE id = $1 AND tenant_id = $2',
      [userId, tenantId]
    );
    
    if (!existingUser) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    
    // Vérifier les permissions
    if (currentUserRole !== 'admin' && currentUserRole !== 'manager') {
      return res.status(403).json({ error: 'Permissions insuffisantes' });
    }
    
    // Un manager ne peut pas modifier un admin
    if (currentUserRole === 'manager' && existingUser.role === 'admin') {
      return res.status(403).json({ error: 'Un manager ne peut pas modifier un administrateur' });
    }
    
    // Validation
    if (!first_name || !last_name || !role) {
      return res.status(400).json({ 
        error: 'Prénom, nom et rôle requis' 
      });
    }
    
    // Mettre à jour l'utilisateur
    const updatedUser = await queryOne(
      `UPDATE users 
       SET 
         first_name = $1,
         last_name = $2,
         role = $3,
         phone = $4,
         team_id = $5,
         updated_at = NOW()
       WHERE id = $6 AND tenant_id = $7
       RETURNING id, email, first_name, last_name, role, phone, team_id, is_active, last_login, created_at`,
      [first_name, last_name, role, phone || null, team_id || null, userId, tenantId]
    );
    
    console.log('✅ User updated:', updatedUser.id);
    
    return res.json({ 
      success: true, 
      user: updatedUser,
      message: 'Utilisateur modifié avec succès'
    });
    
  } catch (error) {
    console.error('❌ Error updating user:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ==================== DELETE USER ====================
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    const userId = req.params.id;
    const currentUserId = req.user?.id;
    const currentUserRole = req.user?.role;
    
    console.log('🗑️ Deleting user:', userId);
    
    // Vérifier les permissions (seul admin peut supprimer)
    if (currentUserRole !== 'admin') {
      return res.status(403).json({ error: 'Seul un administrateur peut supprimer un utilisateur' });
    }
    
    // Empêcher la suppression de soi-même
    if (userId === currentUserId) {
      return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' });
    }
    
    // Vérifier que l'utilisateur existe
    const user = await queryOne(
      'SELECT id FROM users WHERE id = $1 AND tenant_id = $2',
      [userId, tenantId]
    );
    
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    
    // Désassigner les leads de cet utilisateur
    await execute(
      'UPDATE leads SET assigned_to = NULL WHERE assigned_to = $1 AND tenant_id = $2',
      [userId, tenantId]
    );
    
    // Supprimer l'utilisateur
    await execute(
      'DELETE FROM users WHERE id = $1 AND tenant_id = $2',
      [userId, tenantId]
    );
    
    console.log('✅ User deleted:', userId);
    
    return res.json({ 
      success: true, 
      message: 'Utilisateur supprimé avec succès'
    });
    
  } catch (error) {
    console.error('❌ Error deleting user:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ==================== TOGGLE USER STATUS ====================
router.patch('/:id/toggle-status', authMiddleware, async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    const userId = req.params.id;
    const currentUserRole = req.user?.role;
    
    // Vérifier les permissions
    if (currentUserRole !== 'admin' && currentUserRole !== 'manager') {
      return res.status(403).json({ error: 'Permissions insuffisantes' });
    }
    
    const user = await queryOne(
      'SELECT id, is_active FROM users WHERE id = $1 AND tenant_id = $2',
      [userId, tenantId]
    );
    
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    
    const updatedUser = await queryOne(
      `UPDATE users 
       SET is_active = NOT is_active, updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2
       RETURNING id, email, first_name, last_name, role, is_active`,
      [userId, tenantId]
    );
    
    console.log('✅ User status toggled:', updatedUser.id, updatedUser.is_active);
    
    return res.json({ 
      success: true, 
      user: updatedUser,
      message: `Utilisateur ${updatedUser.is_active ? 'activé' : 'désactivé'}`
    });
    
  } catch (error) {
    console.error('❌ Error toggling user status:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ==================== RESET PASSWORD ====================
router.post('/:id/reset-password', authMiddleware, async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    const userId = req.params.id;
    const currentUserRole = req.user?.role;
    
    // Vérifier les permissions
    if (currentUserRole !== 'admin' && currentUserRole !== 'manager') {
      return res.status(403).json({ error: 'Permissions insuffisantes' });
    }
    
    const user = await queryOne(
      'SELECT id, email, first_name FROM users WHERE id = $1 AND tenant_id = $2',
      [userId, tenantId]
    );
    
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    
    // Générer un nouveau mot de passe temporaire
    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    
    await execute(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [passwordHash, userId]
    );
    
    // Envoyer l'email
    try {
      const { sendPasswordEmail } = await import('../services/emailService.js');
      await sendPasswordEmail(user.email, user.first_name, tempPassword);
      console.log('✅ Password reset email sent');
    } catch (emailError) {
      console.error('⚠️ Error sending email:', emailError);
    }
    
    return res.json({ 
      success: true, 
      message: 'Mot de passe réinitialisé. Un email a été envoyé à l\'utilisateur.'
    });
    
  } catch (error) {
    console.error('❌ Error resetting password:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;