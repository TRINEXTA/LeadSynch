/**
 * Endpoint pour forcer la récupération des clics depuis Elastic Email
 * et les injecter dans le pipeline
 *
 * POST /api/sync-elastic-clicks
 * Body: { campaign_id: "xxx", days_back: 7 }
 */
import { query, execute } from '../lib/db.js';
import { verifyAuth } from '../middleware/auth.js';
import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authResult = await verifyAuth(req);
    if (!authResult.authenticated) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { tenantId } = authResult;
    const { campaign_id, days_back = 7 } = req.body;

    if (!campaign_id) {
      return res.status(400).json({ error: 'campaign_id requis' });
    }

    const apiKey = process.env.ELASTIC_EMAIL_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'ELASTIC_EMAIL_API_KEY non configurée' });
    }

    console.log(`🔄 [SYNC] Récupération forcée des clics pour campagne ${campaign_id}`);

    // 1. Récupérer les emails de la campagne
    const { rows: emails } = await query(`
      SELECT DISTINCT eq.lead_id, l.email
      FROM email_queue eq
      JOIN leads l ON l.id = eq.lead_id
      WHERE eq.campaign_id = $1 AND eq.tenant_id = $2
    `, [campaign_id, tenantId]);

    if (emails.length === 0) {
      return res.json({ success: false, message: 'Aucun email trouvé pour cette campagne' });
    }

    console.log(`📧 [SYNC] ${emails.length} emails dans la campagne`);

    // Index par email normalisé
    const normalizeEmail = (e) => (e || '').toLowerCase().trim();
    const byEmail = new Map(emails.map(e => [normalizeEmail(e.email), { lead_id: e.lead_id, email: e.email }]));

    // 2. Appeler Elastic Email API pour récupérer les événements
    const from = new Date(Date.now() - days_back * 24 * 60 * 60 * 1000).toISOString().slice(0, 19);
    const to = new Date().toISOString().slice(0, 19);

    console.log(`📅 [SYNC] Période: ${from} → ${to}`);

    let elasticEvents = [];

    // Essayer v4 d'abord
    try {
      const url = 'https://api.elasticemail.com/v4/events';
      const params = new URLSearchParams();
      params.set('from', from);
      params.set('to', to);
      params.set('limit', '1000');
      params.set('orderBy', 'DateDescending');

      const response = await axios.get(`${url}?${params.toString()}`, {
        headers: { 'X-ElasticEmail-ApiKey': apiKey },
        timeout: 30000
      });

      elasticEvents = Array.isArray(response.data) ? response.data : [];
      console.log(`📡 [SYNC] v4 events reçus: ${elasticEvents.length}`);
    } catch (err) {
      console.error('❌ [SYNC] Erreur v4:', err.response?.status, err.response?.data || err.message);

      // Fallback v2
      try {
        const response = await axios.get('https://api.elasticemail.com/v2/log/summary', {
          params: { apikey: apiKey, from, to, limit: 1000 },
          timeout: 30000
        });

        if (response.data?.success && response.data?.data) {
          elasticEvents = Array.isArray(response.data.data) ? response.data.data : [response.data.data];
          console.log(`📡 [SYNC] v2 events reçus: ${elasticEvents.length}`);
        }
      } catch (err2) {
        console.error('❌ [SYNC] Erreur v2:', err2.message);
      }
    }

    if (elasticEvents.length === 0) {
      return res.json({
        success: true,
        message: 'Aucun événement trouvé sur Elastic Email pour cette période',
        emails_in_campaign: emails.length
      });
    }

    // 3. Filtrer les clics pour cette campagne
    const clicks = [];
    for (const ev of elasticEvents) {
      const eventType = (ev.EventType || ev.eventType || ev.Status || ev.status || '').toLowerCase();
      if (!eventType.includes('click')) continue;

      const recipientRaw = ev.To ?? ev.Recipient ?? ev.Email ?? ev.to ?? ev.recipient ?? ev.email ?? '';
      const recipient = normalizeEmail(recipientRaw);
      const leadData = byEmail.get(recipient);

      if (leadData) {
        clicks.push({
          lead_id: leadData.lead_id,
          email: leadData.email,
          clicked_at: ev.Date || ev.EventDate || ev.date || new Date().toISOString()
        });
      }
    }

    console.log(`🖱️ [SYNC] ${clicks.length} clics trouvés pour cette campagne sur Elastic`);

    // 4. Vérifier ce qui est déjà dans email_tracking
    const { rows: existingTracking } = await query(`
      SELECT lead_id FROM email_tracking
      WHERE campaign_id = $1 AND event_type = 'click'
    `, [campaign_id]);
    const existingTrackingSet = new Set(existingTracking.map(r => r.lead_id));

    // 5. Vérifier ce qui est déjà dans pipeline_leads
    const { rows: existingPipeline } = await query(`
      SELECT lead_id FROM pipeline_leads
      WHERE campaign_id = $1
    `, [campaign_id]);
    const existingPipelineSet = new Set(existingPipeline.map(r => r.lead_id));

    // 6. Insérer les clics manquants dans email_tracking
    let trackingInserted = 0;
    for (const click of clicks) {
      if (!existingTrackingSet.has(click.lead_id)) {
        try {
          await execute(`
            INSERT INTO email_tracking (id, tenant_id, campaign_id, lead_id, event_type, clicked_at, created_at)
            VALUES (gen_random_uuid(), $1, $2, $3, 'click', $4, NOW())
            ON CONFLICT DO NOTHING
          `, [tenantId, campaign_id, click.lead_id, click.clicked_at]);
          trackingInserted++;
          existingTrackingSet.add(click.lead_id);
        } catch (err) {
          console.error(`⚠️ [SYNC] Erreur insertion tracking ${click.lead_id}:`, err.message);
        }
      }
    }

    // 7. Insérer les clics manquants dans pipeline_leads
    let pipelineInserted = 0;
    for (const click of clicks) {
      if (!existingPipelineSet.has(click.lead_id)) {
        try {
          await execute(`
            INSERT INTO pipeline_leads (id, tenant_id, lead_id, campaign_id, stage, created_at, updated_at)
            VALUES (gen_random_uuid(), $1, $2, $3, 'leads_click', NOW(), NOW())
            ON CONFLICT DO NOTHING
          `, [tenantId, click.lead_id, campaign_id]);
          pipelineInserted++;
        } catch (err) {
          console.error(`⚠️ [SYNC] Erreur insertion pipeline ${click.lead_id}:`, err.message);
        }
      }
    }

    console.log(`✅ [SYNC] Terminé: ${trackingInserted} tracking + ${pipelineInserted} pipeline insérés`);

    res.json({
      success: true,
      stats: {
        emails_in_campaign: emails.length,
        elastic_events_total: elasticEvents.length,
        clicks_found_for_campaign: clicks.length,
        already_in_tracking: existingTracking.length,
        already_in_pipeline: existingPipeline.length,
        tracking_inserted: trackingInserted,
        pipeline_inserted: pipelineInserted
      },
      clicks_detail: clicks.map(c => ({
        email: c.email,
        clicked_at: c.clicked_at,
        was_in_tracking: existingTrackingSet.has(c.lead_id) && trackingInserted === 0,
        was_in_pipeline: existingPipelineSet.has(c.lead_id)
      }))
    });

  } catch (err) {
    console.error('❌ [SYNC] Erreur:', err);
    res.status(500).json({ error: err.message });
  }
}
