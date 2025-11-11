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
    
    const result = await query(`
      SELECT COALESCE(SUM(total_leads), 0) as total 
      FROM lead_databases 
      WHERE tenant_id = $1
    `, [tenantId]);
    
    res.json({
      ok: true,
      stats: {
        total: parseInt(result.rows[0]?.total) || 0,
        byStatus: []
      }
    });
  } catch (err) {
    console.error('❌ Erreur stats:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;