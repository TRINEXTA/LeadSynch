import { log, error, warn } from "../lib/logger.js";
import { queryOne, execute } from '../lib/db.js';
import { hashPassword, verifyPassword } from '../lib/auth.js';
import { z } from 'zod';

const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'Mot de passe actuel requis'),
  new_password: z.string().min(8, 'Le nouveau mot de passe doit faire au moins 8 caractères')
});

const updateProfileSchema = z.object({
  first_name: z.string().min(1, 'Prénom requis').optional(),
  last_name: z.string().min(1, 'Nom requis').optional(),
  phone: z.string().optional(),
  avatar_url: z.string().url('URL invalide').optional().nullable()
});

async function handler(req, res) {
  const { method } = req;
  const userId = req.user.id;

  try {
    // GET - Récupérer le profil complet de l'utilisateur connecté
    if (method === 'GET') {
      log('🔍 GET /api/profile - User:', req.user.email);

      const user = await queryOne(
        `SELECT id, email, first_name, last_name, role, phone, avatar_url,
                is_active, last_login, created_at, tenant_id,
                hierarchical_level, commission_rate, team_commission_rate,
                commission_type, base_salary, department_id,
                requires_password_change
         FROM users
         WHERE id = $1`,
        [userId]
      );

      if (!user) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }

      // Récupérer les stats de commissions si applicable
      let commissionStats = null;
      if (['manager', 'commercial'].includes(user.role)) {
        const stats = await queryOne(
          `SELECT
            COUNT(*) FILTER (WHERE status = 'validated') as validated_count,
            COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
            COALESCE(SUM(commission_amount) FILTER (WHERE status = 'validated'), 0) as total_validated,
            COALESCE(SUM(commission_amount) FILTER (WHERE status = 'pending'), 0) as total_pending,
            COALESCE(SUM(commission_amount) FILTER (WHERE status = 'paid'), 0) as total_paid
           FROM commissions
           WHERE user_id = $1`,
          [userId]
        );
        commissionStats = stats;
      }

      return res.status(200).json({
        success: true,
        user,
        commissionStats
      });
    }

    // PUT - Mettre à jour le profil (nom, téléphone, avatar)
    if (method === 'PUT') {
      log('📝 PUT /api/profile - User:', req.user.email);

      const data = updateProfileSchema.parse(req.body);

      // Construire dynamiquement la requête UPDATE
      const updates = [];
      const params = [];
      let paramIndex = 1;

      if (data.first_name !== undefined) {
        updates.push(`first_name = $${paramIndex++}`);
        params.push(data.first_name);
      }
      if (data.last_name !== undefined) {
        updates.push(`last_name = $${paramIndex++}`);
        params.push(data.last_name);
      }
      if (data.phone !== undefined) {
        updates.push(`phone = $${paramIndex++}`);
        params.push(data.phone || null);
      }
      if (data.avatar_url !== undefined) {
        updates.push(`avatar_url = $${paramIndex++}`);
        params.push(data.avatar_url);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });
      }

      updates.push('updated_at = NOW()');
      params.push(userId);

      const updateQuery = `
        UPDATE users
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING id, email, first_name, last_name, phone, avatar_url, role
      `;

      const updatedUser = await queryOne(updateQuery, params);

      log('✅ Profil mis à jour:', updatedUser.id);

      return res.status(200).json({
        success: true,
        user: updatedUser,
        message: 'Profil mis à jour avec succès'
      });
    }

    // POST /api/profile/change-password - Changer le mot de passe
    if (method === 'POST') {
      const action = req.url.split('/').pop();

      if (action === 'change-password') {
        log('🔐 POST /api/profile/change-password - User:', req.user.email);

        const data = changePasswordSchema.parse(req.body);

        // Récupérer le hash actuel
        const user = await queryOne(
          'SELECT password_hash FROM users WHERE id = $1',
          [userId]
        );

        if (!user) {
          return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        // Vérifier le mot de passe actuel
        const isValid = await verifyPassword(data.current_password, user.password_hash);
        if (!isValid) {
          return res.status(400).json({ error: 'Mot de passe actuel incorrect' });
        }

        // Vérifier que le nouveau mot de passe est différent
        const isSame = await verifyPassword(data.new_password, user.password_hash);
        if (isSame) {
          return res.status(400).json({ error: 'Le nouveau mot de passe doit être différent de l\'ancien' });
        }

        // Hasher et enregistrer le nouveau mot de passe
        const newHash = await hashPassword(data.new_password);

        await execute(
          `UPDATE users
           SET password_hash = $1, requires_password_change = false, updated_at = NOW()
           WHERE id = $2`,
          [newHash, userId]
        );

        log('✅ Mot de passe changé pour:', req.user.email);

        return res.status(200).json({
          success: true,
          message: 'Mot de passe modifié avec succès'
        });
      }

      return res.status(400).json({ error: 'Action non reconnue' });
    }

    return res.status(405).json({ error: 'Méthode non autorisée' });

  } catch (err) {
    error('❌ Profile API error:', err);

    if (err.name === 'ZodError') {
      return res.status(400).json({
        error: 'Données invalides',
        details: err.errors
      });
    }

    return res.status(500).json({
      error: 'Erreur serveur',
      message: err.message
    });
  }
}

export default handler;
