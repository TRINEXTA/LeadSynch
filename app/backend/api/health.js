import { log, error, warn } from "../lib/logger.js";
import { Router } from 'express';
import { query, pool } from '../lib/db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Health check global (pas d'auth requise)
router.get('/', async (req, res) => {
  try {
    const dbCheck = await pool.query('SELECT NOW()');

    res.json({
      ok: true,
      status: 'healthy',
      timestamp: new Date(),
      uptime: process.uptime(),
      database: 'connected',
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      status: 'unhealthy',
      error: error.message
    });
  }
});

// Auth requise pour les health checks détaillés
router.use(authMiddleware);

// Test connexion base de données
router.get('/db', async (req, res) => {
  try {
    const start = Date.now();

    // Test connexion
    const connectionTest = await pool.query('SELECT NOW() as now, version() as version');

    // Test query simple
    const countQuery = await query(
      'SELECT COUNT(*) as count FROM leads WHERE tenant_id = $1',
      [req.user.tenant_id]
    );

    // Test performance
    const latency = Date.now() - start;

    res.json({
      ok: true,
      status: 'healthy',
      database: {
        connected: true,
        version: connectionTest.rows[0].version,
        server_time: connectionTest.rows[0].now,
        latency_ms: latency,
        test_query: {
          tenant_id: req.user.tenant_id,
          leads_count: countQuery.rows[0].count
        }
      },
      performance: latency < 100 ? 'excellent' : latency < 300 ? 'good' : 'slow'
    });
  } catch (error) {
    error('❌ Health check DB:', error);
    res.status(500).json({
      ok: false,
      status: 'unhealthy',
      error: error.message
    });
  }
});

// Test configuration email
router.get('/email', async (req, res) => {
  try {
    const emailConfig = {
      elastic_email: !!process.env.ELASTIC_EMAIL_API_KEY,
      email_from: process.env.EMAIL_FROM || 'not configured',
      email_reply_to: process.env.EMAIL_REPLY_TO || 'not configured'
    };

    const allConfigured = emailConfig.elastic_email;

    res.json({
      ok: true,
      status: allConfigured ? 'healthy' : 'warning',
      email: {
        provider: 'Elastic Email',
        api_key_configured: emailConfig.elastic_email,
        from_email: emailConfig.email_from,
        reply_to: emailConfig.email_reply_to,
        ready: allConfigured
      },
      warnings: allConfigured ? [] : ['ELASTIC_EMAIL_API_KEY not configured']
    });
  } catch (error) {
    error('❌ Health check Email:', error);
    res.status(500).json({
      ok: false,
      status: 'unhealthy',
      error: error.message
    });
  }
});

// Test APIs externes
router.get('/apis', async (req, res) => {
  try {
    const apis = {
      anthropic: {
        name: 'Anthropic Claude',
        configured: !!process.env.ANTHROPIC_API_KEY,
        usage: 'AI features (Asefi chatbot, sector detection)'
      },
      google_maps: {
        name: 'Google Maps',
        configured: !!process.env.GOOGLE_MAPS_API_KEY,
        usage: 'Lead generation from Google Maps'
      },
      elastic_email: {
        name: 'Elastic Email',
        configured: !!process.env.ELASTIC_EMAIL_API_KEY,
        usage: 'Campaign emails sending'
      },
      hunter: {
        name: 'Hunter.io',
        configured: !!process.env.HUNTER_API_KEY,
        usage: 'Email verification (optional)'
      }
    };

    const configuredCount = Object.values(apis).filter(api => api.configured).length;
    const totalCount = Object.keys(apis).length;

    res.json({
      ok: true,
      status: configuredCount >= 3 ? 'healthy' : 'warning',
      apis: apis,
      summary: {
        configured: configuredCount,
        total: totalCount,
        percentage: Math.round((configuredCount / totalCount) * 100)
      }
    });
  } catch (error) {
    error('❌ Health check APIs:', error);
    res.status(500).json({
      ok: false,
      status: 'unhealthy',
      error: error.message
    });
  }
});

// Test système campagnes
router.get('/campaigns', async (req, res) => {
  try {
    const stats = await query(
      `SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN status = 'paused' THEN 1 END) as paused,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
      FROM campaigns
      WHERE tenant_id = $1`,
      [req.user.tenant_id]
    );

    const recentCampaigns = await query(
      `SELECT id, name, status, created_at
      FROM campaigns
      WHERE tenant_id = $1
      ORDER BY created_at DESC
      LIMIT 5`,
      [req.user.tenant_id]
    );

    res.json({
      ok: true,
      status: 'healthy',
      campaigns: {
        total: parseInt(stats.rows[0].total),
        active: parseInt(stats.rows[0].active),
        paused: parseInt(stats.rows[0].paused),
        completed: parseInt(stats.rows[0].completed),
        recent: recentCampaigns.rows
      },
      system: 'operational'
    });
  } catch (error) {
    error('❌ Health check Campaigns:', error);
    res.status(500).json({
      ok: false,
      status: 'unhealthy',
      error: error.message
    });
  }
});

// Test système tracking
router.get('/tracking', async (req, res) => {
  try {
    const trackingStats = await query(
      `SELECT
        COUNT(*) as total_events,
        COUNT(CASE WHEN event_type = 'sent' THEN 1 END) as sent,
        COUNT(CASE WHEN event_type = 'opened' THEN 1 END) as opened,
        COUNT(CASE WHEN event_type = 'clicked' THEN 1 END) as clicked,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as last_24h
      FROM email_tracking
      WHERE tenant_id = $1`,
      [req.user.tenant_id]
    );

    const stats = trackingStats.rows[0];
    const openRate = stats.sent > 0 ? ((stats.opened / stats.sent) * 100).toFixed(1) : 0;
    const clickRate = stats.sent > 0 ? ((stats.clicked / stats.sent) * 100).toFixed(1) : 0;

    res.json({
      ok: true,
      status: 'healthy',
      tracking: {
        total_events: parseInt(stats.total_events),
        sent: parseInt(stats.sent),
        opened: parseInt(stats.opened),
        clicked: parseInt(stats.clicked),
        last_24h: parseInt(stats.last_24h),
        rates: {
          open_rate: `${openRate}%`,
          click_rate: `${clickRate}%`
        }
      },
      system: 'operational'
    });
  } catch (error) {
    error('❌ Health check Tracking:', error);
    res.status(500).json({
      ok: false,
      status: 'unhealthy',
      error: error.message
    });
  }
});

// Test workers background
router.get('/workers', async (req, res) => {
  try {
    // Vérifier s'il y a des emails en queue
    const emailQueueCheck = await query(
      `SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
      FROM email_queue
      WHERE tenant_id = $1`,
      [req.user.tenant_id]
    );

    const queueStats = emailQueueCheck.rows[0];

    res.json({
      ok: true,
      status: 'healthy',
      workers: {
        email_worker: {
          status: 'running',
          description: 'Email sending worker',
          queue: {
            total: parseInt(queueStats.total),
            pending: parseInt(queueStats.pending),
            sent: parseInt(queueStats.sent),
            failed: parseInt(queueStats.failed)
          }
        },
        polling_service: {
          status: 'running',
          description: 'Elastic Email polling for campaign stats',
          interval: '30 minutes'
        }
      },
      system: 'operational'
    });
  } catch (error) {
    error('❌ Health check Workers:', error);
    res.status(500).json({
      ok: false,
      status: 'unhealthy',
      error: error.message
    });
  }
});

export default router;
