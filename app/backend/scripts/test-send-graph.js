import { log, error, warn } from "../lib/logger.js";
﻿import "dotenv/config";
import { sendGraphMail } from "../src/services/email/graphMail.js";

(async () => {
  try {
    const to = process.env.TEST_TO || process.env.MS_SENDER;
    const res = await sendGraphMail({
      to,
      subject: "Test Microsoft Graph – LeadSynch",
      html: "<h2>OK ✅</h2><p>Mail envoyé via Microsoft Graph (app-only).</p>",
      from: process.env.MS_SENDER, // ex: noreply@leadsynch.com (boîte partagée)
    });
    log("✔ Mail envoyé:", res);
    process.exit(0);
  } catch (e) {
    error("✖ Erreur:", e?.message || e);
    process.exit(1);
  }
})();
