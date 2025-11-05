import fetch from 'node-fetch';

const ELASTIC_EMAIL_API_KEY = process.env.ELASTIC_EMAIL_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'b2b@trinexta.fr';
const ELASTIC_EMAIL_API_URL = 'https://api.elasticemail.com/v2/email/send';

// ==================== SEND EMAIL ====================
export const sendEmail = async ({ to, subject, htmlBody, textBody, fromName = 'LeadSync' }) => {
  try {
    console.log(`📧 Envoi email à ${to}...`);

    if (!ELASTIC_EMAIL_API_KEY) {
      throw new Error('ELASTIC_EMAIL_API_KEY non configurée');
    }

    const params = new URLSearchParams({
      apikey: ELASTIC_EMAIL_API_KEY,
      from: EMAIL_FROM,
      fromName: fromName,
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
      console.error('❌ Erreur Elastic Email:', result);
      throw new Error(result.error || 'Erreur envoi email');
    }

    console.log(`✅ Email envoyé avec succès à ${to} - TransactionID: ${result.data.transactionid}`);

    return {
      success: true,
      messageId: result.data.transactionid,
      to: to
    };

  } catch (error) {
    console.error('❌ Erreur sendEmail:', error);
    throw error;
  }
};

// ==================== SEND BULK EMAILS ====================
export const sendBulkEmails = async (emails) => {
  console.log(`📧 Envoi de ${emails.length} emails en masse...`);
  
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

  console.log(`✅ Envoi terminé: ${results.success.length} succès, ${results.failed.length} échecs`);

  return results;
};

// ==================== SEND TEST EMAIL ====================
export const sendTestEmail = async ({ to, templateHtml, subject }) => {
  console.log(`🧪 Envoi email de test à ${to}...`);

  return await sendEmail({
    to,
    subject: `[TEST] ${subject}`,
    htmlBody: templateHtml,
    fromName: 'LeadSync - Test'
  });
};

export default {
  sendEmail,
  sendBulkEmails,
  sendTestEmail
};