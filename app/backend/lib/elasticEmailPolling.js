import { log, error, warn } from "../lib/logger.js";
﻿// lib/elasticEmailPolling.js
import axios from 'axios';
import { query, execute } from './db.js';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export class ElasticEmailPolling {
  constructor() {
    this.apiKey = process.env.ELASTIC_EMAIL_API_KEY;
    if (!this.apiKey) {
      warn('⚠️ ELASTIC_EMAIL_API_KEY manquant dans les variables d\'environnement');
    }
  }

  // -------------------- Helpers --------------------
  normalizeEmail(raw) {
    if (!raw) return '';
    let e = String(raw).trim().toLowerCase();

    // Elastic peut renvoyer "a@b,c@d" → on prend le premier
    if (e.includes(',')) e = e.split(',')[0].trim();

    const at = e.indexOf('@');
    if (at > 0) {
      let local = e.slice(0, at);
      const domain = e.slice(at + 1);
      // retire +tag
      local = local.replace(/\+.*/, '');
      // Gmail : supprime les points dans la partie locale
      if (domain === 'gmail.com' || domain === 'googlemail.com') {
        local = local.replace(/\./g, '');
      }
      e = `${local}@${domain}`;
    }
    return e;
  }

  mapEventV4(eventType) {
    const k = String(eventType || '').toLowerCase();
    if (k.includes('deliver')) return 'delivered';
    if (k.includes('open')) return 'open';
    if (k.includes('click')) return 'click';
    if (k.includes('bounce') || k.includes('error')) return 'bounce';
    if (k.includes('unsubscribe')) return 'unsubscribe';
    return null;
  }

  mapEventV2(status) {
    const k = String(status || '').toLowerCase();
    if (k === 'sent' || k.includes('deliver')) return 'delivered';
    if (k.startsWith('open')) return 'open';
    if (k.startsWith('click')) return 'click';
    if (k.includes('bounce') || k.includes('error')) return 'bounce';
    if (k.includes('unsub')) return 'unsubscribe';
    return null;
  }

  // -------------------- Enregistrement & injection pipeline --------------------
  async recordEvent(campaignId, leadId, eventType) {
    try {
      // Récupère tenant_id du lead (on en aura besoin même si l'event existe déjà)
      const { rows: leadRows } = await query(
        'SELECT tenant_id FROM leads WHERE id = $1',
        [leadId]
      );
      if (!leadRows.length) return;
      const tenantId = leadRows[0].tenant_id;

      // 1) Enregistre l'événement s'il n'existe pas (idempotent)
      const { rows } = await query(
        `SELECT id FROM email_tracking 
         WHERE campaign_id = $1 AND lead_id = $2 AND event_type = $3`,
        [campaignId, leadId, eventType]
      );

      if (rows.length === 0) {
        await execute(
          `INSERT INTO email_tracking (tenant_id, campaign_id, lead_id, event_type, created_at)
           VALUES ($1, $2, $3, $4, NOW())`,
          [tenantId, campaignId, leadId, eventType]
        );
        log(`✅ [POLLING] Événement enregistré: ${eventType} pour lead ${leadId}`);
      } else {
        // Event déjà présent → on continue quand même pour le pipeline
        // log(`[POLLING] Event déjà présent: ${eventType} lead ${leadId}`);
      }

      // 2) Toujours upsert le pipeline sur "click" (même si l'event existait déjà)
      if (eventType === 'click') {
        try {
          await execute(
            `INSERT INTO pipeline_leads (id, tenant_id, lead_id, campaign_id, stage, created_at, updated_at)
             VALUES (gen_random_uuid(), $1, $2, $3, 'leads_click', NOW(), NOW())
             ON CONFLICT (tenant_id, lead_id, campaign_id)
             DO UPDATE SET stage = EXCLUDED.stage, updated_at = NOW()`,
            [tenantId, leadId, campaignId]
          );
        } catch (insertErr) {
          // Fallback: ancienne contrainte (lead_id, campaign_id)
          if (insertErr.message?.includes('constraint')) {
            await execute(
              `INSERT INTO pipeline_leads (id, tenant_id, lead_id, campaign_id, stage, created_at, updated_at)
               VALUES (gen_random_uuid(), $1, $2, $3, 'leads_click', NOW(), NOW())
               ON CONFLICT (lead_id, campaign_id)
               DO UPDATE SET stage = EXCLUDED.stage, updated_at = NOW()`,
              [tenantId, leadId, campaignId]
            );
          } else {
            throw insertErr;
          }
        }
        log(`🧩 [POLLING] Lead injecté/MAJ dans pipeline (leads_click): ${leadId}`);
      }
    } catch (error) {
      error('❌ [POLLING] Erreur recordEvent:', error.message);
    }
  }

  // -------------------- Core --------------------
  async syncCampaignStats(campaignId) {
    try {
      log('📊 [POLLING] Synchronisation stats pour campagne:', campaignId);

      // Emails envoyés pour cette campagne (source de vérité locale)
      const { rows: emails } = await query(
        `SELECT DISTINCT l.id, l.email, eq.sent_at
           FROM leads l
           JOIN email_queue eq ON eq.lead_id = l.id
          WHERE eq.campaign_id = $1
            AND eq.status = 'sent'
            AND l.email IS NOT NULL`,
        [campaignId]
      );

      log(`📧 [POLLING] ${emails.length} emails à vérifier pour cette campagne`);
      if (emails.length === 0) {
        log('⚠️ [POLLING] Aucun email envoyé trouvé');
        return { success: true, leadsChecked: 0 };
      }

      // Marque "sent" localement (idempotent)
      for (const e of emails) {
        await this.recordEvent(campaignId, e.id, 'sent');
      }

      // Va chercher les events chez Elastic
      await this.checkElasticEmailStats(campaignId, emails);

      log(`✅ [POLLING] ${emails.length} emails vérifiés`);
      return { success: true, leadsChecked: emails.length };
    } catch (error) {
      error('❌ [POLLING] Erreur syncCampaignStats:', error);
      return { success: false, error: error.message };
    }
  }

  async checkElasticEmailStats(campaignId, emails) {
    // Fenêtre 7 jours
    const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19);
    const to   = new Date().toISOString().slice(0, 19);
    log(`📅 [POLLING] Période de recherche: ${from} → ${to}`);

    // Index par email normalisé
    const byEmail = new Map(emails.map(e => [this.normalizeEmail(e.email), e.id]));
    log('📋 [POLLING] Emails indexés:', Array.from(byEmail.keys()));

    // ---- Tentative v4 (sans eventTypes, on filtre côté code) ----
    try {
      const url = 'https://api.elasticemail.com/v4/events';
      const params = new URLSearchParams();
      params.set('from', from);
      params.set('to', to);
      params.set('limit', '1000');
      params.set('orderBy', 'DateDescending');

      const res = await axios.get(`${url}?${params.toString()}`, {
        headers: { 'X-ElasticEmail-ApiKey': this.apiKey }, // header accepté
        timeout: 15000
      });

      const events = Array.isArray(res.data) ? res.data : [];
      log(`📡 [POLLING] v4 events reçus: ${events.length}`);

      let processed = 0;
      for (const ev of events) {
        const recipientRaw = ev.To ?? ev.Recipient ?? ev.Email ?? '';
        const recipient = this.normalizeEmail(recipientRaw);
        const leadId = byEmail.get(recipient);
        if (!leadId) continue;

        const t = this.mapEventV4(ev.EventType);
        if (!t) continue;

        await this.recordEvent(campaignId, leadId, t);
        processed++;
        if (t === 'open')  log(`👁️ [POLLING] Open: ${recipient}`);
        if (t === 'click') log(`🖱️ [POLLING] Click: ${recipient}`);
      }

      log(`✅ [POLLING] ${processed} événements traités (v4)`);
      await sleep(200);
      return;
    } catch (err) {
      const status = err?.response?.status;
      const data = err?.response?.data;
      error('❌ [POLLING] Erreur v4:', status, data || err.message);
      // on enchaîne en v2 si v4 échoue
    }

    // ---- Fallback v2 (/v2/log/summary) ----
    try {
      const res = await axios.get('https://api.elasticemail.com/v2/log/summary', {
        params: { apikey: this.apiKey, from, to, limit: 1000 },
        timeout: 15000
      });

      if (!res.data || !res.data.success || !res.data.data) {
        log('ℹ️ [POLLING] v2: pas de données exploitables');
        return;
      }

      const logs = Array.isArray(res.data.data) ? res.data.data : [res.data.data];
      log(`📡 [POLLING] v2 logs reçus: ${logs.length}`);

      let processed = 0;
      for (const log of logs) {
        const recipient = this.normalizeEmail(log.to || log.To);
        const leadId = byEmail.get(recipient);
        if (!leadId) continue;

        const t = this.mapEventV2(log.status || log.Status);
        if (!t) continue;

        await this.recordEvent(campaignId, leadId, t);
        processed++;
        if (t === 'open')  log(`👁️ [POLLING] Open: ${recipient}`);
        if (t === 'click') log(`🖱️ [POLLING] Click: ${recipient}`);
      }

      log(`✅ [POLLING] ${processed} événements traités (v2)`);
      await sleep(200);
    } catch (err) {
      const status = err?.response?.status;
      const data = err?.response?.data;
      error('❌ [POLLING] Erreur v2:', status, data || err.message);
    }
  }

  // -------------------- Batch --------------------
  async syncAllActiveCampaigns() {
    try {
      log('\n🔄 [POLLING] Synchronisation de toutes les campagnes actives...');

      const { rows: campaigns } = await query(
        `SELECT id, name, status
           FROM campaigns
          WHERE status IN ('active', 'tracking', 'relances_en_cours', 'surveillance', 'completed', 'paused')
            AND type = 'email'
            AND created_at > NOW() - INTERVAL '30 days'
          ORDER BY created_at DESC`
      );

      log(`📊 [POLLING] ${campaigns.length} campagnes à synchroniser`);

      for (const c of campaigns) {
        log(`\n🔍 [POLLING] Traitement: ${c.name} (${c.status})`);
        await this.syncCampaignStats(c.id);
        await sleep(3000); // respiration API
      }

      await this.updateCampaignCounters();
      await this.syncClicksToPipeline();

      log('\n✅ [POLLING] Synchronisation globale terminée\n');
      return { success: true, campaignsProcessed: campaigns.length };
    } catch (error) {
      error('❌ [POLLING] Erreur syncAllActiveCampaigns:', error);
      return { success: false, error: error.message };
    }
  }

  async updateCampaignCounters() {
    try {
      log('🔢 [POLLING] Mise à jour des compteurs des campagnes...');

      const { rows: campaigns } = await query(
        `SELECT id
           FROM campaigns
          WHERE status IN ('active', 'tracking', 'relances_en_cours', 'surveillance', 'completed', 'paused')
            AND type = 'email'`
      );

      for (const c of campaigns) {
        const { rows: stats } = await query(
          `SELECT 
              COUNT(DISTINCT CASE WHEN event_type = 'sent' THEN lead_id END)::integer       AS sent,
              COUNT(DISTINCT CASE WHEN event_type = 'delivered' THEN lead_id END)::integer  AS delivered,
              COUNT(DISTINCT CASE WHEN event_type = 'open' THEN lead_id END)::integer       AS opened,
              COUNT(DISTINCT CASE WHEN event_type = 'click' THEN lead_id END)::integer      AS clicked,
              COUNT(DISTINCT CASE WHEN event_type = 'bounce' THEN lead_id END)::integer     AS bounced
           FROM email_tracking
          WHERE campaign_id = $1`,
          [c.id]
        );

        if (stats.length) {
          await execute(
            `UPDATE campaigns
                SET sent_count      = $1,
                    delivered_count = $2,
                    opened_count    = $3,
                    clicked_count   = $4,
                    updated_at      = NOW()
              WHERE id = $5`,
            [stats[0].sent, stats[0].delivered, stats[0].opened, stats[0].clicked, c.id]
          );
        }
      }

      log('✅ [POLLING] Compteurs mis à jour');
    } catch (error) {
      error('❌ [POLLING] Erreur updateCampaignCounters:', error);
    }
  }

  // Synchronise automatiquement les clics de email_tracking vers pipeline_leads
  async syncClicksToPipeline() {
    try {
      log('🔄 [POLLING] Synchronisation des clics vers pipeline...');

      // Récupérer les clics qui ne sont pas encore dans pipeline_leads
      const { rows: missingClicks } = await query(`
        SELECT DISTINCT et.lead_id, et.campaign_id, et.tenant_id
        FROM email_tracking et
        WHERE et.event_type = 'click'
          AND NOT EXISTS (
            SELECT 1 FROM pipeline_leads pl
            WHERE pl.lead_id = et.lead_id
              AND pl.campaign_id = et.campaign_id
          )
      `);

      if (missingClicks.length === 0) {
        log('✅ [POLLING] Tous les clics sont déjà dans le pipeline');
        return;
      }

      log(`📥 [POLLING] ${missingClicks.length} clics à injecter dans le pipeline`);

      for (const click of missingClicks) {
        try {
          await execute(
            `INSERT INTO pipeline_leads (id, tenant_id, lead_id, campaign_id, stage, created_at, updated_at)
             VALUES (gen_random_uuid(), $1, $2, $3, 'leads_click', NOW(), NOW())
             ON CONFLICT (tenant_id, lead_id, campaign_id)
             DO UPDATE SET stage = 'leads_click', updated_at = NOW()`,
            [click.tenant_id, click.lead_id, click.campaign_id]
          );
        } catch (insertErr) {
          // Fallback ancienne contrainte
          if (insertErr.message?.includes('constraint')) {
            await execute(
              `INSERT INTO pipeline_leads (id, tenant_id, lead_id, campaign_id, stage, created_at, updated_at)
               VALUES (gen_random_uuid(), $1, $2, $3, 'leads_click', NOW(), NOW())
               ON CONFLICT (lead_id, campaign_id)
               DO UPDATE SET stage = 'leads_click', updated_at = NOW()`,
              [click.tenant_id, click.lead_id, click.campaign_id]
            );
          }
        }
      }

      log(`✅ [POLLING] ${missingClicks.length} clics injectés dans le pipeline`);
    } catch (err) {
      error('❌ [POLLING] Erreur syncClicksToPipeline:', err.message);
    }
  }
}

export const pollingService = new ElasticEmailPolling();