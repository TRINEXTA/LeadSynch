import { Router } from "express";
import { execute } from "../lib/db.js";

const router = Router();

// 📩 Ouverture d'email
router.get("/open", async (req, res) => {
  const { lead_id, campaign_id } = req.query;
  if (!lead_id || !campaign_id) return res.status(400).send("Missing params");

  await execute(`
    INSERT INTO email_tracking (tenant_id, campaign_id, lead_id, event_type, created_at)
    SELECT tenant_id, $2, $1, 'open', NOW()
    FROM leads WHERE id = $1
    ON CONFLICT DO NOTHING
  `, [lead_id, campaign_id]);

  // Pixel transparent 1x1 pour les ouvertures
  const pixel = Buffer.from("R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==", "base64");
  res.writeHead(200, { "Content-Type": "image/gif" });
  res.end(pixel);
});

// 🖱️ Clic sur lien
router.get("/click", async (req, res) => {
  const { lead_id, campaign_id, url } = req.query;
  if (!lead_id || !campaign_id) return res.status(400).send("Missing params");

  await execute(`
    INSERT INTO email_tracking (tenant_id, campaign_id, lead_id, event_type, created_at)
    SELECT tenant_id, $2, $1, 'click', NOW()
    FROM leads WHERE id = $1
    ON CONFLICT DO NOTHING
  `, [lead_id, campaign_id]);

  // 🔄 Envoie le lead dans le pipeline commercial
  await execute(`
    INSERT INTO pipeline_leads (lead_id, campaign_id, stage, created_at)
    VALUES ($1, $2, 'leads_click', NOW())
    ON CONFLICT (lead_id, campaign_id) DO UPDATE SET stage = 'leads_click', updated_at = NOW()
  `, [lead_id, campaign_id]);

  // Redirection vers le lien réel
  res.redirect(decodeURIComponent(url || "https://leadsych.com"));
});

export default router;
