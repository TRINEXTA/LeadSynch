import { Client } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential } from '@azure/identity';

// Initialisation paresseuse d'Azure
let credential = null;

// Client Graph API
const getGraphClient = () => {
  // Initialiser seulement si les variables d'environnement sont présentes
  if (!credential) {
    if (!process.env.MS_TENANT_ID || !process.env.MS_CLIENT_ID || !process.env.MS_CLIENT_SECRET) {
      throw new Error('Azure credentials not configured. Please set MS_TENANT_ID, MS_CLIENT_ID, and MS_CLIENT_SECRET environment variables.');
    }
    credential = new ClientSecretCredential(
      process.env.MS_TENANT_ID,
      process.env.MS_CLIENT_ID,
      process.env.MS_CLIENT_SECRET
    );
  }

  return Client.initWithMiddleware({
    authProvider: {
      getAccessToken: async () => {
        const token = await credential.getToken('https://graph.microsoft.com/.default');
        return token.token;
      }
    }
  });
};

export async function sendTemporaryPassword(email, firstName, tempPassword) {
  try {
    const client = getGraphClient();
    
    const message = {
      subject: 'Bienvenue sur LeadSynch - Activez votre compte',
      body: {
        contentType: 'HTML',
        content: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #6366f1;">Bienvenue sur LeadSynch !</h1>
            <p>Bonjour ${firstName},</p>
            <p>Votre compte a été créé avec succès. Voici vos identifiants de connexion :</p>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Email :</strong> ${email}</p>
              <p><strong>Mot de passe temporaire :</strong> <code style="background: #fff; padding: 5px 10px; border-radius: 4px;">${tempPassword}</code></p>
            </div>
            <p>Pour des raisons de sécurité, vous devrez changer ce mot de passe lors de votre première connexion.</p>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login"
               style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
              Se connecter maintenant
            </a>
            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              Si vous n'avez pas demandé ce compte, veuillez ignorer cet email.
            </p>
          </div>
        `
      },
      toRecipients: [
        {
          emailAddress: {
            address: email
          }
        }
      ]
    };

    // Envoyer depuis la boîte partagée noreply@leadsynch.com
    await client
      .api('/users/noreply@leadsynch.com/sendMail')
      .post({ message });

    console.log(`✅ Email envoyé à ${email} via Microsoft Graph`);
    return { success: true };
  } catch (error) {
    console.error('❌ Erreur Graph API:', error.message);
    throw error;
  }
}

export async function sendPasswordResetEmail(email, firstName, resetToken) {
  try {
    const client = getGraphClient();

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

    const message = {
      subject: 'Réinitialisation de votre mot de passe LeadSynch',
      body: {
        contentType: 'HTML',
        content: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #6366f1;">Réinitialisation de mot de passe</h1>
            <p>Bonjour ${firstName},</p>
            <p>Vous avez demandé la réinitialisation de votre mot de passe LeadSynch.</p>
            <p>Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :</p>
            <a href="${resetUrl}"
               style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
              Réinitialiser mon mot de passe
            </a>
            <p style="color: #666;">Ce lien est valable pendant <strong>1 heure</strong>.</p>
            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              Si vous n'avez pas demandé cette réinitialisation, ignorez cet email. Votre mot de passe actuel reste inchangé.
            </p>
            <p style="color: #999; font-size: 11px; margin-top: 20px;">
              Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
              ${resetUrl}
            </p>
          </div>
        `
      },
      toRecipients: [
        {
          emailAddress: {
            address: email
          }
        }
      ]
    };

    await client
      .api('/users/noreply@leadsynch.com/sendMail')
      .post({ message });

    console.log(`✅ Email de réinitialisation envoyé à ${email} via Microsoft Graph`);
    return { success: true };
  } catch (error) {
    console.error('❌ Erreur Graph API (reset):', error.message);
    throw error;
  }
}

/**
 * Fonction générique pour envoyer des emails via le provider configuré
 */
export async function sendEmail({ to, subject, text, html, from, fromName, replyTo, tenantId }) {
  try {
    // Pour l'instant, on utilise Elastic Email par défaut
    // Tu peux ajouter d'autres providers plus tard

    const { query: q } = await import('./db.js');

    // Récupérer la clé API Elastic Email depuis les settings
    const { rows } = await q(
      `SELECT elastic_email_api_key, provider FROM mailing_settings WHERE tenant_id = $1`,
      [tenantId]
    );

    if (rows.length === 0) {
      throw new Error('Configuration email non trouvée');
    }

    const apiKey = rows[0].elastic_email_api_key;
    const provider = rows[0].provider || 'elasticemail';

    if (!apiKey) {
      throw new Error('Clé API Elastic Email non configurée');
    }

    // Envoyer via Elastic Email API
    const fetch = (await import('node-fetch')).default;

    const response = await fetch('https://api.elasticemail.com/v2/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        apikey: apiKey,
        from: from,
        fromName: fromName || '',
        to: to,
        subject: subject,
        bodyText: text || '',
        bodyHtml: html || text || '',
        replyTo: replyTo || from
      })
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Erreur Elastic Email inconnue');
    }

    console.log(`✅ Email envoyé via Elastic Email à ${to}`);
    return { success: true, messageId: result.data?.messageid };

  } catch (error) {
    console.error('❌ Erreur sendEmail:', error.message);
    throw error;
  }
}
