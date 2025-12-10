/**
 * Endpoint de diagnostic pour analyser les clics et leur présence dans le pipeline
 * GET /api/debug-clicks?campaign_id=xxx
 */
import { query } from '../lib/db.js';
import { verifyAuth } from '../middleware/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authResult = await verifyAuth(req);
    if (!authResult.authenticated) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { tenantId } = authResult;
    const { campaign_id } = req.query;

    // 1. Clics par jour
    const clicksByDay = await query(`
      SELECT
        DATE(clicked_at) as day,
        COUNT(*) as total_clicks,
        COUNT(DISTINCT lead_id) as unique_leads
      FROM email_tracking
      WHERE event_type = 'click'
        AND tenant_id = $1
        ${campaign_id ? 'AND campaign_id = $2' : ''}
      GROUP BY DATE(clicked_at)
      ORDER BY day DESC
      LIMIT 7
    `, campaign_id ? [tenantId, campaign_id] : [tenantId]);

    // 2. Clics d'hier non dans pipeline
    const missingYesterday = await query(`
      SELECT
        et.lead_id,
        et.clicked_at,
        l.company_name,
        l.email,
        pl.stage as current_pipeline_stage,
        CASE WHEN pl.id IS NULL THEN 'NON' ELSE 'OUI' END as in_pipeline
      FROM email_tracking et
      LEFT JOIN leads l ON l.id = et.lead_id
      LEFT JOIN pipeline_leads pl ON pl.lead_id = et.lead_id AND pl.campaign_id = et.campaign_id
      WHERE et.event_type = 'click'
        AND et.tenant_id = $1
        AND DATE(et.clicked_at) = CURRENT_DATE - 1
        ${campaign_id ? 'AND et.campaign_id = $2' : ''}
      ORDER BY et.clicked_at DESC
      LIMIT 50
    `, campaign_id ? [tenantId, campaign_id] : [tenantId]);

    // 3. Résumé: combien de clics d'hier sont déjà dans le pipeline vs absents
    const summary = await query(`
      SELECT
        COUNT(*) FILTER (WHERE pl.id IS NOT NULL) as already_in_pipeline,
        COUNT(*) FILTER (WHERE pl.id IS NULL) as missing_from_pipeline,
        COUNT(*) as total_clicks_yesterday
      FROM email_tracking et
      LEFT JOIN pipeline_leads pl ON pl.lead_id = et.lead_id AND pl.campaign_id = et.campaign_id
      WHERE et.event_type = 'click'
        AND et.tenant_id = $1
        AND DATE(et.clicked_at) = CURRENT_DATE - 1
        ${campaign_id ? 'AND et.campaign_id = $2' : ''}
    `, campaign_id ? [tenantId, campaign_id] : [tenantId]);

    // 4. Pipeline actuel pour cette campagne
    const pipelineStats = campaign_id ? await query(`
      SELECT
        stage,
        COUNT(*) as count
      FROM pipeline_leads
      WHERE tenant_id = $1 AND campaign_id = $2
      GROUP BY stage
      ORDER BY count DESC
    `, [tenantId, campaign_id]) : { rows: [] };

    // 5. Vérifier la date serveur
    const serverDate = await query(`SELECT CURRENT_DATE as today, CURRENT_DATE - 1 as yesterday, NOW() as now`);

    res.json({
      server_time: serverDate.rows[0],
      clicks_by_day: clicksByDay.rows,
      yesterday_summary: summary.rows[0],
      yesterday_clicks_detail: missingYesterday.rows,
      pipeline_stages: pipelineStats.rows,
      diagnosis: {
        message: summary.rows[0]?.missing_from_pipeline > 0
          ? `⚠️ ${summary.rows[0].missing_from_pipeline} clics d'hier devraient être dans le pipeline mais ne le sont pas!`
          : summary.rows[0]?.already_in_pipeline > 0
            ? `✅ Tous les ${summary.rows[0].already_in_pipeline} clics d'hier sont déjà dans le pipeline (peut-être avec un stage différent de 'leads_click')`
            : `ℹ️ Aucun clic enregistré hier`
      }
    });
  } catch (err) {
    console.error('Error in debug-clicks:', err);
    res.status(500).json({ error: err.message });
  }
}
