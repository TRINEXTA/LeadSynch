import { log, error, warn } from "../lib/logger.js";
import express from 'express';
import { authMiddleware as authenticateToken } from '../middleware/auth.js';
import db from '../config/db.js';

const router = express.Router();

const q = (text, params = []) => db.query(text, params);

// =============================
// HELPER: Détecter le type d'appareil
// =============================
const detectDevice = (userAgent) => {
  if (!userAgent) return 'unknown';
  const ua = userAgent.toLowerCase();
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) return 'mobile';
  if (ua.includes('tablet') || ua.includes('ipad')) return 'tablet';
  return 'desktop';
};

// =============================
// HELPER: Extraire le navigateur
// =============================
const detectBrowser = (userAgent) => {
  if (!userAgent) return 'unknown';
  const ua = userAgent.toLowerCase();
  if (ua.includes('chrome') && !ua.includes('edg')) return 'Chrome';
  if (ua.includes('firefox')) return 'Firefox';
  if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari';
  if (ua.includes('edg')) return 'Edge';
  if (ua.includes('opera') || ua.includes('opr')) return 'Opera';
  return 'Other';
};

// =============================
// POST /activity/heartbeat
// Met à jour la présence de l'utilisateur (appelé toutes les 30s par le frontend)
// =============================
router.post('/heartbeat', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;
    const { current_page } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';

    // Mettre à jour la présence de l'utilisateur
    await q(
      `UPDATE users
       SET last_activity = NOW(),
           presence_status = 'online',
           current_page = $2
       WHERE id = $1`,
      [userId, current_page || null]
    );

    // Mettre à jour la session active
    await q(
      `UPDATE user_sessions
       SET last_activity = NOW()
       WHERE user_id = $1 AND status = 'active'`,
      [userId]
    );

    res.json({ success: true });
  } catch (err) {
    error('Heartbeat error:', err);
    res.status(500).json({ error: err.message });
  }
});

// =============================
// POST /activity/log
// Enregistre une action utilisateur
// =============================
router.post('/log', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;
    const { action, category, resource_type, resource_id, resource_name, description, metadata, page_url } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';

    if (!action) {
      return res.status(400).json({ error: 'Action requise' });
    }

    // Récupérer la session active
    const { rows: sessions } = await q(
      `SELECT id FROM user_sessions WHERE user_id = $1 AND status = 'active' LIMIT 1`,
      [userId]
    );

    await q(
      `INSERT INTO activity_logs
       (user_id, tenant_id, session_id, action, category, resource_type, resource_id, resource_name, description, metadata, ip_address, page_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        userId,
        tenantId,
        sessions[0]?.id || null,
        action,
        category || null,
        resource_type || null,
        resource_id || null,
        resource_name || null,
        description || null,
        metadata ? JSON.stringify(metadata) : null,
        ip,
        page_url || null
      ]
    );

    // Mettre à jour last_activity
    await q(
      `UPDATE users SET last_activity = NOW(), presence_status = 'online' WHERE id = $1`,
      [userId]
    );

    res.json({ success: true });
  } catch (err) {
    error('Activity log error:', err);
    res.status(500).json({ error: err.message });
  }
});

// =============================
// POST /activity/session/start
// Démarre une nouvelle session (appelé au login)
// =============================
router.post('/session/start', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;
    const userAgent = req.headers['user-agent'] || '';
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';

    // Fermer les anciennes sessions actives
    await q(
      `UPDATE user_sessions
       SET status = 'expired',
           logout_at = NOW(),
           duration_seconds = EXTRACT(EPOCH FROM (NOW() - login_at))::INTEGER
       WHERE user_id = $1 AND status = 'active'`,
      [userId]
    );

    // Créer une nouvelle session
    const { rows } = await q(
      `INSERT INTO user_sessions
       (user_id, tenant_id, ip_address, user_agent, device_type, browser, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'active')
       RETURNING id`,
      [userId, tenantId, ip, userAgent, detectDevice(userAgent), detectBrowser(userAgent)]
    );

    // Mettre à jour l'utilisateur
    await q(
      `UPDATE users
       SET last_activity = NOW(),
           last_login = NOW(),
           presence_status = 'online'
       WHERE id = $1`,
      [userId]
    );

    // Logger l'action
    await q(
      `INSERT INTO activity_logs
       (user_id, tenant_id, session_id, action, category, ip_address)
       VALUES ($1, $2, $3, 'login', 'auth', $4)`,
      [userId, tenantId, rows[0].id, ip]
    );

    log(`🟢 Session démarrée pour user ${userId}`);

    res.json({ success: true, session_id: rows[0].id });
  } catch (err) {
    error('Session start error:', err);
    res.status(500).json({ error: err.message });
  }
});

// =============================
// POST /activity/session/end
// Termine la session (appelé au logout)
// =============================
router.post('/session/end', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';

    // Fermer la session active
    const { rows } = await q(
      `UPDATE user_sessions
       SET status = 'logged_out',
           logout_at = NOW(),
           duration_seconds = EXTRACT(EPOCH FROM (NOW() - login_at))::INTEGER
       WHERE user_id = $1 AND status = 'active'
       RETURNING id`,
      [userId]
    );

    // Mettre à jour l'utilisateur
    await q(
      `UPDATE users
       SET presence_status = 'offline',
           current_page = NULL
       WHERE id = $1`,
      [userId]
    );

    // Logger l'action
    if (rows[0]) {
      await q(
        `INSERT INTO activity_logs
         (user_id, tenant_id, session_id, action, category, ip_address)
         VALUES ($1, $2, $3, 'logout', 'auth', $4)`,
        [userId, tenantId, rows[0].id, ip]
      );
    }

    log(`🔴 Session terminée pour user ${userId}`);

    res.json({ success: true });
  } catch (err) {
    error('Session end error:', err);
    res.status(500).json({ error: err.message });
  }
});

// =============================
// GET /activity/users-status
// Récupère le statut de tous les utilisateurs (pour admin)
// =============================
router.get('/users-status', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const userRole = req.user.role;
    const userId = req.user.id;

    log(`[Activity] ======= USERS-STATUS API CALLED =======`);
    log(`[Activity] User ID: ${userId}`);
    log(`[Activity] User Role: ${userRole}`);
    log(`[Activity] Tenant ID: ${tenantId}`);

    // Seuls admin et manager peuvent voir
    if (!['admin', 'manager', 'supervisor'].includes(userRole) && !req.user.is_super_admin) {
      log(`[Activity] ❌ Access denied for role: ${userRole}`);
      return res.status(403).json({ error: 'Non autorisé' });
    }

    log(`[Activity] ✅ Access granted`);

    // TEST 1: Vérifier si on peut lire la table users
    try {
      const testQuery = await q(`SELECT COUNT(*) as total FROM users WHERE tenant_id = $1`, [tenantId]);
      log(`[Activity] TEST 1: Found ${testQuery.rows[0]?.total || 0} users for tenant ${tenantId}`);
    } catch (testErr) {
      error(`[Activity] TEST 1 FAILED: Cannot query users table:`, testErr.message);
    }

    // TEST 2: Vérifier si les colonnes existent
    let columnsExist = false;
    try {
      await q(`SELECT last_activity, presence_status, current_page FROM users LIMIT 1`);
      columnsExist = true;
      log(`[Activity] TEST 2: ✅ Migration columns exist`);
    } catch (colErr) {
      error(`[Activity] TEST 2 FAILED: Migration columns missing:`, colErr.message);
      // Retourner les utilisateurs sans les colonnes de migration
      log(`[Activity] Falling back to basic user query without migration columns`);
    }

    // TEST 3: Vérifier si les tables existent
    let hasSessionsTable = false;
    let hasLogsTable = false;

    try {
      await q(`SELECT 1 FROM user_sessions LIMIT 1`);
      hasSessionsTable = true;
      log(`[Activity] TEST 3a: ✅ user_sessions table exists and accessible`);
    } catch (e) {
      // Check if it's a permission error (42501) or table doesn't exist (42P01)
      if (e.code === '42501') {
        warn(`[Activity] TEST 3a: ⚠️ user_sessions table exists but permission denied - run GRANT ALL PRIVILEGES ON TABLE user_sessions TO your_db_user;`);
      } else {
        warn(`[Activity] TEST 3a: ❌ user_sessions table does not exist`);
      }
    }

    try {
      await q(`SELECT 1 FROM activity_logs LIMIT 1`);
      hasLogsTable = true;
      log(`[Activity] TEST 3b: ✅ activity_logs table exists and accessible`);
    } catch (e) {
      if (e.code === '42501') {
        warn(`[Activity] TEST 3b: ⚠️ activity_logs table exists but permission denied - run GRANT ALL PRIVILEGES ON TABLE activity_logs TO your_db_user;`);
      } else {
        warn(`[Activity] TEST 3b: ❌ activity_logs table does not exist`);
      }
    }

    let rows = [];

    // Si les colonnes n'existent pas, utiliser une requête très basique
    if (!columnsExist) {
      log(`[Activity] Using BASIC query (no migration columns)`);
      const result = await q(`
        SELECT
          u.id,
          u.first_name,
          u.last_name,
          u.email,
          u.role,
          u.is_active,
          u.last_login,
          u.created_at,
          'offline' as presence_status,
          NULL as last_activity,
          NULL as current_page,
          false as has_active_session,
          NULL as last_session,
          0 as time_online_today,
          0 as actions_today,
          NULL as last_action
        FROM users u
        WHERE u.tenant_id = $1
        AND u.role != 'super_admin'
        ORDER BY u.last_login DESC NULLS LAST
      `, [tenantId]);
      rows = result.rows;
      log(`[Activity] BASIC query returned ${rows.length} users`);
    } else if (hasSessionsTable && hasLogsTable) {
      // Version complète avec toutes les données
      log(`[Activity] Using FULL query with sessions and logs`);

      // D'abord, mettre à jour les statuts de présence
      await q(`
        UPDATE users
        SET presence_status = CASE
          WHEN last_activity >= NOW() - INTERVAL '5 minutes' THEN 'online'
          WHEN last_activity >= NOW() - INTERVAL '15 minutes' THEN 'idle'
          ELSE 'offline'
        END
        WHERE tenant_id = $1
      `, [tenantId]);

      const result = await q(`
        SELECT
          u.id,
          u.first_name,
          u.last_name,
          u.email,
          u.role,
          u.is_active,
          u.last_login,
          u.last_activity,
          u.presence_status,
          u.current_page,
          u.created_at,

          EXISTS(
            SELECT 1 FROM user_sessions us
            WHERE us.user_id = u.id AND us.status = 'active'
          ) as has_active_session,

          (SELECT json_build_object(
            'login_at', us.login_at,
            'device', us.device_type,
            'browser', us.browser,
            'ip', us.ip_address
          ) FROM user_sessions us
          WHERE us.user_id = u.id
          ORDER BY us.login_at DESC LIMIT 1) as last_session,

          COALESCE((
            SELECT SUM(
              CASE
                WHEN us.logout_at IS NOT NULL THEN EXTRACT(EPOCH FROM (us.logout_at - us.login_at))
                WHEN us.status = 'active' THEN EXTRACT(EPOCH FROM (NOW() - us.login_at))
                ELSE 0
              END
            )::INTEGER
            FROM user_sessions us
            WHERE us.user_id = u.id
            AND DATE(us.login_at) = CURRENT_DATE
          ), 0) as time_online_today,

          (SELECT COUNT(*) FROM activity_logs al
           WHERE al.user_id = u.id AND DATE(al.created_at) = CURRENT_DATE) as actions_today,

          (SELECT json_build_object(
            'action', al.action,
            'category', al.category,
            'resource_name', al.resource_name,
            'created_at', al.created_at
          ) FROM activity_logs al
          WHERE al.user_id = u.id
          ORDER BY al.created_at DESC LIMIT 1) as last_action

        FROM users u
        WHERE u.tenant_id = $1
        AND u.role != 'super_admin'
        ORDER BY
          CASE u.presence_status
            WHEN 'online' THEN 1
            WHEN 'idle' THEN 2
            ELSE 3
          END,
          u.last_activity DESC NULLS LAST
      `, [tenantId]);
      rows = result.rows;
      log(`[Activity] FULL query returned ${rows.length} users`);
    } else {
      // Version simplifiée (colonnes OK mais pas les tables)
      log(`[Activity] Using SIMPLIFIED query (columns OK, but missing tables)`);

      // Mettre à jour les statuts de présence
      await q(`
        UPDATE users
        SET presence_status = CASE
          WHEN last_activity >= NOW() - INTERVAL '5 minutes' THEN 'online'
          WHEN last_activity >= NOW() - INTERVAL '15 minutes' THEN 'idle'
          ELSE 'offline'
        END
        WHERE tenant_id = $1
      `, [tenantId]);

      const result = await q(`
        SELECT
          u.id,
          u.first_name,
          u.last_name,
          u.email,
          u.role,
          u.is_active,
          u.last_login,
          u.last_activity,
          u.presence_status,
          u.current_page,
          u.created_at,
          false as has_active_session,
          NULL as last_session,
          0 as time_online_today,
          0 as actions_today,
          NULL as last_action
        FROM users u
        WHERE u.tenant_id = $1
        AND u.role != 'super_admin'
        ORDER BY
          CASE u.presence_status
            WHEN 'online' THEN 1
            WHEN 'idle' THEN 2
            ELSE 3
          END,
          u.last_activity DESC NULLS LAST
      `, [tenantId]);
      rows = result.rows;
      log(`[Activity] SIMPLIFIED query returned ${rows.length} users`);
    }

    // Compter par statut
    const stats = {
      online: rows.filter(u => u.presence_status === 'online').length,
      idle: rows.filter(u => u.presence_status === 'idle').length,
      offline: rows.filter(u => u.presence_status === 'offline' || !u.presence_status).length,
      total: rows.length
    };

    log(`[Activity] ======= RESPONSE =======`);
    log(`[Activity] Returning ${rows.length} users`);
    log(`[Activity] Stats: ${JSON.stringify(stats)}`);

    res.json({ success: true, users: rows, stats });
  } catch (err) {
    error('[Activity] ❌ CRITICAL ERROR in users-status:', err);
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// =============================
// GET /activity/logs
// Récupère les logs d'activité (pour admin)
// =============================
router.get('/logs', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const userRole = req.user.role;
    const { user_id, category, action, limit = 100, offset = 0 } = req.query;

    // Seuls admin peuvent voir tous les logs
    if (!['admin'].includes(userRole) && !req.user.is_super_admin) {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    let query = `
      SELECT
        al.*,
        u.first_name,
        u.last_name,
        u.email as user_email
      FROM activity_logs al
      JOIN users u ON al.user_id = u.id
      WHERE al.tenant_id = $1
    `;
    const params = [tenantId];
    let paramIndex = 2;

    if (user_id) {
      query += ` AND al.user_id = $${paramIndex}`;
      params.push(user_id);
      paramIndex++;
    }

    if (category) {
      query += ` AND al.category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (action) {
      query += ` AND al.action = $${paramIndex}`;
      params.push(action);
      paramIndex++;
    }

    query += ` ORDER BY al.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const { rows } = await q(query, params);

    // Compter le total
    const { rows: countRows } = await q(
      `SELECT COUNT(*) as total FROM activity_logs WHERE tenant_id = $1`,
      [tenantId]
    );

    res.json({
      success: true,
      logs: rows,
      total: parseInt(countRows[0].total),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (err) {
    error('Activity logs error:', err);
    res.status(500).json({ error: err.message });
  }
});

// =============================
// GET /activity/user/:id/history
// Historique d'activité d'un utilisateur spécifique
// =============================
router.get('/user/:id/history', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const userRole = req.user.role;
    const targetUserId = req.params.id;
    const { days = 7 } = req.query;

    // Seuls admin/manager peuvent voir
    if (!['admin', 'manager'].includes(userRole) && !req.user.is_super_admin) {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    // Sessions des X derniers jours
    const { rows: sessions } = await q(`
      SELECT
        us.*,
        EXTRACT(EPOCH FROM (COALESCE(us.logout_at, NOW()) - us.login_at))::INTEGER as duration
      FROM user_sessions us
      WHERE us.user_id = $1 AND us.tenant_id = $2
      AND us.login_at >= NOW() - INTERVAL '${parseInt(days)} days'
      ORDER BY us.login_at DESC
    `, [targetUserId, tenantId]);

    // Actions des X derniers jours
    const { rows: actions } = await q(`
      SELECT
        al.action,
        al.category,
        al.resource_type,
        al.resource_name,
        al.created_at
      FROM activity_logs al
      WHERE al.user_id = $1 AND al.tenant_id = $2
      AND al.created_at >= NOW() - INTERVAL '${parseInt(days)} days'
      ORDER BY al.created_at DESC
      LIMIT 200
    `, [targetUserId, tenantId]);

    // Stats agrégées par jour
    const { rows: dailyStats } = await q(`
      SELECT
        DATE(al.created_at) as date,
        COUNT(*) as total_actions,
        COUNT(DISTINCT al.category) as categories_used
      FROM activity_logs al
      WHERE al.user_id = $1 AND al.tenant_id = $2
      AND al.created_at >= NOW() - INTERVAL '${parseInt(days)} days'
      GROUP BY DATE(al.created_at)
      ORDER BY date DESC
    `, [targetUserId, tenantId]);

    res.json({
      success: true,
      sessions,
      actions,
      daily_stats: dailyStats
    });
  } catch (err) {
    error('User history error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
