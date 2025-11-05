import { authMiddleware } from '../middleware/auth.js';
import { queryOne } from '../lib/db.js';
import { sendEmail } from '../services/elasticEmail.js';

async function handler(req, res) {
  try {
    const { template_id, recipient_email } = req.body;
    
    const template = await queryOne('SELECT * FROM email_templates WHERE id = $1', [template_id]);
    
    if (!template) {
      return res.status(404).json({ error: 'Template introuvable' });
    }

    const elasticEmail = getElasticEmailService();
    await elasticEmail.sendEmail({
      to: recipient_email,
      subject: template.subject,
      html: template.html_content
    });

    return res.json({ success: true, message: 'Email de test envoyé' });
  } catch (error) {
    console.error('Erreur test email:', error);
    return res.status(500).json({ error: error.message });
  }
}

export default authMiddleware(handler);
