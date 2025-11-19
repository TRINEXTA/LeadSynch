import { Router } from "express";
import { query } from "../lib/db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();
router.use(authMiddleware);

// GET /api/stats/dashboard
router.get("/dashboard", async (req, res) => {
  try {
    const tenantId = String(req.user?.tenant_id);

    // Compter les leads depuis lead_databases (vos 775 leads)
    const leadsQuery = `
      SELECT 
        COALESCE(SUM(total_leads), 0)::int as total_leads
      FROM lead_databases 
      WHERE tenant_id = $1
    `;

    // Compter vos campagnes
    const campaignsQuery = `
      SELECT 
        COUNT(*)::int as total,
        COUNT(CASE WHEN status = 'active' THEN 1 END)::int as active,
        COUNT(CASE WHEN status = 'paused' THEN 1 END)::int as paused
      FROM campaigns 
      WHERE tenant_id = $1
    `;

    const [leadsResult, campaignsResult] = await Promise.all([
      query(leadsQuery, [tenantId]),
      query(campaignsQuery, [tenantId])
    ]);

    const response = {
      prospects: {
        count: leadsResult.rows[0]?.total_leads || 0,
        sent: 0,
        opened: 0,
        clicked: 0,
        change: 0,
        trend: 'stable'
      },
      leads: {
        count: 0,
        qualified: 0,
        rdv: 0,
        proposition: 0,
        won: 0,
        lost: 0
      },
      campaigns: {
        count: campaignsResult.rows[0]?.total || 0,
        active: campaignsResult.rows[0]?.active || 0,
        draft: 0,
        paused: campaignsResult.rows[0]?.paused || 0,
        completed: 0,
        avgOpenRate: 0,
        avgClickRate: 0
      },
      activities: {
        calls: 0,
        emails: 0,
        meetings: 0,
        total: 0
      },
      appointments: {
        total: 0,
        upcoming: 0,
        today: 0
      },
      conversionRate: {
        winRate: 0
      },
      revenue: {
        actual: 0,
        pipeline: 0,
        target: 100000
      },
      users: {
        count: 0
      },
      pipeline: {
        value: 0
      },
      pipelineStages: [],
      recentActivities: []
    };

    console.log('✅ Dashboard stats:', {
      prospects: response.prospects.count,
      campaigns: response.campaigns.active
    });

    res.json(response);
  } catch (err) {
    console.error('❌ Erreur dashboard:', err);
    res.status(500).json({ 
      error: 'Erreur récupération stats',
      details: err.message 
    });
  }
});

// GET /api/stats
router.get("/", async (req, res) => {
  try {
    const tenantId = String(req.user?.tenant_id);

    // Statistiques des leads
    const leadsStatsQuery = `
      SELECT
        COUNT(*)::int as total_leads,
        COUNT(CASE WHEN status = 'converted' THEN 1 END)::int as converted,
        COUNT(CASE WHEN status = 'qualified' THEN 1 END)::int as qualified,
        COUNT(CASE WHEN status = 'contacted' THEN 1 END)::int as contacted
      FROM leads
      WHERE tenant_id = $1
    `;

    // Distribution par statut
    const statusDistQuery = `
      SELECT
        status,
        COUNT(*)::int as count
      FROM leads
      WHERE tenant_id = $1
      GROUP BY status
      ORDER BY count DESC
    `;

    // Top 5 secteurs
    const topSectorsQuery = `
      SELECT
        sector,
        COUNT(*)::int as count
      FROM leads
      WHERE tenant_id = $1 AND sector IS NOT NULL
      GROUP BY sector
      ORDER BY count DESC
      LIMIT 5
    `;

    // Statistiques campagnes
    const campaignsQuery = `
      SELECT
        COUNT(*)::int as total,
        COUNT(CASE WHEN status = 'active' THEN 1 END)::int as active
      FROM campaigns
      WHERE tenant_id = $1
    `;

    // Statistiques emails (tracking)
    const emailStatsQuery = `
      SELECT
        COUNT(CASE WHEN event_type = 'sent' THEN 1 END)::int as total_sent,
        COUNT(CASE WHEN event_type = 'open' THEN 1 END)::int as total_opened,
        COUNT(CASE WHEN event_type = 'click' THEN 1 END)::int as total_clicked
      FROM email_tracking
      WHERE tenant_id = $1
    `;

    // Statistiques d'activité (derniers 30 jours)
    const activityStatsQuery = `
      SELECT
        COUNT(*)::int as total_actions
      FROM email_tracking
      WHERE tenant_id = $1
        AND created_at >= NOW() - INTERVAL '30 days'
    `;

    // Statistiques d'appels depuis follow_ups
    const callStatsQuery = `
      SELECT
        COUNT(CASE WHEN completed = true THEN 1 END)::int as total_calls,
        COUNT(CASE WHEN completed = false AND scheduled_date < NOW() THEN 1 END)::int as missed_calls,
        COUNT(CASE WHEN completed = false AND scheduled_date >= NOW() THEN 1 END)::int as upcoming_calls
      FROM follow_ups
      WHERE tenant_id = $1 AND type = 'call'
    `;

    const [leadsStats, statusDist, topSectors, campaignsStats, emailStats, activityStats, callStats] = await Promise.all([
      query(leadsStatsQuery, [tenantId]),
      query(statusDistQuery, [tenantId]),
      query(topSectorsQuery, [tenantId]),
      query(campaignsQuery, [tenantId]),
      query(emailStatsQuery, [tenantId]),
      query(activityStatsQuery, [tenantId]),
      query(callStatsQuery, [tenantId])
    ]);

    const total = leadsStats.rows[0]?.total_leads || 0;
    const converted = leadsStats.rows[0]?.converted || 0;

    const totalSent = emailStats.rows[0]?.total_sent || 0;
    const totalOpened = emailStats.rows[0]?.total_opened || 0;
    const totalClicked = emailStats.rows[0]?.total_clicked || 0;

    const openRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : 0;
    const clickRate = totalSent > 0 ? ((totalClicked / totalSent) * 100).toFixed(1) : 0;

    const totalActions = activityStats.rows[0]?.total_actions || 0;
    const dailyActions = Math.round(totalActions / 30);

    // Score d'activité basé sur actions/jour (0-100)
    const activityScore = Math.min(100, Math.round((dailyActions / 10) * 100));

    res.json({
      ok: true,
      total: total,
      converted: converted,
      qualified: leadsStats.rows[0]?.qualified || 0,
      contacted: leadsStats.rows[0]?.contacted || 0,
      conversion_rate: total > 0 ? ((converted / total) * 100).toFixed(1) : 0,
      byStatus: statusDist.rows,
      topSectors: topSectors.rows,
      campaigns: {
        total: campaignsStats.rows[0]?.total || 0,
        active: campaignsStats.rows[0]?.active || 0
      },
      email_stats: {
        total_sent: totalSent,
        total_opened: totalOpened,
        total_clicked: totalClicked,
        open_rate: openRate,
        click_rate: clickRate
      },
      call_stats: {
        total_calls: callStats.rows[0]?.total_calls || 0,
        missed_calls: callStats.rows[0]?.missed_calls || 0,
        upcoming_calls: callStats.rows[0]?.upcoming_calls || 0,
        avg_duration: 0 // Peut être calculé si on ajoute un champ duration
      },
      activity_score: activityScore,
      daily_actions: dailyActions
    });
  } catch (err) {
    console.error('❌ Erreur stats:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;