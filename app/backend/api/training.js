import { Router } from 'express';
import { query, queryOne, execute } from '../lib/db.js';
import { authMiddleware } from '../middleware/auth.js';
import { getTrainingByRole, isTrainingCompleted } from '../lib/training-content.js';

const router = Router();
router.use(authMiddleware);

// GET /api/training - Récupérer le contenu de formation pour l'utilisateur
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    // Récupérer le contenu de formation pour ce rôle
    const trainingContent = getTrainingByRole(userRole);

    // Récupérer la progression de l'utilisateur
    const progress = await queryOne(
      `SELECT * FROM training_progress WHERE user_id = $1`,
      [userId]
    );

    res.json({
      ok: true,
      training: trainingContent,
      progress: progress || {
        user_id: userId,
        completed_modules: [],
        quiz_scores: {},
        completed: false,
        started_at: null,
        completed_at: null
      }
    });
  } catch (error) {
    console.error('❌ Error loading training:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/training/start - Démarrer la formation
router.post('/start', async (req, res) => {
  try {
    const userId = req.user.id;

    // Vérifier si déjà commencée
    const existing = await queryOne(
      `SELECT * FROM training_progress WHERE user_id = $1`,
      [userId]
    );

    if (existing) {
      return res.json({
        ok: true,
        message: 'Formation déjà commencée',
        progress: existing
      });
    }

    // Créer l'entrée de progression
    const newProgress = await queryOne(
      `INSERT INTO training_progress (user_id, started_at)
       VALUES ($1, NOW())
       RETURNING *`,
      [userId]
    );

    res.json({
      ok: true,
      message: 'Formation démarrée',
      progress: newProgress
    });
  } catch (error) {
    console.error('❌ Error starting training:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/training/complete-module - Marquer un module comme complété
router.post('/complete-module', async (req, res) => {
  try {
    const userId = req.user.id;
    const { module_id, quiz_score } = req.body;

    if (!module_id) {
      return res.status(400).json({ error: 'module_id requis' });
    }

    // Récupérer la progression actuelle
    let progress = await queryOne(
      `SELECT * FROM training_progress WHERE user_id = $1`,
      [userId]
    );

    // Si pas encore commencé, créer
    if (!progress) {
      progress = await queryOne(
        `INSERT INTO training_progress (user_id, started_at)
         VALUES ($1, NOW())
         RETURNING *`,
        [userId]
      );
    }

    // Ajouter le module aux modules complétés
    const completedModules = progress.completed_modules || [];
    if (!completedModules.includes(module_id)) {
      completedModules.push(module_id);
    }

    // Ajouter le score du quiz
    const quizScores = progress.quiz_scores || {};
    if (quiz_score !== undefined) {
      quizScores[module_id] = quiz_score;
    }

    // Vérifier si toute la formation est complétée
    const userRole = req.user.role;
    const trainingContent = getTrainingByRole(userRole);
    const totalModules = trainingContent.modules.length;
    const isCompleted = completedModules.length >= totalModules;

    // Mettre à jour la progression
    const updated = await queryOne(
      `UPDATE training_progress
       SET completed_modules = $1,
           quiz_scores = $2,
           completed = $3,
           completed_at = CASE WHEN $3 THEN NOW() ELSE completed_at END,
           updated_at = NOW()
       WHERE user_id = $4
       RETURNING *`,
      [JSON.stringify(completedModules), JSON.stringify(quizScores), isCompleted, userId]
    );

    // Si formation complétée, marquer l'utilisateur
    if (isCompleted) {
      await execute(
        `UPDATE users SET training_completed = true WHERE id = $1`,
        [userId]
      );
    }

    res.json({
      ok: true,
      message: isCompleted ? 'Formation complétée ! 🎉' : 'Module complété',
      progress: updated,
      completed: isCompleted
    });
  } catch (error) {
    console.error('❌ Error completing module:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/training/reset - Réinitialiser la formation (admin only)
router.post('/reset', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Accès refusé - Admin uniquement' });
    }

    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'user_id requis' });
    }

    await execute(
      `DELETE FROM training_progress WHERE user_id = $1`,
      [user_id]
    );

    await execute(
      `UPDATE users SET training_completed = false WHERE id = $1`,
      [user_id]
    );

    res.json({
      ok: true,
      message: 'Formation réinitialisée'
    });
  } catch (error) {
    console.error('❌ Error resetting training:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/training/stats - Statistiques de formation (admin/manager)
router.get('/stats', async (req, res) => {
  try {
    if (!['admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const tenantId = req.user.tenant_id;

    const stats = await query(
      `SELECT
        u.role,
        COUNT(*) as total_users,
        COUNT(CASE WHEN u.training_completed THEN 1 END) as completed,
        COUNT(CASE WHEN tp.id IS NOT NULL THEN 1 END) as started,
        ROUND(AVG(CASE WHEN u.training_completed THEN 100 ELSE
          (COALESCE(jsonb_array_length(tp.completed_modules), 0) * 100.0 /
            CASE u.role
              WHEN 'admin' THEN 6
              WHEN 'manager' THEN 5
              ELSE 5
            END)
        END), 1) as avg_progress
      FROM users u
      LEFT JOIN training_progress tp ON u.id = tp.user_id
      WHERE u.tenant_id = $1
      GROUP BY u.role`,
      [tenantId]
    );

    res.json({
      ok: true,
      stats: stats.rows
    });
  } catch (error) {
    console.error('❌ Error loading training stats:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
