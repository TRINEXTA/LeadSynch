// controllers/emailTrackingController.js
import { query, queryOne } from '../lib/db.js';

export const trackOpen = async (req, res) => {
  try {
    const { lead_id, campaign_id } = req.query;
    if (lead_id && campaign_id) {
      const lead = await queryOne('SELECT tenant_id FROM leads WHERE id = $1::uuid', [lead_id]);
      if (lead) {
        await query(
          `INSERT INTO email_tracking (tenant_id, lead_id, campaign_id, event_type, created_at)
           VALUES ($1, $2::uuid, $3::uuid, 'open', NOW())
           ON CONFLICT DO NOTHING`,
          [lead.tenant_id, lead_id, campaign_id]
        );
      }
    }
    res.set('Content-Type', 'image/gif');
    res.send(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
  } catch (error) {
    console.error('Erreur track open:', error);
    res.status(200).send();
  }
};

export const trackClick = async (req, res) => {
  try {
    const { lead_id, campaign_id, url } = req.query;

    if (lead_id && campaign_id) {
      const lead = await queryOne('SELECT tenant_id FROM leads WHERE id = $1::uuid', [lead_id]);

      if (lead) {
        // 1) log email_tracking
        await query(
          `INSERT INTO email_tracking (tenant_id, lead_id, campaign_id, event_type, created_at)
           VALUES ($1, $2::uuid, $3::uuid, 'click', NOW())
           ON CONFLICT DO NOTHING`,
          [lead.tenant_id, lead_id, campaign_id]
        );

        // 2) lead → contacted
        await query(
          'UPDATE leads SET status = $1, last_contact_date = NOW() WHERE id = $2::uuid',
          ['contacted', lead_id]
        );

        // 3) upsert pipeline (avec tenant_id + stage forcé)
        await query(
          `INSERT INTO pipeline_leads (id, tenant_id, lead_id, campaign_id, stage, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2::uuid, $3::uuid, 'leads_click', NOW(), NOW())
           ON CONFLICT (lead_id, campaign_id) DO UPDATE
           SET stage = 'leads_click', updated_at = NOW()`,
          [lead.tenant_id, lead_id, campaign_id]
        );

        console.log('🧩 [TRACK] Lead injecté/MAJ dans pipeline (leads_click):', lead_id);
      }
    }

    res.redirect(url || 'https://trinexta.fr');
  } catch (error) {
    console.error('Erreur track click:', error);
    res.redirect('https://trinexta.fr');
  }
};

export const getLeadEvents = async (req, res) => {
  try {
    const { lead_id } = req.params;
    const { rows } = await query(
      'SELECT * FROM email_tracking WHERE lead_id = $1::uuid ORDER BY created_at DESC',
      [lead_id]
    );
    return res.json({ success: true, events: rows });
  } catch (error) {
    console.error('Erreur:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const getCampaignStats = async (req, res) => {
  try {
    const { campaign_id } = req.params;

    const { rows } = await query(
      `SELECT 
         COUNT(DISTINCT CASE WHEN event_type = 'sent' THEN lead_id END)::integer as sent,
         COUNT(DISTINCT CASE WHEN event_type = 'delivered' THEN lead_id END)::integer as delivered,
         COUNT(DISTINCT CASE WHEN event_type = 'open' THEN lead_id END)::integer as opens,
         COUNT(DISTINCT CASE WHEN event_type = 'click' THEN lead_id END)::integer as clicks,
         COUNT(DISTINCT CASE WHEN event_type = 'bounce' THEN lead_id END)::integer as bounces,
         COUNT(DISTINCT CASE WHEN event_type = 'spam' THEN lead_id END)::integer as spam,
         COUNT(DISTINCT CASE WHEN event_type = 'unsubscribe' THEN lead_id END)::integer as unsubscribes
       FROM email_tracking
       WHERE campaign_id = $1::uuid`,
      [campaign_id]
    );

    const stats = rows[0] || { sent: 0, delivered: 0, opens: 0, clicks: 0, bounces: 0, spam: 0, unsubscribes: 0 };
    return res.json({ success: true, stats });
  } catch (error) {
    console.error('Erreur stats campagne:', error);
    return res.status(500).json({ error: error.message });
  }
};
