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
    case 'yesterday':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
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
// Helper: Check if table exists
// =============================
const tableExists = async (tableName) => {
  try {
    const result = await q(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = $1
      )
    `, [tableName]);
    return result.rows[0]?.exists || false;
  } catch (e) {
    return false;
  }
};

// =============================
// GET /user-reports/users
// Get list of users for filter dropdown
// =============================
router.get('/users', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;

    const { rows } = await q(`
      SELECT id, first_name, last_name, email, role, is_active
      FROM users
      WHERE tenant_id = $1 AND role NOT IN ('super_admin')
      ORDER BY first_name, last_name
    `, [tenantId]);

    res.json({ success: true, users: rows });
  } catch (err) {
    error('[UserReports] Users list error:', err);
    res.status(500).json({ error: err.message });
  }
});

// =============================
// GET /user-reports/report
// Main report endpoint - single user or all users
// =============================
router.get('/report', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const userRole = req.user.role;
    const { period = '30days', user_id } = req.query;

    // Check permissions
    if (!['admin', 'manager', 'supervisor'].includes(userRole) && !req.user.is_super_admin) {
      // Users can only see their own report
      if (user_id && user_id !== req.user.id) {
        return res.status(403).json({ error: 'Non autorisé' });
      }
    }

    const { startDate, endDate } = getDateRange(period);
    log(`[UserReports] Generating report for period: ${period}, user: ${user_id || 'all'}`);

    // Check which tables exist
    const hasCallSessions = await tableExists('call_sessions');
    const hasCallLogs = await tableExists('call_logs');
    const hasEmailQueue = await tableExists('email_queue');
    const hasEmailTracking = await tableExists('email_tracking');
    const hasPipelineLeads = await tableExists('pipeline_leads');
    const hasProspectionSessions = await tableExists('prospection_sessions');

    // Build user filter
    const userFilter = user_id ? 'AND u.id = $4' : '';
    const params = user_id
      ? [tenantId, startDate.toISOString(), endDate.toISOString(), user_id]
      : [tenantId, startDate.toISOString(), endDate.toISOString()];

    // =============================
    // 1. USER INFO + LEADS STATS
    // =============================
    const { rows: users } = await q(`
      SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.role,
        u.is_active,

        -- Leads assignés (total)
        (SELECT COUNT(*) FROM leads l
         WHERE l.assigned_to = u.id AND l.tenant_id = $1) as total_leads_assigned,

        -- Leads assignés dans la période
        (SELECT COUNT(*) FROM leads l
         WHERE l.assigned_to = u.id AND l.tenant_id = $1
         AND l.created_at >= $2 AND l.created_at <= $3) as leads_assigned_period,

        -- Leads par status
        (SELECT COUNT(*) FROM leads l
         WHERE l.assigned_to = u.id AND l.tenant_id = $1
         AND l.status IN ('qualifie', 'tres_qualifie', 'qualified', 'hot')) as leads_qualified,

        (SELECT COUNT(*) FROM leads l
         WHERE l.assigned_to = u.id AND l.tenant_id = $1
         AND l.status IN ('gagne', 'won', 'closed_won')) as leads_won,

        (SELECT COUNT(*) FROM leads l
         WHERE l.assigned_to = u.id AND l.tenant_id = $1
         AND l.status IN ('perdu', 'lost', 'closed_lost')) as leads_lost,

        -- Rappels
        (SELECT COUNT(*) FROM follow_ups f
         WHERE f.user_id = u.id AND f.tenant_id = $1
         AND f.created_at >= $2 AND f.created_at <= $3) as rappels_total,

        (SELECT COUNT(*) FROM follow_ups f
         WHERE f.user_id = u.id AND f.tenant_id = $1
         AND f.completed = true
         AND f.completed_at >= $2 AND f.completed_at <= $3) as rappels_completed,

        (SELECT COUNT(*) FROM follow_ups f
         WHERE f.user_id = u.id AND f.tenant_id = $1
         AND (f.completed = false OR f.completed IS NULL)
         AND f.scheduled_date < NOW()) as rappels_overdue,

        -- Campagnes créées
        (SELECT COUNT(*) FROM campaigns c
         WHERE c.created_by = u.id AND c.tenant_id = $1
         AND c.created_at >= $2 AND c.created_at <= $3) as campaigns_created,

        -- Campagnes où l'user est assigné (JSON array check)
        (SELECT COUNT(DISTINCT c.id) FROM campaigns c
         WHERE c.tenant_id = $1
         AND (
           c.assigned_users::jsonb @> to_jsonb(u.id::text)
           OR c.assigned_users::jsonb @> to_jsonb(ARRAY[u.id::text])
           OR c.supervisor_id = u.id
           OR c.created_by = u.id
         )) as campaigns_assigned,

        -- Total leads dans les campagnes assignées
        (SELECT COALESCE(SUM(c.total_leads), 0) FROM campaigns c
         WHERE c.tenant_id = $1
         AND (
           c.assigned_users::jsonb @> to_jsonb(u.id::text)
           OR c.assigned_users::jsonb @> to_jsonb(ARRAY[u.id::text])
           OR c.supervisor_id = u.id
         )) as campaigns_total_leads

      FROM users u
      WHERE u.tenant_id = $1
      AND u.role NOT IN ('super_admin')
      ${userFilter}
      ORDER BY u.first_name, u.last_name
    `, params);

    // =============================
    // 2. CALL STATS (if tables exist)
    // =============================
    let callStats = {};
    if (hasCallSessions) {
      try {
        const { rows: calls } = await q(`
          SELECT
            cs.user_id,
            COUNT(cs.id) as sessions_count,
            COALESCE(SUM(cs.total_duration), 0) as total_duration_seconds,
            COALESCE(SUM(cs.calls_made), 0) as calls_made,
            COALESCE(SUM(cs.leads_processed), 0) as leads_processed,
            COALESCE(SUM(cs.leads_qualified), 0) as leads_qualified_calls,
            COALESCE(SUM(cs.leads_rdv), 0) as rdv_pris
          FROM call_sessions cs
          WHERE cs.tenant_id = $1
          AND cs.started_at >= $2 AND cs.started_at <= $3
          ${user_id ? 'AND cs.user_id = $4' : ''}
          GROUP BY cs.user_id
        `, params);

        calls.forEach(c => {
          callStats[c.user_id] = {
            sessions: parseInt(c.sessions_count || 0),
            duration_seconds: parseInt(c.total_duration_seconds || 0),
            calls_made: parseInt(c.calls_made || 0),
            leads_processed: parseInt(c.leads_processed || 0),
            leads_qualified: parseInt(c.leads_qualified_calls || 0),
            rdv_pris: parseInt(c.rdv_pris || 0)
          };
        });
      } catch (e) {
        warn('[UserReports] call_sessions query failed:', e.message);
      }
    }

    // Call logs for more detailed stats
    if (hasCallLogs) {
      try {
        const { rows: logs } = await q(`
          SELECT
            cl.user_id,
            COUNT(*) as total_calls,
            COALESCE(SUM(cl.duration), 0) as total_duration,
            COUNT(*) FILTER (WHERE cl.qualification IN ('qualifie', 'tres_qualifie')) as calls_qualified,
            COUNT(*) FILTER (WHERE cl.qualification = 'tres_qualifie' OR cl.rdv_scheduled_at IS NOT NULL) as calls_rdv,
            COUNT(*) FILTER (WHERE cl.qualification = 'nrp' OR cl.outcome = 'nrp') as calls_nrp,
            COUNT(*) FILTER (WHERE cl.qualification IN ('pas_interesse', 'hors_cible', 'rejected') OR cl.outcome = 'rejected') as calls_rejected
          FROM call_logs cl
          WHERE cl.tenant_id = $1
          AND cl.started_at >= $2 AND cl.started_at <= $3
          ${user_id ? 'AND cl.user_id = $4' : ''}
          GROUP BY cl.user_id
        `, params);

        logs.forEach(l => {
          if (!callStats[l.user_id]) callStats[l.user_id] = {};
          callStats[l.user_id].calls_logged = parseInt(l.total_calls || 0);
          callStats[l.user_id].duration_from_logs = parseInt(l.total_duration || 0);
          callStats[l.user_id].calls_qualified = parseInt(l.calls_qualified || 0);
          callStats[l.user_id].calls_rdv = parseInt(l.calls_rdv || 0);
          callStats[l.user_id].calls_nrp = parseInt(l.calls_nrp || 0);
          callStats[l.user_id].calls_rejected = parseInt(l.calls_rejected || 0);
        });
      } catch (e) {
        warn('[UserReports] call_logs query failed:', e.message);
      }
    }

    // Prospection sessions (alternative call tracking)
    if (hasProspectionSessions) {
      try {
        const { rows: prospection } = await q(`
          SELECT
            ps.user_id,
            COUNT(ps.id) as sessions_count,
            COALESCE(SUM(ps.total_duration), 0) as total_duration,
            COALESCE(SUM(ps.calls_made), 0) as calls_made,
            COALESCE(SUM(ps.meetings_obtained), 0) as meetings_obtained,
            COALESCE(SUM(ps.docs_sent), 0) as docs_sent,
            COALESCE(SUM(ps.follow_ups_created), 0) as follow_ups_created,
            COALESCE(SUM(ps.disqualified), 0) as disqualified,
            COALESCE(SUM(ps.nrp), 0) as nrp
          FROM prospection_sessions ps
          WHERE ps.tenant_id = $1
          AND ps.start_time >= $2 AND ps.start_time <= $3
          ${user_id ? 'AND ps.user_id = $4' : ''}
          GROUP BY ps.user_id
        `, params);

        prospection.forEach(p => {
          if (!callStats[p.user_id]) callStats[p.user_id] = {};
          // Add prospection data to callStats (merge with call_sessions if both exist)
          callStats[p.user_id].prospection_sessions = parseInt(p.sessions_count || 0);
          callStats[p.user_id].prospection_duration = parseInt(p.total_duration || 0);
          callStats[p.user_id].prospection_calls = parseInt(p.calls_made || 0);
          callStats[p.user_id].meetings_obtained = parseInt(p.meetings_obtained || 0);
          callStats[p.user_id].docs_sent = parseInt(p.docs_sent || 0);
          callStats[p.user_id].prospection_followups = parseInt(p.follow_ups_created || 0);
          callStats[p.user_id].disqualified = parseInt(p.disqualified || 0);
          callStats[p.user_id].prospection_nrp = parseInt(p.nrp || 0);

          // Merge totals if not already set
          if (!callStats[p.user_id].sessions) {
            callStats[p.user_id].sessions = parseInt(p.sessions_count || 0);
          } else {
            callStats[p.user_id].sessions += parseInt(p.sessions_count || 0);
          }
          if (!callStats[p.user_id].duration_seconds) {
            callStats[p.user_id].duration_seconds = parseInt(p.total_duration || 0);
          } else {
            callStats[p.user_id].duration_seconds += parseInt(p.total_duration || 0);
          }
          if (!callStats[p.user_id].calls_made) {
            callStats[p.user_id].calls_made = parseInt(p.calls_made || 0);
          } else {
            callStats[p.user_id].calls_made += parseInt(p.calls_made || 0);
          }
          if (!callStats[p.user_id].rdv_pris) {
            callStats[p.user_id].rdv_pris = parseInt(p.meetings_obtained || 0);
          } else {
            callStats[p.user_id].rdv_pris += parseInt(p.meetings_obtained || 0);
          }
        });
      } catch (e) {
        warn('[UserReports] prospection_sessions query failed:', e.message);
      }
    }

    // =============================
    // 3. EMAIL STATS (if tables exist)
    // =============================
    let emailStats = {};
    if (hasEmailQueue) {
      try {
        // Emails sent by campaigns created by user
        const { rows: emails } = await q(`
          SELECT
            c.created_by as user_id,
            COUNT(eq.id) as emails_total,
            COUNT(*) FILTER (WHERE eq.status = 'sent') as emails_sent,
            COUNT(*) FILTER (WHERE eq.status = 'failed') as emails_failed,
            COUNT(*) FILTER (WHERE eq.status = 'bounced') as emails_bounced
          FROM email_queue eq
          JOIN campaigns c ON c.id = eq.campaign_id
          WHERE eq.tenant_id = $1
          AND eq.created_at >= $2 AND eq.created_at <= $3
          ${user_id ? 'AND c.created_by = $4' : ''}
          GROUP BY c.created_by
        `, params);

        emails.forEach(e => {
          emailStats[e.user_id] = {
            total: parseInt(e.emails_total || 0),
            sent: parseInt(e.emails_sent || 0),
            failed: parseInt(e.emails_failed || 0),
            bounced: parseInt(e.emails_bounced || 0)
          };
        });
      } catch (e) {
        warn('[UserReports] email_queue query failed:', e.message);
      }
    }

    // Email tracking for opens/clicks
    if (hasEmailTracking) {
      try {
        const { rows: tracking } = await q(`
          SELECT
            c.created_by as user_id,
            COUNT(*) FILTER (WHERE et.event_type = 'open') as opens,
            COUNT(*) FILTER (WHERE et.event_type = 'click') as clicks,
            COUNT(*) FILTER (WHERE et.event_type = 'unsubscribe') as unsubscribes
          FROM email_tracking et
          JOIN campaigns c ON c.id = et.campaign_id
          WHERE et.tenant_id = $1
          AND et.created_at >= $2 AND et.created_at <= $3
          ${user_id ? 'AND c.created_by = $4' : ''}
          GROUP BY c.created_by
        `, params);

        tracking.forEach(t => {
          if (!emailStats[t.user_id]) emailStats[t.user_id] = {};
          emailStats[t.user_id].opens = parseInt(t.opens || 0);
          emailStats[t.user_id].clicks = parseInt(t.clicks || 0);
          emailStats[t.user_id].unsubscribes = parseInt(t.unsubscribes || 0);
        });
      } catch (e) {
        warn('[UserReports] email_tracking query failed:', e.message);
      }
    }

    // =============================
    // 4. PIPELINE STATS (if table exists)
    // =============================
    let pipelineStats = {};
    if (hasPipelineLeads) {
      try {
        const { rows: pipeline } = await q(`
          SELECT
            pl.assigned_user_id as user_id,
            pl.stage,
            COUNT(*) as count
          FROM pipeline_leads pl
          WHERE pl.tenant_id = $1
          AND pl.updated_at >= $2 AND pl.updated_at <= $3
          ${user_id ? 'AND pl.assigned_user_id = $4' : ''}
          GROUP BY pl.assigned_user_id, pl.stage
        `, params);

        pipeline.forEach(p => {
          if (!pipelineStats[p.user_id]) pipelineStats[p.user_id] = {};
          pipelineStats[p.user_id][p.stage] = parseInt(p.count || 0);
        });
      } catch (e) {
        warn('[UserReports] pipeline_leads query failed:', e.message);
      }
    }

    // =============================
    // 5. BUILD FINAL RESPONSE
    // =============================
    const enrichedUsers = users.map(user => {
      const calls = callStats[user.id] || {};
      const emails = emailStats[user.id] || {};
      const pipeline = pipelineStats[user.id] || {};

      return {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role,
        is_active: user.is_active,

        // Leads
        leads: {
          total_assigned: parseInt(user.total_leads_assigned || 0),
          assigned_period: parseInt(user.leads_assigned_period || 0),
          qualified: parseInt(user.leads_qualified || 0),
          won: parseInt(user.leads_won || 0),
          lost: parseInt(user.leads_lost || 0)
        },

        // Rappels
        rappels: {
          total: parseInt(user.rappels_total || 0),
          completed: parseInt(user.rappels_completed || 0),
          overdue: parseInt(user.rappels_overdue || 0),
          pending: parseInt(user.rappels_total || 0) - parseInt(user.rappels_completed || 0)
        },

        // Campagnes
        campaigns: {
          created: parseInt(user.campaigns_created || 0),
          assigned: parseInt(user.campaigns_assigned || 0),
          total_leads: parseInt(user.campaigns_total_leads || 0)
        },

        // Appels (merge call_sessions + prospection_sessions)
        calls: {
          sessions: calls.sessions || 0,
          duration_minutes: Math.round((calls.duration_seconds || calls.duration_from_logs || 0) / 60),
          calls_made: calls.calls_made || calls.calls_logged || 0,
          leads_processed: calls.leads_processed || 0,
          qualified: calls.leads_qualified || calls.calls_qualified || 0,
          rdv_pris: calls.rdv_pris || calls.calls_rdv || calls.meetings_obtained || 0,
          nrp: calls.calls_nrp || calls.prospection_nrp || 0,
          rejected: calls.calls_rejected || 0,
          docs_sent: calls.docs_sent || 0,
          disqualified: calls.disqualified || 0
        },

        // Emails
        emails: {
          sent: emails.sent || 0,
          opens: emails.opens || 0,
          clicks: emails.clicks || 0,
          failed: emails.failed || 0,
          bounced: emails.bounced || 0,
          open_rate: emails.sent > 0 ? ((emails.opens || 0) / emails.sent * 100).toFixed(1) : 0,
          click_rate: emails.sent > 0 ? ((emails.clicks || 0) / emails.sent * 100).toFixed(1) : 0
        },

        // Pipeline
        pipeline: pipeline
      };
    });

    // Calculate totals
    const totals = enrichedUsers.reduce((acc, u) => ({
      leads_assigned: acc.leads_assigned + u.leads.assigned_period,
      leads_total: acc.leads_total + u.leads.total_assigned,
      leads_qualified: acc.leads_qualified + u.leads.qualified,
      leads_won: acc.leads_won + u.leads.won,
      leads_lost: acc.leads_lost + u.leads.lost,
      rappels_total: acc.rappels_total + u.rappels.total,
      rappels_completed: acc.rappels_completed + u.rappels.completed,
      rappels_overdue: acc.rappels_overdue + u.rappels.overdue,
      campaigns_created: acc.campaigns_created + u.campaigns.created,
      campaigns_assigned: acc.campaigns_assigned + u.campaigns.assigned,
      campaigns_total_leads: acc.campaigns_total_leads + u.campaigns.total_leads,
      calls_sessions: acc.calls_sessions + u.calls.sessions,
      calls_made: acc.calls_made + u.calls.calls_made,
      calls_duration_minutes: acc.calls_duration_minutes + u.calls.duration_minutes,
      calls_rdv: acc.calls_rdv + u.calls.rdv_pris,
      calls_nrp: acc.calls_nrp + u.calls.nrp,
      calls_leads_processed: acc.calls_leads_processed + u.calls.leads_processed,
      emails_sent: acc.emails_sent + u.emails.sent,
      emails_opens: acc.emails_opens + u.emails.opens,
      emails_clicks: acc.emails_clicks + u.emails.clicks
    }), {
      leads_assigned: 0, leads_total: 0, leads_qualified: 0, leads_won: 0, leads_lost: 0,
      rappels_total: 0, rappels_completed: 0, rappels_overdue: 0,
      campaigns_created: 0, campaigns_assigned: 0, campaigns_total_leads: 0,
      calls_sessions: 0, calls_made: 0, calls_duration_minutes: 0, calls_rdv: 0, calls_nrp: 0, calls_leads_processed: 0,
      emails_sent: 0, emails_opens: 0, emails_clicks: 0
    });

    res.json({
      success: true,
      period,
      date_range: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      filter: {
        user_id: user_id || null,
        user_name: user_id ? `${enrichedUsers[0]?.first_name} ${enrichedUsers[0]?.last_name}` : 'Tous les utilisateurs'
      },
      users: enrichedUsers,
      totals: {
        ...totals,
        email_open_rate: totals.emails_sent > 0 ? (totals.emails_opens / totals.emails_sent * 100).toFixed(1) : 0,
        email_click_rate: totals.emails_sent > 0 ? (totals.emails_clicks / totals.emails_sent * 100).toFixed(1) : 0,
        rappels_completion_rate: totals.rappels_total > 0 ? (totals.rappels_completed / totals.rappels_total * 100).toFixed(1) : 0
      }
    });

  } catch (err) {
    error('[UserReports] Report error:', err);
    res.status(500).json({ error: err.message });
  }
});

// =============================
// GET /user-reports/daily-activity
// Activity breakdown by day for charts
// =============================
router.get('/daily-activity', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const userRole = req.user.role;
    const { period = '30days', user_id } = req.query;

    if (!['admin', 'manager', 'supervisor'].includes(userRole) && !req.user.is_super_admin) {
      if (user_id && user_id !== req.user.id) {
        return res.status(403).json({ error: 'Non autorisé' });
      }
    }

    const { startDate, endDate } = getDateRange(period);
    const hasCallSessions = await tableExists('call_sessions');
    const hasEmailQueue = await tableExists('email_queue');

    const params = user_id
      ? [tenantId, startDate.toISOString(), endDate.toISOString(), user_id]
      : [tenantId, startDate.toISOString(), endDate.toISOString()];

    // Rappels par jour
    const { rows: rappelsDaily } = await q(`
      SELECT
        DATE(scheduled_date) as date,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE completed = true) as completed
      FROM follow_ups
      WHERE tenant_id = $1
      AND scheduled_date >= $2 AND scheduled_date <= $3
      ${user_id ? 'AND user_id = $4' : ''}
      GROUP BY DATE(scheduled_date)
      ORDER BY date
    `, params);

    // Appels par jour
    let callsDaily = [];
    if (hasCallSessions) {
      try {
        const { rows } = await q(`
          SELECT
            DATE(started_at) as date,
            SUM(calls_made) as calls,
            SUM(total_duration) as duration_seconds
          FROM call_sessions
          WHERE tenant_id = $1
          AND started_at >= $2 AND started_at <= $3
          ${user_id ? 'AND user_id = $4' : ''}
          GROUP BY DATE(started_at)
          ORDER BY date
        `, params);
        callsDaily = rows;
      } catch (e) { warn('[UserReports] calls daily failed:', e.message); }
    }

    // Emails par jour
    let emailsDaily = [];
    if (hasEmailQueue) {
      try {
        const { rows } = await q(`
          SELECT
            DATE(eq.sent_at) as date,
            COUNT(*) as sent
          FROM email_queue eq
          JOIN campaigns c ON c.id = eq.campaign_id
          WHERE eq.tenant_id = $1
          AND eq.status = 'sent'
          AND eq.sent_at >= $2 AND eq.sent_at <= $3
          ${user_id ? 'AND c.created_by = $4' : ''}
          GROUP BY DATE(eq.sent_at)
          ORDER BY date
        `, params);
        emailsDaily = rows;
      } catch (e) { warn('[UserReports] emails daily failed:', e.message); }
    }

    res.json({
      success: true,
      period,
      date_range: { start: startDate.toISOString(), end: endDate.toISOString() },
      daily: {
        rappels: rappelsDaily,
        calls: callsDaily,
        emails: emailsDaily
      }
    });

  } catch (err) {
    error('[UserReports] Daily activity error:', err);
    res.status(500).json({ error: err.message });
  }
});

// =============================
// GET /user-reports/export
// Export report data as CSV
// =============================
router.get('/export', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const userRole = req.user.role;
    const { period = '30days', user_id, format = 'json' } = req.query;

    if (!['admin', 'manager'].includes(userRole) && !req.user.is_super_admin) {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    // Get the main report data
    const reportResponse = await new Promise((resolve, reject) => {
      const mockReq = {
        user: req.user,
        query: { period, user_id }
      };
      const mockRes = {
        json: (data) => resolve(data),
        status: () => ({ json: (data) => reject(data) })
      };
      // Call the report endpoint internally would be complex,
      // so we'll just return the period info and let frontend handle export
    });

    const { startDate, endDate } = getDateRange(period);

    // Get tenant info
    const { rows: tenantRows } = await q(`
      SELECT name, company_name FROM tenants WHERE id = $1
    `, [tenantId]);

    const periodLabels = {
      'today': "Aujourd'hui",
      'yesterday': 'Hier',
      '7days': '7 derniers jours',
      '30days': '30 derniers jours',
      'quarter': 'Trimestre',
      'semester': 'Semestre',
      'year': 'Année'
    };

    res.json({
      success: true,
      export_info: {
        company: tenantRows[0]?.company_name || tenantRows[0]?.name || 'LeadSynch',
        period_label: periodLabels[period] || period,
        date_range: {
          start: startDate.toLocaleDateString('fr-FR'),
          end: endDate.toLocaleDateString('fr-FR')
        },
        generated_at: new Date().toLocaleString('fr-FR')
      }
    });

  } catch (err) {
    error('[UserReports] Export error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Keep old endpoints for backwards compatibility
router.get('/summary', authenticateToken, async (req, res) => {
  // Redirect to new /report endpoint
  req.query.user_id = null;
  const reportHandler = router.stack.find(r => r.route?.path === '/report');
  if (reportHandler) {
    return reportHandler.route.stack[0].handle(req, res);
  }
  res.status(500).json({ error: 'Report endpoint not found' });
});

export default router;
