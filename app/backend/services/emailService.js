import { Client } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential } from '@azure/identity';

// Fonction pour créer le client Graph seulement quand nécessaire
function getGraphClient() {
  if (!process.env.MS_TENANT_ID || !process.env.MS_CLIENT_ID || !process.env.MS_CLIENT_SECRET) {
    throw new Error('Configuration Microsoft Graph manquante. Vérifiez vos variables d\'environnement.');
  }

  const credential = new ClientSecretCredential(
    process.env.MS_TENANT_ID,
    process.env.MS_CLIENT_ID,
    process.env.MS_CLIENT_SECRET
  );

  return Client.initWithMiddleware({
    authProvider: {
      getAccessToken: async () => {
        const token = await credential.getToken(process.env.MS_GRAPH_SCOPE || 'https://graph.microsoft.com/.default');
        return token.token;
      }
    }
  });
}

export async function sendEmailViaGraph({ to, subject, html, attachments = [] }) {
  try {
    const graphClient = getGraphClient();
    
    const message = {
      subject,
      body: {
        contentType: 'HTML',
        content: html
      },
      toRecipients: [
        {
          emailAddress: {
            address: to
          }
        }
      ]
    };

    if (attachments.length > 0) {
      message.attachments = attachments.map(att => ({
        '@odata.type': '#microsoft.graph.fileAttachment',
        name: att.filename,
        contentBytes: att.contentBase64
      }));
    }

    // Utiliser l'email de l'expéditeur depuis les variables d'environnement
    const senderEmail = process.env.MS_SENDER_EMAIL;
    if (!senderEmail) {
      throw new Error('MS_SENDER_EMAIL non configuré');
    }

    await graphClient
      .api(`/users/${senderEmail}/sendMail`)
      .post({ message });

    console.log(`✅ Email envoyé à ${to}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Erreur envoi email:', error);
    throw error;
  }
}