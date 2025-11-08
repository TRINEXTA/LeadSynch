import express from 'express';
import db from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { sendEmail } from '../lib/email.js';

const router = express.Router();

// ========== GET /users - Liste des utilisateurs ==========
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [users] = await db.query(
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
        t.name as team_name,
        ten.name as tenant_name
      FROM users u
      LEFT JOIN teams t ON u.team_id = t.id
      LEFT JOIN tenants ten ON u.tenant_id = ten.id
      WHERE u.tenant_id = ?
      ORDER BY u.created_at DESC`,
      [req.user.tenant_id]
    );

    console.log(`✅ ${users.length} utilisateurs récupérés pour tenant ${req.user.tenant_id}`);
    res.json({ success: true, users });
  } catch (error) {
    console.error('❌ Erreur GET /users:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

// ========== POST /users - Créer un utilisateur ==========
router.post('/', authenticateToken, requireRole(['admin', 'manager']), async (req, res) => {
  const { email, first_name, last_name, role, phone, team_id } = req.body;

  try {
    console.log('📝 Création utilisateur:', { email, first_name, last_name, role });

    // Validation
    if (!email || !first_name || !last_name) {
      return res.status(400).json({ error: 'Email, prénom et nom requis' });
    }

    // Vérifier si l'email existe déjà
    const [existing] = await db.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Cet email est déjà utilisé' });
    }

    // Générer mot de passe temporaire
    const tempPassword = crypto.randomBytes(8).toString('hex');
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Créer l'utilisateur
    const [result] = await db.query(
      `INSERT INTO users (
        tenant_id, 
        email, 
        password, 
        first_name, 
        last_name, 
        role, 
        phone, 
        team_id,
        is_active,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, true, NOW())`,
      [
        req.user.tenant_id,
        email,
        hashedPassword,
        first_name,
        last_name,
        role || 'commercial',
        phone || null,
        team_id || null
      ]
    );

    const userId = result.insertId;

    // Envoyer l'email avec le mot de passe
    try {
      await sendEmail({
        to: email,
        subject: '🎉 Bienvenue sur LeadSynch',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #7C3AED;">Bienvenue ${first_name} ${last_name} !</h2>
            <p>Votre compte LeadSynch a été créé avec succès.</p>
            <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Email :</strong> ${email}</p>
              <p style="margin: 10px 0;"><strong>Mot de passe temporaire :</strong> <code style="background: #E5E7EB; padding: 4px 8px; border-radius: 4px; font-size: 16px;">${tempPassword}</code></p>
              <p style="margin: 0;"><strong>Rôle :</strong> ${role || 'commercial'}</p>
            </div>
            <p style="color: #EF4444; font-weight: bold;">⚠️ Veuillez changer votre mot de passe dès votre première connexion.</p>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" 
               style="display: inline-block; background: linear-gradient(135deg, #7C3AED 0%, #EC4899 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px;">
              Se connecter
            </a>
          </div>
        `
      });
      console.log('✅ Email envoyé à', email);
    } catch (emailError) {
      console.error('⚠️ Erreur envoi email:', emailError);
      // On continue même si l'email échoue
    }

    // Récupérer l'utilisateur créé
    const [newUser] = await db.query(
      `SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.role,
        u.phone,
        u.team_id,
        u.is_active,
        t.name as team_name
      FROM users u
      LEFT JOIN teams t ON u.team_id = t.id
      WHERE u.id = ?`,
      [userId]
    );

    console.log('✅ Utilisateur créé avec succès:', newUser[0]);

    res.status(201).json({
      success: true,
      message: 'Utilisateur créé avec succès',
      user: newUser[0],
      tempPassword // Pour debug uniquement
    });

  } catch (error) {
    console.error('❌ Erreur création utilisateur:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la création',
      details: error.message 
    });
  }
});

// ========== ✅ PUT /users/:id - Modifier un utilisateur ==========
router.put('/:id', authenticateToken, requireRole(['admin', 'manager']), async (req, res) => {
  const { id } = req.params;
  const { first_name, last_name, role, phone, team_id } = req.body;

  try {
    console.log(`📝 Modification utilisateur ID=${id}`, req.body);

    // Validation
    if (!first_name || !last_name) {
      return res.status(400).json({ error: 'Prénom et nom requis' });
    }

    // Vérifier que l'utilisateur existe
    const [existingUser] = await db.query(
      'SELECT * FROM users WHERE id = ? AND tenant_id = ?',
      [id, req.user.tenant_id]
    );

    if (existingUser.length === 0) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    // Empêcher un manager de modifier un admin
    if (req.user.role === 'manager' && existingUser[0].role === 'admin') {
      return res.status(403).json({ error: 'Vous ne pouvez pas modifier un administrateur' });
    }

    // Mise à jour
    await db.query(
      `UPDATE users 
       SET first_name = ?,
           last_name = ?,
           role = ?,
           phone = ?,
           team_id = ?,
           updated_at = NOW()
       WHERE id = ? AND tenant_id = ?`,
      [
        first_name,
        last_name,
        role,
        phone || null,
        team_id || null,
        id,
        req.user.tenant_id
      ]
    );

    // Récupérer l'utilisateur mis à jour
    const [updatedUser] = await db.query(
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
        t.name as team_name
      FROM users u
      LEFT JOIN teams t ON u.team_id = t.id
      WHERE u.id = ? AND u.tenant_id = ?`,
      [id, req.user.tenant_id]
    );

    console.log('✅ Utilisateur modifié:', updatedUser[0]);

    res.json({
      success: true,
      message: 'Utilisateur modifié avec succès',
      user: updatedUser[0]
    });

  } catch (error) {
    console.error('❌ Erreur modification utilisateur:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la modification',
      details: error.message 
    });
  }
});

// ========== DELETE /users/:id - Supprimer un utilisateur ==========
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  const { id } = req.params;

  try {
    console.log(`🗑️ Suppression utilisateur ID=${id}`);

    // Vérifier que l'utilisateur existe
    const [user] = await db.query(
      'SELECT * FROM users WHERE id = ? AND tenant_id = ?',
      [id, req.user.tenant_id]
    );

    if (user.length === 0) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    // Empêcher de se supprimer soi-même
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' });
    }

    // Supprimer
    await db.query(
      'DELETE FROM users WHERE id = ? AND tenant_id = ?',
      [id, req.user.tenant_id]
    );

    console.log('✅ Utilisateur supprimé');

    res.json({
      success: true,
      message: 'Utilisateur supprimé avec succès'
    });

  } catch (error) {
    console.error('❌ Erreur suppression utilisateur:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la suppression',
      details: error.message 
    });
  }
});

export default router;