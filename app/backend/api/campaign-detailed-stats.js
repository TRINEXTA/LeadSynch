import { log, error, warn } from "../lib/logger.js";
/**
 * API Campaign Detailed Stats - Stats détaillées d'une campagne
 * Retourne breakdown complet: leads totaux, contactés, par statut, etc.
 */

import { queryOne, queryAll } from '../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { campaign_id } = req.query;

    if (!campaign_id) {
      return res.status(400).json({ error: 'campaign_id requis' });
    }

    // Stats basiques campagne
    const campaign = await queryOne(
      `SELECT id, name, type, status, sent_count, opened_count, clicked_count,
              reply_count, bounced_count, created_at
       FROM campaigns
       WHERE id = $1`,
      [campaign_id]
    );

    if (!campaign) {
      return res.status(404).json({ error: 'Campagne introuvable' });
    }

    // Leads associés à la campagne via pipeline ou email_queue
    const leadStats = await queryAll(
      `SELECT
        COUNT(DISTINCT pl.lead_id) as total_leads,
        COUNT(DISTINCT CASE WHEN pl.stage IN ('qualifie', 'tres_qualifie', 'proposition', 'relancer') THEN pl.lead_id END) as contacted,
        COUNT(DISTINCT CASE WHEN pl.stage = 'clicked' THEN pl.lead_id END) as one_call,
        COUNT(DISTINCT CASE WHEN pl.stage = 'nrp' THEN pl.lead_id END) as no_answer,
        COUNT(DISTINCT CASE WHEN pl.stage IN ('qualifie', 'tres_qualifie') THEN pl.lead_id END) as qualified,
        COUNT(DISTINCT CASE WHEN pl.stage = 'hors_scope' THEN pl.lead_id END) as stopped
       FROM pipeline_leads pl
       WHERE pl.campaign_id = $1`,
      [campaign_id]
    );

    const stats = leadStats[0] || {
      total_leads: 0,
      contacted: 0,
      one_call: 0,
      no_answer: 0,
      qualified: 0,
      stopped: 0
    };

    // Commerciaux affectés (via leads assignés dans cette campagne)
    const commercials = await queryAll(
      `SELECT COUNT(DISTINCT l.assigned_to) as count
       FROM leads l
       JOIN pipeline_leads pl ON l.id = pl.lead_id
       WHERE pl.campaign_id = $1 AND l.assigned_to IS NOT NULL`,
      [campaign_id]
    );

    const commercialCount = parseInt(commercials[0]?.count || 0);

    // Combiner tout
    const detailedStats = {
      ...campaign,
      leads: {
        total: parseInt(stats.total_leads) || 0,
        contacted: parseInt(stats.contacted) || 0,
        one_call: parseInt(stats.one_call) || 0,
        no_answer: parseInt(stats.no_answer) || 0,
        qualified: parseInt(stats.qualified) || 0,
        stopped: parseInt(stats.stopped) || 0
      },
      commercials_assigned: commercialCount,
      rates: {
        open_rate: campaign.sent_count > 0
          ? ((campaign.opened_count || 0) / campaign.sent_count * 100).toFixed(1)
          : 0,
        click_rate: campaign.sent_count > 0
          ? ((campaign.clicked_count || 0) / campaign.sent_count * 100).toFixed(1)
          : 0,
        reply_rate: campaign.sent_count > 0
          ? ((campaign.reply_count || 0) / campaign.sent_count * 100).toFixed(1)
          : 0
      }
    };

    res.json({
      success: true,
      stats: detailedStats
    });

  } catch (error) {
    error('❌ Erreur stats détaillées campagne:', error);
    res.status(500).json({ error: error.message });
  }
}
