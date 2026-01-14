import { log, error, warn } from "../lib/logger.js";
import { Router } from "express";
import { execute, queryOne } from "../lib/db.js";
import rateLimit from 'express-rate-limit'; // ✅ AJOUT : Protection Rate Limiting

const router = Router();

// ========== CONFIGURATION RATE LIMIT ==========
// Limite stricte pour le tracking : 60 requêtes/min par IP
// Cela permet le fonctionnement normal mais bloque les abus massifs
const trackingLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // limite chaque IP à 60 requêtes par fenêtre
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many tracking requests from this IP'
});

// Appliquer le rate limiting à toutes les routes de ce fichier
router.use(trackingLimiter);

// ========== VALIDATION UUID ==========
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(str) {
  return typeof str === 'string' && UUID_REGEX.test(str);
}

// ========== VALIDATION URL SÉCURISÉE ==========
// IMPORTANT: On permet tous les domaines HTTP/HTTPS légitimes
// car les liens dans les emails peuvent pointer vers n'importe quel site client

function isValidRedirectUrl(urlString) {
  if (!urlString) return false;

  try {
    const url = new URL(urlString);
    // Vérifier que le protocole est HTTPS ou HTTP (pas javascript:, data:, etc.)
    if (!['http:', 'https:'].includes(url.protocol)) {
      return false;
    }
    // Bloquer les tentatives de redirect vers localhost ou IP privées
    const hostname = url.hostname.toLowerCase();
    if (hostname === 'localhost' || hostname.startsWith('127.') || hostname.startsWith('192.168.') || hostname.startsWith('10.')) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

// 📩 Ouverture d'email (supporte les relances avec follow_up_id)
router.get("/open", async (req, res) => {
  try {
    // ✅ AJOUT : Headers de sécurité et anti-cache pour le pixel
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-Content-Type-Options': 'nosniff'
    });

    const { lead_id, campaign_id, follow_up_id } = req.query;

    // Validation des paramètres UUID
    if (!lead_id || !campaign_id) {
      return res.status(400).send("Missing params");
    }

    if (!isValidUUID(lead_id) || !isValidUUID(campaign_id)) {
      return res.status(400).send("Invalid params format");
    }

    // Valider follow_up_id si présent
    if (follow_up_id && !isValidUUID(follow_up_id)) {
      return res.status(400).send("Invalid follow_up_id format");
    }

    const lead = await queryOne('SELECT tenant_id FROM leads WHERE id = $1', [lead_id]);

    // Pixel transparent 1x1 - défini une seule fois
    const pixel = Buffer.from("R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==", "base64");

    if (!lead) {
      res.writeHead(200, { "Content-Type": "image/gif" });
      return res.end(pixel);
    }

    const campaign = await queryOne(
      'SELECT id FROM campaigns WHERE id = $1 AND tenant_id = $2',
      [campaign_id, lead.tenant_id]
    );

    if (campaign) {
      await execute(`
        INSERT INTO email_tracking (tenant_id, campaign_id, lead_id, follow_up_id, event_type, created_at)
        VALUES ($3, $2, $1, $4, 'open', NOW())
        ON CONFLICT DO NOTHING
      `, [lead_id, campaign_id, lead.tenant_id, follow_up_id || null]);

      if (follow_up_id) {
        await execute(`
          UPDATE campaign_follow_ups
          SET total_opened = total_opened + 1, updated_at = NOW()
          WHERE id = $1
        `, [follow_up_id]);
      }
    }

    res.writeHead(200, { "Content-Type": "image/gif" });
    res.end(pixel);
  } catch (err) {
    error('Track open error:', err.message);
    const pixel = Buffer.from("R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==", "base64");
    res.writeHead(200, { "Content-Type": "image/gif" });
    res.end(pixel);
  }
});

// 🖱️ Clic sur lien (supporte les relances avec follow_up_id)
router.get("/click", async (req, res) => {
  try {
    const { lead_id, campaign_id, url, follow_up_id } = req.query;

    // Validation des paramètres UUID
    if (!lead_id || !campaign_id) {
      return res.status(400).send("Missing params");
    }

    if (!isValidUUID(lead_id) || !isValidUUID(campaign_id)) {
      return res.status(400).send("Invalid params format");
    }

    // Valider follow_up_id si présent
    if (follow_up_id && !isValidUUID(follow_up_id)) {
      return res.status(400).send("Invalid follow_up_id format");
    }

    // Décoder l'URL
    const decodedUrl = url ? decodeURIComponent(url) : null;

    // SÉCURITÉ: Valider l'URL de redirection pour éviter Open Redirect
    if (decodedUrl && !isValidRedirectUrl(decodedUrl)) {
      warn(`[SECURITY] Blocked redirect to invalid URL: ${decodedUrl}`);
      return res.status(400).send('Lien invalide');
    }

    // Si pas d'URL fournie, renvoyer une erreur
    if (!decodedUrl) {
      return res.status(400).send('Lien manquant');
    }

    // Vérifier que le lead et la campagne existent et appartiennent au même tenant
    const lead = await queryOne('SELECT tenant_id FROM leads WHERE id = $1', [lead_id]);
    if (!lead) {
      // Rediriger vers l'URL demandée même si le lead n'existe pas
      return res.redirect(decodedUrl);
    }

    const campaign = await queryOne(
      'SELECT id FROM campaigns WHERE id = $1 AND tenant_id = $2',
      [campaign_id, lead.tenant_id]
    );

    if (!campaign) {
      // Rediriger vers l'URL demandée même si la campagne n'existe pas
      return res.redirect(decodedUrl);
    }

    // Enregistrer le clic (avec follow_up_id si relance)
    await execute(`
      INSERT INTO email_tracking (tenant_id, campaign_id, lead_id, follow_up_id, event_type, created_at)
      VALUES ($3, $2, $1, $4, 'click', NOW())
      ON CONFLICT DO NOTHING
    `, [lead_id, campaign_id, lead.tenant_id, follow_up_id || null]);

    // 🔄 Envoie le lead dans le pipeline commercial (avec tenant_id obligatoire)
    // IMPORTANT - INTÉGRITÉ PIPELINE RELANCES:
    // - Les clics issus des RELANCES (follow_up_id présent) utilisent le MÊME campaign_id
    // - Cela garantit que le lead est réintégré dans la campagne ORIGINALE
    // - PAS de création de nouvelle campagne parallèle
    // - ON CONFLICT DO NOTHING: ne jamais écraser un stage existant (préserve progression)
    try {
      await execute(`
        INSERT INTO pipeline_leads (id, tenant_id, lead_id, campaign_id, stage, created_at, updated_at)
        VALUES (gen_random_uuid(), $1, $2, $3, 'leads_click', NOW(), NOW())
        ON CONFLICT (tenant_id, lead_id, campaign_id) DO NOTHING
      `, [lead.tenant_id, lead_id, campaign_id]);
    } catch (insertErr) {
      // Fallback: ancienne contrainte (lead_id, campaign_id) si migration non appliquée
      if (insertErr.message?.includes('constraint')) {
        await execute(`
          INSERT INTO pipeline_leads (id, tenant_id, lead_id, campaign_id, stage, created_at, updated_at)
          VALUES (gen_random_uuid(), $1, $2, $3, 'leads_click', NOW(), NOW())
          ON CONFLICT (lead_id, campaign_id) DO NOTHING
        `, [lead.tenant_id, lead_id, campaign_id]);
      } else {
        throw insertErr;
      }
    }

    log('🧩 [TRACK] Lead injecté dans pipeline (leads_click):', lead_id);

    // Si c'est une relance, mettre à jour les stats
    if (follow_up_id) {
      await execute(`
        UPDATE campaign_follow_ups
        SET total_clicked = total_clicked + 1, updated_at = NOW()
        WHERE id = $1
      `, [follow_up_id]);
    }

    // Redirection vers le lien réel (validé)
    res.redirect(decodedUrl);
  } catch (err) {
    error('Track click error:', err.message);
    // En cas d'erreur, rediriger vers l'URL si disponible, sinon erreur
    if (req.query.url) {
      try {
        const fallbackUrl = decodeURIComponent(req.query.url);
        if (isValidRedirectUrl(fallbackUrl)) {
          return res.redirect(fallbackUrl);
        }
      } catch {}
    }
    res.status(500).send('Erreur de redirection');
  }
});

export default router;
