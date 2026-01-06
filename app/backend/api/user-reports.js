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
         WHERE f.assigned_to = u.id
         AND f.tenant_id = $1
         AND f.completed = true
         AND f.updated_at >= $2 AND f.updated_at <= $3) as tasks_completed,

        -- Tasks pending
        (SELECT COUNT(*) FROM follow_ups f
         WHERE f.assigned_to = u.id
         AND f.tenant_id = $1
         AND f.completed = false) as tasks_pending,

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

export default router;
