import { log, error, warn } from "../lib/logger.js";
import fetch from 'node-fetch';

const ELASTIC_EMAIL_API_KEY = process.env.ELASTIC_EMAIL_API_KEY;
// IMPORTANT: EMAIL_FROM doit être configuré dans les variables d'environnement
// Plus de fallback hardcodé vers trinexta.fr ou leadsynch.com
const EMAIL_FROM = process.env.EMAIL_FROM;
const ELASTIC_EMAIL_API_URL = 'https://api.elasticemail.com/v2/email/send';

// ==================== SEND EMAIL ====================
// fromName doit être fourni par l'appelant (tenant company_name)
export const sendEmail = async ({ to, subject, htmlBody, textBody, fromName }) => {
  try {
    log(`📧 Envoi email à ${to}...`);

    if (!ELASTIC_EMAIL_API_KEY) {
      throw new Error('ELASTIC_EMAIL_API_KEY non configurée');
    }

    if (!EMAIL_FROM) {
      throw new Error('EMAIL_FROM non configurée dans les variables d\'environnement');
    }

    if (!fromName) {
      warn('⚠️ fromName non fourni, utilisation de "Support" par défaut');
    }

    const params = new URLSearchParams({
      apikey: ELASTIC_EMAIL_API_KEY,
      from: EMAIL_FROM,
      fromName: fromName || 'Support',
      to: to,
      subject: subject,
      bodyHtml: htmlBody || '',
      bodyText: textBody || htmlBody?.replace(/<[^>]*>/g, '') || '',
      isTransactional: 'false'
    });

    const response = await fetch(ELASTIC_EMAIL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      error('❌ Erreur Elastic Email:', result);
      throw new Error(result.error || 'Erreur envoi email');
    }

    log(`✅ Email envoyé avec succès à ${to} - TransactionID: ${result.data.transactionid}`);

    return {
      success: true,
      messageId: result.data.transactionid,
      to: to
    };

  } catch (error) {
    error('❌ Erreur sendEmail:', error);
    throw error;
  }
};

// ==================== SEND BULK EMAILS ====================
export const sendBulkEmails = async (emails) => {
  log(`📧 Envoi de ${emails.length} emails en masse...`);
  
  const results = {
    success: [],
    failed: []
  };

  for (const email of emails) {
    try {
      const result = await sendEmail(email);
      results.success.push({
        ...result,
        originalEmail: email
      });
    } catch (error) {
      results.failed.push({
        email: email.to,
        error: error.message
      });
    }
  }

  log(`✅ Envoi terminé: ${results.success.length} succès, ${results.failed.length} échecs`);

  return results;
};

// ==================== SEND TEST EMAIL ====================
export const sendTestEmail = async ({ to, templateHtml, subject, fromName }) => {
  log(`🧪 Envoi email de test à ${to}...`);

  return await sendEmail({
    to,
    subject: `[TEST] ${subject}`,
    htmlBody: templateHtml,
    fromName: fromName ? `${fromName} - Test` : 'Test'
  });
};

export default {
  sendEmail,
  sendBulkEmails,
  sendTestEmail
};