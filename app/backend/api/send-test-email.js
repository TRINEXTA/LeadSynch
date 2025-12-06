import { log, error as logError } from "../lib/logger.js";
import { authMiddleware } from '../middleware/auth.js';
import { queryOne } from '../lib/db.js';
import { sendEmail } from '../services/elasticEmail.js';

async function handler(req, res) {
  try {
    const { template_id, recipient_email } = req.body;

    if (!template_id || !recipient_email) {
      return res.status(400).json({ error: 'template_id et recipient_email requis' });
    }

    const template = await queryOne('SELECT * FROM email_templates WHERE id = $1', [template_id]);

    if (!template) {
      return res.status(404).json({ error: 'Template introuvable' });
    }

    await sendEmail({
      to: recipient_email,
      subject: template.subject || 'Email de test',
      html: template.html_content || template.html_body || ''
    });

    log(`✅ Email de test envoyé à ${recipient_email}`);
    return res.json({ success: true, message: 'Email de test envoyé' });
  } catch (err) {
    logError('Erreur test email:', err);
    return res.status(500).json({ error: err.message });
  }
}

export default authMiddleware(handler);
