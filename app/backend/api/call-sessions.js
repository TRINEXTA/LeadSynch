import { query, queryOne, queryAll, execute } from '../lib/db.js';
import { verifyAuth } from '../middleware/auth.js';

export default async function handler(req, res) {
  // Vérifier l'authentification
  const authResult = await verifyAuth(req);
  if (!authResult.authenticated) {
    return res.status(401).json({ error: 'Non autorisé' });
  }

  const { userId, tenantId, role } = authResult;
  const { method } = req;

  try {
    // GET - Récupérer les sessions
    if (method === 'GET') {
      const { action, period, user_id, session_id, start_date, end_date } = req.query;

      // Récupérer une session spécifique
      if (session_id) {
        const session = await queryOne(
          `SELECT * FROM call_sessions WHERE id = $1 AND tenant_id = $2`,
          [session_id, tenantId]
        );
        return res.json({ success: true, session });
      }

      // Récupérer la session active de l'utilisateur
      if (action === 'active') {
        const session = await queryOne(
          `SELECT * FROM call_sessions
           WHERE user_id = $1 AND tenant_id = $2 AND status IN ('active', 'paused')
           ORDER BY started_at DESC LIMIT 1`,
          [userId, tenantId]
        );
        return res.json({ success: true, session });
      }

      // Récupérer les statistiques par période
      if (action === 'stats') {
        const targetUserId = (role === 'admin' || role === 'manager') && user_id ? user_id : userId;

        let stats;
        if (period === 'daily' || !period) {
          stats = await queryAll(
            `SELECT * FROM call_daily_stats
             WHERE tenant_id = $1 AND user_id = $2
             AND call_date >= COALESCE($3::date, CURRENT_DATE - INTERVAL '30 days')
             AND call_date <= COALESCE($4::date, CURRENT_DATE)
             ORDER BY call_date DESC`,
            [tenantId, targetUserId, start_date || null, end_date || null]
          );
        } else if (period === 'weekly') {
          stats = await queryAll(
            `SELECT * FROM call_weekly_stats
             WHERE tenant_id = $1 AND user_id = $2
             AND week_start >= COALESCE($3::date, CURRENT_DATE - INTERVAL '3 months')
             ORDER BY week_start DESC`,
            [tenantId, targetUserId, start_date || null]
          );
        }

        return res.json({ success: true, stats });
      }

      // Récupérer les objectifs
      if (action === 'objectives') {
        const targetUserId = (role === 'admin' || role === 'manager') && user_id ? user_id : userId;

        const objective = await queryOne(
          `SELECT * FROM call_objectives
           WHERE tenant_id = $1 AND user_id = $2
           AND effective_from <= CURRENT_DATE
           AND (effective_until IS NULL OR effective_until >= CURRENT_DATE)
           ORDER BY effective_from DESC LIMIT 1`,
          [tenantId, targetUserId]
        );

        // Objectifs par défaut si aucun n'est défini
        const defaultObjectives = {
          daily_target_minutes: 240,
          weekly_target_minutes: 1200,
          monthly_target_minutes: 4800
        };

        return res.json({
          success: true,
          objectives: objective || defaultObjectives
        });
      }

      // Récupérer le résumé pour le tableau de bord (admin/manager)
      if (action === 'team-summary') {
        if (role !== 'admin' && role !== 'manager') {
          return res.status(403).json({ error: 'Accès refusé' });
        }

        const today = new Date().toISOString().split('T')[0];
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
        const weekStartStr = weekStart.toISOString().split('T')[0];
        const monthStart = new Date();
        monthStart.setDate(1);
        const monthStartStr = monthStart.toISOString().split('T')[0];

        const teamStats = await queryAll(
          `SELECT
             u.id as user_id,
             u.first_name,
             u.last_name,
             u.email,
             u.role,

             -- Aujourd'hui
             COALESCE((
               SELECT SUM(total_duration - pause_duration)
               FROM call_sessions
               WHERE user_id = u.id AND tenant_id = $1 AND DATE(started_at) = $2
             ), 0) as today_seconds,

             -- Cette semaine
             COALESCE((
               SELECT SUM(total_duration - pause_duration)
               FROM call_sessions
               WHERE user_id = u.id AND tenant_id = $1 AND DATE(started_at) >= $3
             ), 0) as week_seconds,

             -- Ce mois
             COALESCE((
               SELECT SUM(total_duration - pause_duration)
               FROM call_sessions
               WHERE user_id = u.id AND tenant_id = $1 AND DATE(started_at) >= $4
             ), 0) as month_seconds,

             -- Leads traités aujourd'hui
             COALESCE((
               SELECT SUM(leads_processed)
               FROM call_sessions
               WHERE user_id = u.id AND tenant_id = $1 AND DATE(started_at) = $2
             ), 0) as today_leads,

             -- Leads qualifiés aujourd'hui
             COALESCE((
               SELECT SUM(leads_qualified)
               FROM call_sessions
               WHERE user_id = u.id AND tenant_id = $1 AND DATE(started_at) = $2
             ), 0) as today_qualified,

             -- RDV aujourd'hui
             COALESCE((
               SELECT SUM(leads_rdv)
               FROM call_sessions
               WHERE user_id = u.id AND tenant_id = $1 AND DATE(started_at) = $2
             ), 0) as today_rdv,

             -- Objectif journalier
             COALESCE((
               SELECT daily_target_minutes * 60
               FROM call_objectives
               WHERE user_id = u.id AND tenant_id = $1
               AND effective_from <= CURRENT_DATE
               AND (effective_until IS NULL OR effective_until >= CURRENT_DATE)
               ORDER BY effective_from DESC LIMIT 1
             ), 14400) as daily_target_seconds,

             -- Session active?
             EXISTS(
               SELECT 1 FROM call_sessions
               WHERE user_id = u.id AND tenant_id = $1 AND status IN ('active', 'paused')
             ) as has_active_session

           FROM users u
           WHERE u.tenant_id = $1 AND u.role IN ('user', 'manager')
           ORDER BY u.first_name, u.last_name`,
          [tenantId, today, weekStartStr, monthStartStr]
        );

        return res.json({ success: true, team: teamStats });
      }

      // Liste des sessions historiques
      const targetUserId = (role === 'admin' || role === 'manager') && user_id ? user_id : userId;
      const sessions = await queryAll(
        `SELECT cs.*, c.name as campaign_name
         FROM call_sessions cs
         LEFT JOIN campaigns c ON c.id = cs.campaign_id
         WHERE cs.tenant_id = $1 AND cs.user_id = $2
         ORDER BY cs.started_at DESC
         LIMIT 50`,
        [tenantId, targetUserId]
      );

      return res.json({ success: true, sessions });
    }

    // POST - Créer/Gérer une session
    if (method === 'POST') {
      const { action, session_id, campaign_id, filter_type, lead_id, qualification, notes, rdv_scheduled_at, rdv_type, pause_reason } = req.body;

      // Démarrer une nouvelle session
      if (action === 'start') {
        // Vérifier s'il y a déjà une session active
        const existingSession = await queryOne(
          `SELECT * FROM call_sessions
           WHERE user_id = $1 AND tenant_id = $2 AND status IN ('active', 'paused')`,
          [userId, tenantId]
        );

        // Si une session existe, la terminer automatiquement et en créer une nouvelle
        if (existingSession) {
          await execute(
            `UPDATE call_sessions
             SET status = 'completed', ended_at = NOW(), updated_at = NOW()
             WHERE id = $1`,
            [existingSession.id]
          );
          console.log(`Session ${existingSession.id} terminée automatiquement`);
        }

        // Créer la nouvelle session avec valeurs numériques à 0
        const newSession = await queryOne(
          `INSERT INTO call_sessions (tenant_id, user_id, campaign_id, filter_type, started_at, status,
                                      calls_made, leads_processed, leads_qualified, leads_rdv,
                                      total_duration, pause_duration)
           VALUES ($1, $2, $3, $4, NOW(), 'active', 0, 0, 0, 0, 0, 0)
           RETURNING *`,
          [tenantId, userId, campaign_id || null, filter_type || 'all']
        );

        return res.json({ success: true, session: newSession });
      }

      // Mettre en pause
      if (action === 'pause') {
        if (!session_id) {
          return res.status(400).json({ error: 'session_id requis' });
        }

        // Vérifier que c'est la session de l'utilisateur
        const session = await queryOne(
          `SELECT * FROM call_sessions WHERE id = $1 AND user_id = $2 AND tenant_id = $3`,
          [session_id, userId, tenantId]
        );

        if (!session) {
          return res.status(404).json({ error: 'Session non trouvée' });
        }

        if (session.status !== 'active') {
          return res.status(400).json({ error: 'La session n\'est pas active' });
        }

        // Créer une entrée de pause
        await execute(
          `INSERT INTO call_session_pauses (session_id, started_at, reason)
           VALUES ($1, NOW(), $2)`,
          [session_id, pause_reason || null]
        );

        // Mettre à jour le status
        const updatedSession = await queryOne(
          `UPDATE call_sessions SET status = 'paused', updated_at = NOW()
           WHERE id = $1 RETURNING *`,
          [session_id]
        );

        return res.json({ success: true, session: updatedSession });
      }

      // Reprendre
      if (action === 'resume') {
        if (!session_id) {
          return res.status(400).json({ error: 'session_id requis' });
        }

        const session = await queryOne(
          `SELECT * FROM call_sessions WHERE id = $1 AND user_id = $2 AND tenant_id = $3`,
          [session_id, userId, tenantId]
        );

        if (!session) {
          return res.status(404).json({ error: 'Session non trouvée' });
        }

        if (session.status !== 'paused') {
          return res.status(400).json({ error: 'La session n\'est pas en pause' });
        }

        // Terminer la pause et calculer la durée
        await execute(
          `UPDATE call_session_pauses
           SET ended_at = NOW(),
               duration = EXTRACT(EPOCH FROM (NOW() - started_at))::integer
           WHERE session_id = $1 AND ended_at IS NULL`,
          [session_id]
        );

        // Calculer le total des pauses
        const pauseTotal = await queryOne(
          `SELECT COALESCE(SUM(duration), 0) as total FROM call_session_pauses WHERE session_id = $1`,
          [session_id]
        );

        // Reprendre la session
        const updatedSession = await queryOne(
          `UPDATE call_sessions
           SET status = 'active',
               pause_duration = $2,
               updated_at = NOW()
           WHERE id = $1 RETURNING *`,
          [session_id, pauseTotal.total]
        );

        return res.json({ success: true, session: updatedSession });
      }

      // Terminer la session
      if (action === 'end') {
        if (!session_id) {
          return res.status(400).json({ error: 'session_id requis' });
        }

        const session = await queryOne(
          `SELECT * FROM call_sessions WHERE id = $1 AND user_id = $2 AND tenant_id = $3`,
          [session_id, userId, tenantId]
        );

        if (!session) {
          return res.status(404).json({ error: 'Session non trouvée' });
        }

        // Terminer toutes les pauses en cours
        await execute(
          `UPDATE call_session_pauses
           SET ended_at = NOW(),
               duration = EXTRACT(EPOCH FROM (NOW() - started_at))::integer
           WHERE session_id = $1 AND ended_at IS NULL`,
          [session_id]
        );

        // Calculer le total des pauses
        const pauseTotal = await queryOne(
          `SELECT COALESCE(SUM(duration), 0) as total FROM call_session_pauses WHERE session_id = $1`,
          [session_id]
        );

        // Calculer la durée totale
        const totalDuration = Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000);

        // Terminer la session
        const updatedSession = await queryOne(
          `UPDATE call_sessions
           SET status = 'completed',
               ended_at = NOW(),
               total_duration = $2,
               pause_duration = $3,
               updated_at = NOW()
           WHERE id = $1 RETURNING *`,
          [session_id, totalDuration, pauseTotal.total]
        );

        return res.json({ success: true, session: updatedSession });
      }

      // Enregistrer un appel/action
      if (action === 'log-call') {
        if (!session_id) {
          return res.status(400).json({ error: 'session_id requis' });
        }

        // Créer le log d'appel
        const callLog = await queryOne(
          `INSERT INTO call_logs (tenant_id, session_id, user_id, lead_id, pipeline_lead_id,
                                  started_at, ended_at, duration, outcome, qualification, notes,
                                  rdv_scheduled_at, rdv_type)
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8, $9, $10, $11, $12)
           RETURNING *`,
          [
            tenantId,
            session_id,
            userId,
            req.body.lead_id || null,
            req.body.pipeline_lead_id || null,
            req.body.call_started_at || new Date().toISOString(),
            req.body.duration || 0,
            req.body.outcome || qualification,
            qualification,
            notes || null,
            rdv_scheduled_at || null,
            rdv_type || null
          ]
        );

        // Mettre à jour les stats de la session (COALESCE pour gérer les NULL existants)
        const isQualified = ['qualifie', 'tres_qualifie'].includes(qualification);
        const isRDV = qualification === 'tres_qualifie' || rdv_scheduled_at;

        await execute(
          `UPDATE call_sessions
           SET leads_processed = COALESCE(leads_processed, 0) + 1,
               leads_qualified = COALESCE(leads_qualified, 0) + $2,
               leads_rdv = COALESCE(leads_rdv, 0) + $3,
               calls_made = COALESCE(calls_made, 0) + 1,
               updated_at = NOW()
           WHERE id = $1`,
          [session_id, isQualified ? 1 : 0, isRDV ? 1 : 0]
        );

        return res.json({ success: true, call_log: callLog });
      }

      // Mettre à jour les stats en temps réel
      if (action === 'update-stats') {
        if (!session_id) {
          return res.status(400).json({ error: 'session_id requis' });
        }

        const { total_duration, leads_processed, leads_qualified, leads_rdv } = req.body;

        const updatedSession = await queryOne(
          `UPDATE call_sessions
           SET total_duration = COALESCE($2, total_duration),
               leads_processed = COALESCE($3, leads_processed),
               leads_qualified = COALESCE($4, leads_qualified),
               leads_rdv = COALESCE($5, leads_rdv),
               updated_at = NOW()
           WHERE id = $1 AND user_id = $6 AND tenant_id = $7
           RETURNING *`,
          [session_id, total_duration, leads_processed, leads_qualified, leads_rdv, userId, tenantId]
        );

        return res.json({ success: true, session: updatedSession });
      }

      // Log un appel directement (sans session préalable - pour QuickCallModal)
      if (action === 'log-call-direct') {
        const { lead_id, pipeline_lead_id, duration, qualification, notes, outcome } = req.body;

        // Créer ou récupérer une session "quick" pour aujourd'hui
        let quickSession = await queryOne(
          `SELECT id FROM call_sessions
           WHERE user_id = $1 AND tenant_id = $2
           AND DATE(started_at) = CURRENT_DATE
           AND filter_type = 'quick_calls'
           ORDER BY started_at DESC LIMIT 1`,
          [userId, tenantId]
        );

        if (!quickSession) {
          // Créer une session "quick" pour les appels hors mode prospection
          quickSession = await queryOne(
            `INSERT INTO call_sessions (tenant_id, user_id, filter_type, started_at, status,
                                        calls_made, leads_processed, leads_qualified, leads_rdv,
                                        total_duration, pause_duration)
             VALUES ($1, $2, 'quick_calls', NOW(), 'active', 0, 0, 0, 0, 0, 0)
             RETURNING id`,
            [tenantId, userId]
          );
        }

        // Enregistrer l'appel dans call_logs
        const callLog = await queryOne(
          `INSERT INTO call_logs (tenant_id, session_id, user_id, lead_id, pipeline_lead_id,
                                  started_at, ended_at, duration, outcome, qualification, notes)
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), $6, $7, $8, $9)
           RETURNING *`,
          [
            tenantId,
            quickSession.id,
            userId,
            lead_id || null,
            pipeline_lead_id || null,
            duration || 0,
            outcome || qualification,
            qualification,
            notes || null
          ]
        );

        // Mettre à jour les stats de la session quick
        const isQualified = ['qualifie', 'tres_qualifie'].includes(qualification);
        const isRDV = qualification === 'tres_qualifie';

        await execute(
          `UPDATE call_sessions
           SET leads_processed = COALESCE(leads_processed, 0) + 1,
               leads_qualified = COALESCE(leads_qualified, 0) + $2,
               leads_rdv = COALESCE(leads_rdv, 0) + $3,
               calls_made = COALESCE(calls_made, 0) + 1,
               total_duration = COALESCE(total_duration, 0) + $4,
               updated_at = NOW()
           WHERE id = $1`,
          [quickSession.id, isQualified ? 1 : 0, isRDV ? 1 : 0, duration || 0]
        );

        return res.json({ success: true, call_log: callLog });
      }

      return res.status(400).json({ error: 'Action non reconnue' });
    }

    // PUT - Mettre à jour les objectifs
    if (method === 'PUT') {
      const { user_id: targetUserId, daily_target_minutes, weekly_target_minutes, monthly_target_minutes } = req.body;

      // Seuls les admins/managers peuvent définir des objectifs
      if (role !== 'admin' && role !== 'manager') {
        return res.status(403).json({ error: 'Accès refusé' });
      }

      const targetUser = targetUserId || userId;

      // Désactiver les anciens objectifs
      await execute(
        `UPDATE call_objectives
         SET effective_until = CURRENT_DATE - INTERVAL '1 day'
         WHERE user_id = $1 AND tenant_id = $2 AND effective_until IS NULL`,
        [targetUser, tenantId]
      );

      // Créer le nouvel objectif
      const objective = await queryOne(
        `INSERT INTO call_objectives (tenant_id, user_id, daily_target_minutes, weekly_target_minutes, monthly_target_minutes, set_by, effective_from)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE)
         RETURNING *`,
        [tenantId, targetUser, daily_target_minutes || 240, weekly_target_minutes || 1200, monthly_target_minutes || 4800, userId]
      );

      return res.json({ success: true, objective });
    }

    return res.status(405).json({ error: 'Méthode non autorisée' });
  } catch (error) {
    console.error('Erreur call-sessions:', error);
    return res.status(500).json({ error: error.message });
  }
}
