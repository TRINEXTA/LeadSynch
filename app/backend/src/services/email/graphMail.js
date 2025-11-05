import { ClientSecretCredential } from "@azure/identity";

const SCOPE = process.env.MS_GRAPH_SCOPE || "https://graph.microsoft.com/.default";

const credential = new ClientSecretCredential(
  process.env.MS_TENANT_ID,
  process.env.MS_CLIENT_ID,
  process.env.MS_CLIENT_SECRET
);

/**
 * Envoi d'email via Microsoft Graph (app-only).
 * @param {{to:string|string[], subject:string, html:string, from?:string}} p
 */
export async function sendGraphMail({ to, subject, html, from }) {
  const sender = from || process.env.MS_SENDER;
  if (!sender) throw new Error("MS_SENDER manquant.");

  const token = await credential.getToken(SCOPE);
  if (!token?.token) throw new Error("Impossible d'obtenir un token Graph.");

  const recipients = (Array.isArray(to) ? to : [to])
    .filter(Boolean)
    .map(a => ({ emailAddress: { address: a.trim() } }));

  const payload = {
    message: {
      subject,
      body: { contentType: "HTML", content: html },
      toRecipients: recipients
    },
    saveToSentItems: false
  };

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(sender)}/sendMail`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Graph sendMail ${res.status}: ${txt}`);
  }

  return { ok: true };
}
