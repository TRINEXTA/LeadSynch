import { log, error, warn } from "../lib/logger.js";
﻿// controllers/emailTrackingController.js
import { query, queryOne } from '../lib/db.js';

// Validation UUID simple
const isValidUUID = (str) => {
  if (!str || typeof str !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

export const trackOpen = async (req, res) => {
  try {
    const { lead_id, campaign_id, follow_up_id } = req.query;

    // Validation UUID pour éviter les injections
    if (lead_id && campaign_id && isValidUUID(lead_id) && isValidUUID(campaign_id)) {
      const lead = await queryOne('SELECT tenant_id FROM leads WHERE id = $1::uuid', [lead_id]);
      if (lead) {
        // Inclure follow_up_id si présent
        if (follow_up_id && isValidUUID(follow_up_id)) {
          await query(
            `INSERT INTO email_tracking (tenant_id, lead_id, campaign_id, follow_up_id, event_type, created_at)
             VALUES ($1, $2::uuid, $3::uuid, $4::uuid, 'open', NOW())
             ON CONFLICT DO NOTHING`,
            [lead.tenant_id, lead_id, campaign_id, follow_up_id]
          );
        } else {
          await query(
            `INSERT INTO email_tracking (tenant_id, lead_id, campaign_id, event_type, created_at)
             VALUES ($1, $2::uuid, $3::uuid, 'open', NOW())
             ON CONFLICT DO NOTHING`,
            [lead.tenant_id, lead_id, campaign_id]
          );
        }
      }
    }
    res.set('Content-Type', 'image/gif');
    res.send(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
  } catch (err) {
    error('Erreur track open:', err);
    res.status(200).send();
  }
};

export const trackClick = async (req, res) => {
  try {
    const { lead_id, campaign_id, follow_up_id, url } = req.query;

    // Validation UUID pour éviter les injections
    if (lead_id && campaign_id && isValidUUID(lead_id) && isValidUUID(campaign_id)) {
      const lead = await queryOne('SELECT tenant_id FROM leads WHERE id = $1::uuid', [lead_id]);

      if (lead) {
        // 1) log email_tracking avec follow_up_id si présent
        if (follow_up_id && isValidUUID(follow_up_id)) {
          await query(
            `INSERT INTO email_tracking (tenant_id, lead_id, campaign_id, follow_up_id, event_type, created_at)
             VALUES ($1, $2::uuid, $3::uuid, $4::uuid, 'click', NOW())
             ON CONFLICT DO NOTHING`,
            [lead.tenant_id, lead_id, campaign_id, follow_up_id]
          );
        } else {
          await query(
            `INSERT INTO email_tracking (tenant_id, lead_id, campaign_id, event_type, created_at)
             VALUES ($1, $2::uuid, $3::uuid, 'click', NOW())
             ON CONFLICT DO NOTHING`,
            [lead.tenant_id, lead_id, campaign_id]
          );
        }

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

        log('🧩 [TRACK] Lead injecté/MAJ dans pipeline (leads_click):', lead_id);
      }
    }

    res.redirect(url || 'https://trinexta.fr');
  } catch (err) {
    error('Erreur track click:', err);
    res.redirect('https://trinexta.fr');
  }
};

export const getLeadEvents = async (req, res) => {
  try {
    const { lead_id } = req.params;
    const tenantId = req.user?.tenant_id;

    // Validation UUID et tenant_id
    if (!isValidUUID(lead_id)) {
      return res.status(400).json({ error: 'Invalid lead_id format' });
    }
    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Filtrage par tenant_id pour sécurité multi-tenant
    const { rows } = await query(
      `SELECT et.* FROM email_tracking et
       JOIN leads l ON et.lead_id = l.id
       WHERE et.lead_id = $1::uuid AND l.tenant_id = $2
       ORDER BY et.created_at DESC`,
      [lead_id, tenantId]
    );
    return res.json({ success: true, events: rows });
  } catch (error) {
    error('Erreur:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const getCampaignStats = async (req, res) => {
  try {
    const { campaign_id } = req.params;
    const tenantId = req.user?.tenant_id;

    // Validation UUID et tenant_id
    if (!isValidUUID(campaign_id)) {
      return res.status(400).json({ error: 'Invalid campaign_id format' });
    }
    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Vérifier que la campagne appartient au tenant
    const campaign = await queryOne(
      'SELECT id FROM campaigns WHERE id = $1::uuid AND tenant_id = $2',
      [campaign_id, tenantId]
    );
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

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
    error('Erreur stats campagne:', error);
    return res.status(500).json({ error: error.message });
  }
};
