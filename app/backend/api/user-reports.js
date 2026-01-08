import { log, error, warn } from "../lib/logger.js";
import express from 'express';
import { authMiddleware as authenticateToken } from '../middleware/auth.js';
import db from '../config/db.js';

const router = express.Router();
const q = (text, params = []) => db.query(text, params);

// =============================
// Helper: Get date range based on period
// =============================
const getDateRange = (period) => {
  const now = new Date();
  let startDate;

  switch (period) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case '7days':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30days':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'quarter':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case 'semester':
      startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
      break;
    case 'year':
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  return { startDate, endDate: now };
};

// =============================
// GET /user-reports/summary
// Get summary report for all users
// =============================
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const userRole = req.user.role;
    const { period = '30days' } = req.query;

    // Only admin and manager can view reports
    if (!['admin', 'manager', 'supervisor'].includes(userRole) && !req.user.is_super_admin) {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    const { startDate, endDate } = getDateRange(period);
    log(`[UserReports] Generating summary for period: ${period} (${startDate.toISOString()} - ${endDate.toISOString()})`);

    const { rows: users } = await q(`
      SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.role,
        u.is_active,
        u.created_at,

        -- Leads assigned in period
        (SELECT COUNT(*) FROM leads l
         WHERE l.assigned_to = u.id
         AND l.tenant_id = $1
         AND l.created_at >= $2 AND l.created_at <= $3) as leads_assigned,

        -- Leads contacted (status changed from cold_call)
        (SELECT COUNT(*) FROM leads l
         WHERE l.assigned_to = u.id
         AND l.tenant_id = $1
         AND l.status NOT IN ('cold_call', 'new', 'to_contact')
         AND l.updated_at >= $2 AND l.updated_at <= $3) as leads_contacted,

        -- Leads qualified
        (SELECT COUNT(*) FROM leads l
         WHERE l.assigned_to = u.id
         AND l.tenant_id = $1
         AND l.status IN ('qualifie', 'tres_qualifie', 'qualified', 'hot')
         AND l.updated_at >= $2 AND l.updated_at <= $3) as leads_qualified,

        -- Proposals sent
        (SELECT COUNT(*) FROM leads l
         WHERE l.assigned_to = u.id
         AND l.tenant_id = $1
         AND l.status IN ('proposition', 'proposal_sent')
         AND l.updated_at >= $2 AND l.updated_at <= $3) as proposals_sent,

        -- Deals won
        (SELECT COUNT(*) FROM leads l
         WHERE l.assigned_to = u.id
         AND l.tenant_id = $1
         AND l.status IN ('gagne', 'won', 'closed_won')
         AND l.updated_at >= $2 AND l.updated_at <= $3) as deals_won,

        -- Deals lost
        (SELECT COUNT(*) FROM leads l
         WHERE l.assigned_to = u.id
         AND l.tenant_id = $1
         AND l.status IN ('perdu', 'lost', 'closed_lost')
         AND l.updated_at >= $2 AND l.updated_at <= $3) as deals_lost,

        -- Tasks completed
        (SELECT COUNT(*) FROM follow_ups f
         WHERE f.user_id = u.id
         AND f.tenant_id = $1
         AND f.completed = true
         AND f.updated_at >= $2 AND f.updated_at <= $3) as tasks_completed,

        -- Tasks pending
        (SELECT COUNT(*) FROM follow_ups f
         WHERE f.user_id = u.id
         AND f.tenant_id = $1
         AND (f.completed = false OR f.completed IS NULL)) as tasks_pending,

        -- Tasks overdue (rappels en retard)
        (SELECT COUNT(*) FROM follow_ups f
         WHERE f.user_id = u.id
         AND f.tenant_id = $1
         AND (f.completed = false OR f.completed IS NULL)
         AND f.scheduled_date < NOW()) as tasks_overdue,

        -- Total rappels pour le calcul du taux
        (SELECT COUNT(*) FROM follow_ups f
         WHERE f.user_id = u.id
         AND f.tenant_id = $1
         AND f.created_at >= $2 AND f.created_at <= $3) as total_rappels,

        -- Temps moyen de réponse aux rappels (en heures)
        (SELECT AVG(EXTRACT(EPOCH FROM (f.completed_at - f.scheduled_date))/3600)
         FROM follow_ups f
         WHERE f.user_id = u.id
         AND f.tenant_id = $1
         AND f.completed = true
         AND f.completed_at IS NOT NULL
         AND f.created_at >= $2 AND f.created_at <= $3) as avg_response_hours,

        -- Emails sent (from email_queue)
        (SELECT COUNT(*) FROM email_queue eq
         WHERE eq.tenant_id = $1
         AND eq.status = 'sent'
         AND eq.sent_at >= $2 AND eq.sent_at <= $3
         AND EXISTS (SELECT 1 FROM campaigns c WHERE c.id = eq.campaign_id AND c.created_by = u.id)) as emails_sent,

        -- Pipeline leads (in active pipeline)
        (SELECT COUNT(*) FROM pipeline_leads pl
         WHERE pl.assigned_user_id = u.id
         AND pl.tenant_id = $1
         AND pl.created_at >= $2 AND pl.created_at <= $3) as pipeline_leads,

        -- Call sessions count
        (SELECT COUNT(*) FROM call_sessions cs
         WHERE cs.user_id = u.id
         AND cs.tenant_id = $1
         AND cs.started_at >= $2 AND cs.started_at <= $3) as call_sessions,

        -- Total call duration (seconds)
        (SELECT COALESCE(SUM(cs.total_duration_seconds), 0)
         FROM call_sessions cs
         WHERE cs.user_id = u.id
         AND cs.tenant_id = $1
         AND cs.started_at >= $2 AND cs.started_at <= $3) as total_call_seconds,

        -- Connection time from user_sessions (if table exists)
        COALESCE((
          SELECT SUM(
            CASE
              WHEN us.logout_at IS NOT NULL THEN EXTRACT(EPOCH FROM (us.logout_at - us.login_at))
              ELSE EXTRACT(EPOCH FROM (NOW() - us.login_at))
            END
          )::INTEGER
          FROM user_sessions us
          WHERE us.user_id = u.id
          AND us.login_at >= $2 AND us.login_at <= $3
        ), 0) as total_connection_seconds,

        -- Activity count
        (SELECT COUNT(*) FROM activity_logs al
         WHERE al.user_id = u.id
         AND al.tenant_id = $1
         AND al.created_at >= $2 AND al.created_at <= $3) as total_activities

      FROM users u
      WHERE u.tenant_id = $1
      AND u.role NOT IN ('super_admin')
      ORDER BY u.first_name, u.last_name
    `, [tenantId, startDate.toISOString(), endDate.toISOString()]);

    // Calculate totals
    const totals = users.reduce((acc, user) => ({
      leads_assigned: acc.leads_assigned + parseInt(user.leads_assigned || 0),
      leads_contacted: acc.leads_contacted + parseInt(user.leads_contacted || 0),
      leads_qualified: acc.leads_qualified + parseInt(user.leads_qualified || 0),
      proposals_sent: acc.proposals_sent + parseInt(user.proposals_sent || 0),
      deals_won: acc.deals_won + parseInt(user.deals_won || 0),
      deals_lost: acc.deals_lost + parseInt(user.deals_lost || 0),
      tasks_completed: acc.tasks_completed + parseInt(user.tasks_completed || 0),
      tasks_pending: acc.tasks_pending + parseInt(user.tasks_pending || 0),
      tasks_overdue: acc.tasks_overdue + parseInt(user.tasks_overdue || 0),
      total_rappels: acc.total_rappels + parseInt(user.total_rappels || 0),
      emails_sent: acc.emails_sent + parseInt(user.emails_sent || 0),
      call_sessions: acc.call_sessions + parseInt(user.call_sessions || 0),
      total_call_seconds: acc.total_call_seconds + parseInt(user.total_call_seconds || 0),
      total_connection_seconds: acc.total_connection_seconds + parseInt(user.total_connection_seconds || 0)
    }), {
      leads_assigned: 0,
      leads_contacted: 0,
      leads_qualified: 0,
      proposals_sent: 0,
      deals_won: 0,
      deals_lost: 0,
      tasks_completed: 0,
      tasks_pending: 0,
      tasks_overdue: 0,
      total_rappels: 0,
      emails_sent: 0,
      call_sessions: 0,
      total_call_seconds: 0,
      total_connection_seconds: 0
    });

    res.json({
      success: true,
      period,
      date_range: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      users: users.map(u => ({
        ...u,
        conversion_rate: parseInt(u.leads_contacted || 0) > 0
          ? ((parseInt(u.deals_won || 0) / parseInt(u.leads_contacted || 0)) * 100).toFixed(1)
          : 0,
        qualification_rate: parseInt(u.leads_assigned || 0) > 0
          ? ((parseInt(u.leads_qualified || 0) / parseInt(u.leads_assigned || 0)) * 100).toFixed(1)
          : 0
      })),
      totals: {
        ...totals,
        conversion_rate: totals.leads_contacted > 0
          ? ((totals.deals_won / totals.leads_contacted) * 100).toFixed(1)
          : 0
      }
    });
  } catch (err) {
    error('[UserReports] Summary error:', err);
    res.status(500).json({ error: err.message });
  }
});

// =============================
// GET /user-reports/user/:id
// Get detailed report for a specific user
// =============================
router.get('/user/:id', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const userRole = req.user.role;
    const targetUserId = req.params.id;
    const { period = '30days' } = req.query;

    // Only admin and manager can view reports (or self)
    if (!['admin', 'manager', 'supervisor'].includes(userRole) && !req.user.is_super_admin && req.user.id !== targetUserId) {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    const { startDate, endDate } = getDateRange(period);

    // Get user info
    const { rows: userRows } = await q(`
      SELECT id, first_name, last_name, email, role, is_active, created_at
      FROM users
      WHERE id = $1 AND tenant_id = $2
    `, [targetUserId, tenantId]);

    if (userRows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const userInfo = userRows[0];

    // Get leads by status
    const { rows: leadsByStatus } = await q(`
      SELECT
        status,
        COUNT(*) as count
      FROM leads
      WHERE assigned_to = $1
      AND tenant_id = $2
      AND updated_at >= $3 AND updated_at <= $4
      GROUP BY status
      ORDER BY count DESC
    `, [targetUserId, tenantId, startDate.toISOString(), endDate.toISOString()]);

    // Get daily activity
    const { rows: dailyActivity } = await q(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as actions
      FROM activity_logs
      WHERE user_id = $1
      AND tenant_id = $2
      AND created_at >= $3 AND created_at <= $4
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `, [targetUserId, tenantId, startDate.toISOString(), endDate.toISOString()]);

    // Get tasks by status
    const { rows: taskStats } = await q(`
      SELECT
        CASE WHEN completed THEN 'completed' ELSE 'pending' END as status,
        type,
        COUNT(*) as count
      FROM follow_ups
      WHERE assigned_to = $1
      AND tenant_id = $2
      AND created_at >= $3 AND created_at <= $4
      GROUP BY completed, type
    `, [targetUserId, tenantId, startDate.toISOString(), endDate.toISOString()]);

    // Get call sessions
    const { rows: callStats } = await q(`
      SELECT
        COUNT(*) as total_sessions,
        COALESCE(SUM(total_duration_seconds), 0) as total_seconds,
        COALESCE(AVG(total_duration_seconds), 0) as avg_seconds,
        COALESCE(SUM(leads_contacted), 0) as leads_contacted,
        COALESCE(SUM(leads_qualified), 0) as leads_qualified
      FROM call_sessions
      WHERE user_id = $1
      AND tenant_id = $2
      AND started_at >= $3 AND started_at <= $4
    `, [targetUserId, tenantId, startDate.toISOString(), endDate.toISOString()]);

    // Get pipeline stats
    const { rows: pipelineStats } = await q(`
      SELECT
        stage,
        COUNT(*) as count
      FROM pipeline_leads
      WHERE assigned_user_id = $1
      AND tenant_id = $2
      AND created_at >= $3 AND created_at <= $4
      GROUP BY stage
    `, [targetUserId, tenantId, startDate.toISOString(), endDate.toISOString()]);

    // Get recent activities
    const { rows: recentActivities } = await q(`
      SELECT
        action,
        category,
        resource_type,
        resource_name,
        created_at
      FROM activity_logs
      WHERE user_id = $1
      AND tenant_id = $2
      AND created_at >= $3 AND created_at <= $4
      ORDER BY created_at DESC
      LIMIT 50
    `, [targetUserId, tenantId, startDate.toISOString(), endDate.toISOString()]);

    // Get connection sessions
    const { rows: connectionSessions } = await q(`
      SELECT
        login_at,
        logout_at,
        device_type,
        browser,
        EXTRACT(EPOCH FROM (COALESCE(logout_at, NOW()) - login_at))::INTEGER as duration_seconds
      FROM user_sessions
      WHERE user_id = $1
      AND tenant_id = $2
      AND login_at >= $3 AND login_at <= $4
      ORDER BY login_at DESC
      LIMIT 30
    `, [targetUserId, tenantId, startDate.toISOString(), endDate.toISOString()]);

    res.json({
      success: true,
      period,
      date_range: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      user: userInfo,
      statistics: {
        leads_by_status: leadsByStatus,
        daily_activity: dailyActivity,
        tasks: taskStats,
        calls: callStats[0] || {},
        pipeline: pipelineStats,
        connection_sessions: connectionSessions
      },
      recent_activities: recentActivities
    });
  } catch (err) {
    error('[UserReports] User detail error:', err);
    res.status(500).json({ error: err.message });
  }
});

// =============================
// GET /user-reports/export
// Export report data (for PDF/Excel generation on frontend)
// =============================
router.get('/export', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const userRole = req.user.role;
    const { period = '30days', user_id } = req.query;

    // Only admin and manager can export
    if (!['admin', 'manager'].includes(userRole) && !req.user.is_super_admin) {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    const { startDate, endDate } = getDateRange(period);

    // Base query for user filter
    const userFilter = user_id ? 'AND u.id = $4' : '';
    const params = user_id
      ? [tenantId, startDate.toISOString(), endDate.toISOString(), user_id]
      : [tenantId, startDate.toISOString(), endDate.toISOString()];

    const { rows } = await q(`
      SELECT
        u.first_name || ' ' || u.last_name as nom_complet,
        u.email,
        u.role,
        u.is_active as actif,

        (SELECT COUNT(*) FROM leads l WHERE l.assigned_to = u.id AND l.tenant_id = $1
         AND l.created_at >= $2 AND l.created_at <= $3) as leads_assignes,

        (SELECT COUNT(*) FROM leads l WHERE l.assigned_to = u.id AND l.tenant_id = $1
         AND l.status NOT IN ('cold_call', 'new', 'to_contact')
         AND l.updated_at >= $2 AND l.updated_at <= $3) as leads_contactes,

        (SELECT COUNT(*) FROM leads l WHERE l.assigned_to = u.id AND l.tenant_id = $1
         AND l.status IN ('qualifie', 'tres_qualifie', 'qualified', 'hot')
         AND l.updated_at >= $2 AND l.updated_at <= $3) as leads_qualifies,

        (SELECT COUNT(*) FROM leads l WHERE l.assigned_to = u.id AND l.tenant_id = $1
         AND l.status IN ('proposition', 'proposal_sent')
         AND l.updated_at >= $2 AND l.updated_at <= $3) as propositions_envoyees,

        (SELECT COUNT(*) FROM leads l WHERE l.assigned_to = u.id AND l.tenant_id = $1
         AND l.status IN ('gagne', 'won', 'closed_won')
         AND l.updated_at >= $2 AND l.updated_at <= $3) as deals_gagnes,

        (SELECT COUNT(*) FROM leads l WHERE l.assigned_to = u.id AND l.tenant_id = $1
         AND l.status IN ('perdu', 'lost', 'closed_lost')
         AND l.updated_at >= $2 AND l.updated_at <= $3) as deals_perdus,

        (SELECT COUNT(*) FROM follow_ups f WHERE f.assigned_to = u.id AND f.tenant_id = $1
         AND f.completed = true AND f.updated_at >= $2 AND f.updated_at <= $3) as taches_completees,

        (SELECT COALESCE(SUM(cs.total_duration_seconds), 0) FROM call_sessions cs
         WHERE cs.user_id = u.id AND cs.tenant_id = $1
         AND cs.started_at >= $2 AND cs.started_at <= $3) as temps_appel_secondes,

        (SELECT COUNT(*) FROM call_sessions cs WHERE cs.user_id = u.id AND cs.tenant_id = $1
         AND cs.started_at >= $2 AND cs.started_at <= $3) as sessions_appel

      FROM users u
      WHERE u.tenant_id = $1
      AND u.role NOT IN ('super_admin')
      ${userFilter}
      ORDER BY u.first_name, u.last_name
    `, params);

    // Get tenant info for report header
    const { rows: tenantRows } = await q(`
      SELECT name, company_name FROM tenants WHERE id = $1
    `, [tenantId]);

    const periodLabels = {
      'today': "Aujourd'hui",
      '7days': '7 derniers jours',
      '30days': '30 derniers jours',
      'quarter': 'Trimestre',
      'semester': 'Semestre',
      'year': 'Année'
    };

    res.json({
      success: true,
      export_data: {
        title: 'Rapport de Performance',
        company: tenantRows[0]?.company_name || tenantRows[0]?.name || 'LeadSynch',
        period_label: periodLabels[period] || period,
        date_range: {
          start: startDate.toLocaleDateString('fr-FR'),
          end: endDate.toLocaleDateString('fr-FR')
        },
        generated_at: new Date().toLocaleString('fr-FR'),
        data: rows
      }
    });
  } catch (err) {
    error('[UserReports] Export error:', err);
    res.status(500).json({ error: err.message });
  }
});

// =============================
// GET /user-reports/evolution
// Get evolution data for charts
// =============================
router.get('/evolution', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const userRole = req.user.role;
    const { period = '30days', user_id } = req.query;

    // Only admin and manager can view reports
    if (!['admin', 'manager', 'supervisor'].includes(userRole) && !req.user.is_super_admin) {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    const { startDate, endDate } = getDateRange(period);

    // Determine grouping interval based on period
    let interval = 'day';
    let dateFormat = 'YYYY-MM-DD';
    if (period === 'year') {
      interval = 'month';
      dateFormat = 'YYYY-MM';
    } else if (period === 'semester' || period === 'quarter') {
      interval = 'week';
      dateFormat = 'IYYY-IW';
    }

    const userFilter = user_id ? 'AND l.assigned_to = $4' : '';
    const userFilterFollowups = user_id ? 'AND f.user_id = $4' : '';
    const params = user_id
      ? [tenantId, startDate.toISOString(), endDate.toISOString(), user_id]
      : [tenantId, startDate.toISOString(), endDate.toISOString()];

    // Get leads evolution
    const { rows: leadsEvolution } = await q(`
      SELECT
        TO_CHAR(DATE_TRUNC('${interval}', created_at), '${dateFormat}') as period,
        COUNT(*) as leads_created,
        COUNT(*) FILTER (WHERE status IN ('qualifie', 'tres_qualifie', 'qualified', 'hot')) as leads_qualified,
        COUNT(*) FILTER (WHERE status IN ('gagne', 'won', 'closed_won')) as deals_won
      FROM leads l
      WHERE l.tenant_id = $1
      AND l.created_at >= $2 AND l.created_at <= $3
      ${userFilter}
      GROUP BY DATE_TRUNC('${interval}', created_at)
      ORDER BY DATE_TRUNC('${interval}', created_at)
    `, params);

    // Get rappels evolution
    const { rows: rappelsEvolution } = await q(`
      SELECT
        TO_CHAR(DATE_TRUNC('${interval}', created_at), '${dateFormat}') as period,
        COUNT(*) as rappels_created,
        COUNT(*) FILTER (WHERE completed = true) as rappels_completed,
        COUNT(*) FILTER (WHERE completed = false AND scheduled_date < NOW()) as rappels_overdue
      FROM follow_ups f
      WHERE f.tenant_id = $1
      AND f.created_at >= $2 AND f.created_at <= $3
      ${userFilterFollowups}
      GROUP BY DATE_TRUNC('${interval}', created_at)
      ORDER BY DATE_TRUNC('${interval}', created_at)
    `, params);

    // Get activity evolution
    const { rows: activityEvolution } = await q(`
      SELECT
        TO_CHAR(DATE_TRUNC('${interval}', created_at), '${dateFormat}') as period,
        COUNT(*) as total_actions,
        COUNT(*) FILTER (WHERE action LIKE '%call%' OR action LIKE '%appel%') as call_actions,
        COUNT(*) FILTER (WHERE action LIKE '%email%' OR action LIKE '%mail%') as email_actions
      FROM activity_logs
      WHERE tenant_id = $1
      AND created_at >= $2 AND created_at <= $3
      ${user_id ? 'AND user_id = $4' : ''}
      GROUP BY DATE_TRUNC('${interval}', created_at)
      ORDER BY DATE_TRUNC('${interval}', created_at)
    `, params);

    // Get pipeline stage evolution (current snapshot per period)
    const { rows: pipelineEvolution } = await q(`
      SELECT
        TO_CHAR(DATE_TRUNC('${interval}', pl.created_at), '${dateFormat}') as period,
        pl.stage,
        COUNT(*) as count
      FROM pipeline_leads pl
      WHERE pl.tenant_id = $1
      AND pl.created_at >= $2 AND pl.created_at <= $3
      ${user_id ? 'AND pl.assigned_user_id = $4' : ''}
      GROUP BY DATE_TRUNC('${interval}', pl.created_at), pl.stage
      ORDER BY DATE_TRUNC('${interval}', pl.created_at)
    `, params);

    res.json({
      success: true,
      period,
      interval,
      date_range: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      evolution: {
        leads: leadsEvolution,
        rappels: rappelsEvolution,
        activity: activityEvolution,
        pipeline: pipelineEvolution
      }
    });
  } catch (err) {
    error('[UserReports] Evolution error:', err);
    res.status(500).json({ error: err.message });
  }
});

// =============================
// GET /user-reports/rappels-stats
// Get detailed rappels statistics
// =============================
router.get('/rappels-stats', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const userRole = req.user.role;
    const { period = '30days' } = req.query;

    // Only admin and manager can view reports
    if (!['admin', 'manager', 'supervisor'].includes(userRole) && !req.user.is_super_admin) {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    const { startDate, endDate } = getDateRange(period);

    // Get rappels stats by user
    const { rows: rappelsByUser } = await q(`
      SELECT
        u.id as user_id,
        u.first_name,
        u.last_name,
        u.email,
        COUNT(f.id) as total_rappels,
        COUNT(*) FILTER (WHERE f.completed = true) as completed_rappels,
        COUNT(*) FILTER (WHERE f.completed = false OR f.completed IS NULL) as pending_rappels,
        COUNT(*) FILTER (WHERE (f.completed = false OR f.completed IS NULL) AND f.scheduled_date < NOW()) as overdue_rappels,

        -- Taux de complétion
        CASE
          WHEN COUNT(f.id) > 0
          THEN ROUND((COUNT(*) FILTER (WHERE f.completed = true)::numeric / COUNT(f.id)::numeric) * 100, 1)
          ELSE 0
        END as completion_rate,

        -- Taux de retard
        CASE
          WHEN COUNT(*) FILTER (WHERE f.completed = false OR f.completed IS NULL) > 0
          THEN ROUND((COUNT(*) FILTER (WHERE (f.completed = false OR f.completed IS NULL) AND f.scheduled_date < NOW())::numeric /
                      COUNT(*) FILTER (WHERE f.completed = false OR f.completed IS NULL)::numeric) * 100, 1)
          ELSE 0
        END as overdue_rate,

        -- Temps moyen de réponse (heures)
        ROUND(AVG(EXTRACT(EPOCH FROM (f.completed_at - f.scheduled_date))/3600) FILTER (WHERE f.completed = true AND f.completed_at IS NOT NULL), 1) as avg_response_hours,

        -- Temps moyen de retard (heures) pour les rappels en retard
        ROUND(AVG(EXTRACT(EPOCH FROM (NOW() - f.scheduled_date))/3600) FILTER (WHERE (f.completed = false OR f.completed IS NULL) AND f.scheduled_date < NOW()), 1) as avg_delay_hours

      FROM users u
      LEFT JOIN follow_ups f ON f.user_id = u.id
        AND f.tenant_id = $1
        AND f.created_at >= $2 AND f.created_at <= $3
      WHERE u.tenant_id = $1
      AND u.role NOT IN ('super_admin')
      AND u.is_active = true
      GROUP BY u.id, u.first_name, u.last_name, u.email
      ORDER BY overdue_rappels DESC, total_rappels DESC
    `, [tenantId, startDate.toISOString(), endDate.toISOString()]);

    // Get rappels by type
    const { rows: rappelsByType } = await q(`
      SELECT
        COALESCE(type, 'non_défini') as type,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE completed = true) as completed,
        COUNT(*) FILTER (WHERE (completed = false OR completed IS NULL) AND scheduled_date < NOW()) as overdue
      FROM follow_ups
      WHERE tenant_id = $1
      AND created_at >= $2 AND created_at <= $3
      GROUP BY type
      ORDER BY count DESC
    `, [tenantId, startDate.toISOString(), endDate.toISOString()]);

    // Get overdue rappels list (top 20)
    const { rows: overdueRappels } = await q(`
      SELECT
        f.id,
        f.title,
        f.type,
        f.scheduled_date,
        f.notes,
        ROUND(EXTRACT(EPOCH FROM (NOW() - f.scheduled_date))/3600, 1) as hours_overdue,
        u.first_name || ' ' || u.last_name as user_name,
        l.company_name as lead_name
      FROM follow_ups f
      JOIN users u ON f.user_id = u.id
      LEFT JOIN leads l ON f.lead_id = l.id
      WHERE f.tenant_id = $1
      AND (f.completed = false OR f.completed IS NULL)
      AND f.scheduled_date < NOW()
      ORDER BY f.scheduled_date ASC
      LIMIT 20
    `, [tenantId]);

    // Calculate global stats
    const totals = rappelsByUser.reduce((acc, u) => ({
      total_rappels: acc.total_rappels + parseInt(u.total_rappels || 0),
      completed_rappels: acc.completed_rappels + parseInt(u.completed_rappels || 0),
      pending_rappels: acc.pending_rappels + parseInt(u.pending_rappels || 0),
      overdue_rappels: acc.overdue_rappels + parseInt(u.overdue_rappels || 0)
    }), { total_rappels: 0, completed_rappels: 0, pending_rappels: 0, overdue_rappels: 0 });

    totals.completion_rate = totals.total_rappels > 0
      ? ((totals.completed_rappels / totals.total_rappels) * 100).toFixed(1)
      : 0;
    totals.overdue_rate = totals.pending_rappels > 0
      ? ((totals.overdue_rappels / totals.pending_rappels) * 100).toFixed(1)
      : 0;

    res.json({
      success: true,
      period,
      date_range: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      totals,
      by_user: rappelsByUser,
      by_type: rappelsByType,
      overdue_list: overdueRappels
    });
  } catch (err) {
    error('[UserReports] Rappels stats error:', err);
    res.status(500).json({ error: err.message });
  }
});

// =============================
// GET /user-reports/performance-score
// Calculate performance score for users
// =============================
router.get('/performance-score', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const userRole = req.user.role;
    const { period = '30days' } = req.query;

    // Only admin and manager can view reports
    if (!['admin', 'manager', 'supervisor'].includes(userRole) && !req.user.is_super_admin) {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    const { startDate, endDate } = getDateRange(period);

    // Calculate performance scores
    const { rows: scores } = await q(`
      WITH user_metrics AS (
        SELECT
          u.id,
          u.first_name,
          u.last_name,
          u.email,
          u.role,

          -- Leads metrics
          (SELECT COUNT(*) FROM leads l WHERE l.assigned_to = u.id AND l.tenant_id = $1
           AND l.created_at >= $2 AND l.created_at <= $3) as leads_assigned,
          (SELECT COUNT(*) FROM leads l WHERE l.assigned_to = u.id AND l.tenant_id = $1
           AND l.status IN ('gagne', 'won', 'closed_won')
           AND l.updated_at >= $2 AND l.updated_at <= $3) as deals_won,

          -- Rappels metrics
          (SELECT COUNT(*) FROM follow_ups f WHERE f.user_id = u.id AND f.tenant_id = $1
           AND f.created_at >= $2 AND f.created_at <= $3) as total_rappels,
          (SELECT COUNT(*) FROM follow_ups f WHERE f.user_id = u.id AND f.tenant_id = $1
           AND f.completed = true
           AND f.created_at >= $2 AND f.created_at <= $3) as rappels_completed,
          (SELECT COUNT(*) FROM follow_ups f WHERE f.user_id = u.id AND f.tenant_id = $1
           AND (f.completed = false OR f.completed IS NULL) AND f.scheduled_date < NOW()) as rappels_overdue,

          -- Activity
          (SELECT COUNT(*) FROM activity_logs al WHERE al.user_id = u.id AND al.tenant_id = $1
           AND al.created_at >= $2 AND al.created_at <= $3) as activity_count,

          -- Pipeline
          (SELECT COUNT(*) FROM pipeline_leads pl WHERE pl.assigned_user_id = u.id AND pl.tenant_id = $1
           AND pl.stage IN ('gagne', 'won')
           AND pl.updated_at >= $2 AND pl.updated_at <= $3) as pipeline_won

        FROM users u
        WHERE u.tenant_id = $1
        AND u.role NOT IN ('super_admin')
        AND u.is_active = true
      )
      SELECT
        *,
        -- Taux de conversion (20 pts max)
        CASE
          WHEN leads_assigned > 0 THEN LEAST((deals_won::float / leads_assigned::float) * 100, 20)
          ELSE 0
        END as conversion_score,

        -- Taux de complétion rappels (25 pts max)
        CASE
          WHEN total_rappels > 0 THEN (rappels_completed::float / total_rappels::float) * 25
          ELSE 0
        END as rappels_score,

        -- Pénalité retards (-15 pts max)
        LEAST(rappels_overdue * 3, 15) as overdue_penalty,

        -- Activité (15 pts max)
        LEAST(activity_count::float / 10, 15) as activity_score,

        -- Pipeline gagné (25 pts max)
        LEAST(pipeline_won * 5, 25) as pipeline_score,

        -- Score total
        GREATEST(0,
          CASE WHEN leads_assigned > 0 THEN LEAST((deals_won::float / leads_assigned::float) * 100, 20) ELSE 0 END +
          CASE WHEN total_rappels > 0 THEN (rappels_completed::float / total_rappels::float) * 25 ELSE 0 END -
          LEAST(rappels_overdue * 3, 15) +
          LEAST(activity_count::float / 10, 15) +
          LEAST(pipeline_won * 5, 25)
        ) as total_score

      FROM user_metrics
      ORDER BY total_score DESC
    `, [tenantId, startDate.toISOString(), endDate.toISOString()]);

    // Calculate rankings and add medals
    const scoredUsers = scores.map((user, index) => ({
      ...user,
      rank: index + 1,
      medal: index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : null,
      total_score: parseFloat(user.total_score || 0).toFixed(1),
      conversion_score: parseFloat(user.conversion_score || 0).toFixed(1),
      rappels_score: parseFloat(user.rappels_score || 0).toFixed(1),
      activity_score: parseFloat(user.activity_score || 0).toFixed(1),
      pipeline_score: parseFloat(user.pipeline_score || 0).toFixed(1)
    }));

    res.json({
      success: true,
      period,
      date_range: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      score_breakdown: {
        conversion: { max: 20, description: 'Taux de conversion leads → deals' },
        rappels: { max: 25, description: 'Taux de complétion des rappels' },
        overdue_penalty: { max: -15, description: 'Pénalité pour rappels en retard' },
        activity: { max: 15, description: 'Volume d\'activité' },
        pipeline: { max: 25, description: 'Deals gagnés dans le pipeline' }
      },
      users: scoredUsers,
      top_performer: scoredUsers[0] || null
    });
  } catch (err) {
    error('[UserReports] Performance score error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
