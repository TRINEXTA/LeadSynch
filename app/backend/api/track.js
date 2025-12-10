import { log, error, warn } from "../lib/logger.js";
import { Router } from "express";
import { execute, queryOne } from "../lib/db.js";

const router = Router();

// ========== VALIDATION UUID ==========
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(str) {
  return typeof str === 'string' && UUID_REGEX.test(str);
}

// ========== VALIDATION URL SÉCURISÉE ==========
const ALLOWED_REDIRECT_DOMAINS = [
  'leadsynch.com',
  'www.leadsynch.com',
  'app.leadsynch.com',
  'trinexta.fr',
  'www.trinexta.fr'
];

function isValidRedirectUrl(urlString) {
  if (!urlString) return false;

  try {
    const url = new URL(urlString);
    // Vérifier que le protocole est HTTPS ou HTTP
    if (!['http:', 'https:'].includes(url.protocol)) {
      return false;
    }
    // Vérifier que le domaine est dans la liste autorisée
    const hostname = url.hostname.toLowerCase();
    return ALLOWED_REDIRECT_DOMAINS.some(domain =>
      hostname === domain || hostname.endsWith('.' + domain)
    );
  } catch {
    return false;
  }
}

// 📩 Ouverture d'email (supporte les relances avec follow_up_id)
router.get("/open", async (req, res) => {
  try {
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

    // Vérifier que le lead et la campagne existent et appartiennent au même tenant
    const lead = await queryOne('SELECT tenant_id FROM leads WHERE id = $1', [lead_id]);
    if (!lead) {
      // Retourner le pixel quand même pour ne pas révéler si le lead existe
      const pixel = Buffer.from("R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==", "base64");
      res.writeHead(200, { "Content-Type": "image/gif" });
      return res.end(pixel);
    }

    const campaign = await queryOne(
      'SELECT id FROM campaigns WHERE id = $1 AND tenant_id = $2',
      [campaign_id, lead.tenant_id]
    );

    if (!campaign) {
      const pixel = Buffer.from("R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==", "base64");
      res.writeHead(200, { "Content-Type": "image/gif" });
      return res.end(pixel);
    }

    // Enregistrer l'ouverture (avec follow_up_id si relance)
    await execute(`
      INSERT INTO email_tracking (tenant_id, campaign_id, lead_id, follow_up_id, event_type, created_at)
      VALUES ($3, $2, $1, $4, 'open', NOW())
      ON CONFLICT DO NOTHING
    `, [lead_id, campaign_id, lead.tenant_id, follow_up_id || null]);

    // Si c'est une relance, mettre à jour les stats
    if (follow_up_id) {
      await execute(`
        UPDATE campaign_follow_ups
        SET total_opened = total_opened + 1, updated_at = NOW()
        WHERE id = $1
      `, [follow_up_id]);
    }

    // Pixel transparent 1x1 pour les ouvertures
    const pixel = Buffer.from("R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==", "base64");
    res.writeHead(200, { "Content-Type": "image/gif" });
    res.end(pixel);
  } catch (err) {
    error('Track open error:', err.message);
    // Retourner le pixel même en cas d'erreur pour ne pas bloquer l'affichage email
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
      warn(`[SECURITY] Blocked redirect to unauthorized URL: ${decodedUrl}`);
      return res.redirect("https://leadsynch.com");
    }

    // Vérifier que le lead et la campagne existent et appartiennent au même tenant
    const lead = await queryOne('SELECT tenant_id FROM leads WHERE id = $1', [lead_id]);
    if (!lead) {
      return res.redirect(decodedUrl || "https://leadsynch.com");
    }

    const campaign = await queryOne(
      'SELECT id FROM campaigns WHERE id = $1 AND tenant_id = $2',
      [campaign_id, lead.tenant_id]
    );

    if (!campaign) {
      return res.redirect(decodedUrl || "https://leadsynch.com");
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
    res.redirect(decodedUrl || "https://leadsynch.com");
  } catch (err) {
    error('Track click error:', err.message);
    res.redirect("https://leadsynch.com");
  }
});

export default router;
