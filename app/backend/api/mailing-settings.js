import { query as q } from '../lib/db.js';

/**
 * GET /api/mailing-settings
 * Récupère les paramètres d'envoi d'emails pour le tenant
 */
export async function getMailingSettings(req, res) {
  try {
    const { tenant_id: tenantId } = req.user;

    const { rows } = await q(
      `SELECT * FROM mailing_settings WHERE tenant_id = $1`,
      [tenantId]
    );

    if (rows.length === 0) {
      // Pas encore de configuration, retourner des valeurs par défaut
      return res.json({
        settings: {
          from_email: '',
          from_name: '',
          reply_to: '',
          provider: 'elasticemail', // Par défaut
          api_key: '',
          configured: false
        }
      });
    }

    const settings = rows[0];

    // Ne pas exposer la clé API complète pour des raisons de sécurité
    const maskedApiKey = settings.api_key
      ? `${settings.api_key.substring(0, 8)}...${settings.api_key.substring(settings.api_key.length - 4)}`
      : '';

    res.json({
      settings: {
        from_email: settings.from_email,
        from_name: settings.from_name,
        reply_to_email: settings.reply_to_email,
        provider: settings.provider,
        api_key: maskedApiKey,
        configured: settings.is_active || false, // Utiliser is_active au lieu de configured
        created_at: settings.created_at,
        updated_at: settings.updated_at
      }
    });
  } catch (error) {
    console.error('Erreur récupération mailing settings:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: error.message
    });
  }
}

/**
 * POST /api/mailing-settings
 * Met à jour les paramètres d'envoi d'emails
 */
export async function updateMailingSettings(req, res) {
  try {
    const { tenant_id: tenantId } = req.user;
    const { from_email, from_name, reply_to_email, provider, elastic_email_api_key, company_name, signature, use_company_name } = req.body;

    // Validation
    if (!from_email || !from_name) {
      return res.status(400).json({
        error: 'Paramètres invalides',
        message: 'L\'email expéditeur et le nom sont requis'
      });
    }

    // Déterminer le nom à afficher dans les emails
    const displayName = use_company_name && company_name ? company_name : from_name;

    // Vérifier si une config existe déjà
    const { rows: existing } = await q(
      `SELECT id FROM mailing_settings WHERE tenant_id = $1`,
      [tenantId]
    );

    let result;

    if (existing.length > 0) {
      // Mise à jour - Utiliser SEULEMENT les colonnes qui existent dans la table
      const { rows } = await q(
        `UPDATE mailing_settings
         SET from_email = $1,
             from_name = $2,
             reply_to_email = $3,
             provider = $4,
             elastic_email_api_key = $5,
             is_active = true,
             updated_at = NOW()
         WHERE tenant_id = $6
         RETURNING *`,
        [
          from_email,
          displayName, // Utilise le nom d'entreprise si la checkbox est cochée
          reply_to_email || from_email,
          provider || 'elasticemail',
          elastic_email_api_key || '',
          tenantId
        ]
      );

      result = rows[0];
    } else {
      // Création
      const { rows } = await q(
        `INSERT INTO mailing_settings (
          tenant_id, from_email, from_name, reply_to_email, provider, elastic_email_api_key, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, true)
        RETURNING *`,
        [
          tenantId,
          from_email,
          displayName, // Utilise le nom d'entreprise si la checkbox est cochée
          reply_to_email || from_email,
          provider || 'elasticemail',
          elastic_email_api_key || ''
        ]
      );

      result = rows[0];
    }

    res.json({
      message: 'Configuration email enregistrée avec succès',
      settings: {
        from_email: result.from_email,
        from_name: result.from_name,
        reply_to_email: result.reply_to_email,
        provider: result.provider,
        company_name: company_name,
        signature: signature,
        use_company_name: use_company_name,
        configured: true
      }
    });
  } catch (error) {
    console.error('Erreur mise à jour mailing settings:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: error.message
    });
  }
}

/**
 * POST /api/mailing-settings/test
 * Envoie un email de test
 */
export async function testMailingSettings(req, res) {
  try {
    const { tenant_id: tenantId } = req.user;
    const { to, subject, body } = req.body;

    // Accepter aussi test_email pour compatibilité
    const toEmail = to || req.body.test_email;

    if (!toEmail) {
      return res.status(400).json({
        error: 'Adresse email destinataire requise',
        message: 'Veuillez fournir une adresse email pour l\'envoi du test'
      });
    }

    // Récupérer les paramètres
    const { rows } = await q(
      `SELECT * FROM mailing_settings WHERE tenant_id = $1`,
      [tenantId]
    );

    if (rows.length === 0 || !rows[0].is_active) {
      return res.status(400).json({
        error: 'Configuration email non définie',
        message: 'Veuillez d\'abord configurer vos paramètres d\'envoi email'
      });
    }

    const settings = rows[0];

    // Importer la fonction d'envoi d'email
    const { sendEmail } = await import('../lib/email.js');

    // Préparer le contenu de l'email
    const emailSubject = subject || '✉️ Test Email - LeadSynch CRM';
    const emailBody = body || 'Ceci est un email de test envoyé depuis LeadSynch CRM.\n\nSi vous recevez ce message, votre configuration email fonctionne correctement !';

    // Envoyer l'email de test
    await sendEmail({
      to: toEmail,
      subject: emailSubject,
      text: emailBody,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb; border-radius: 10px;">
          <div style="background: linear-gradient(135deg, #2563eb 0%, #0891b2 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
            <h1 style="color: white; margin: 0; font-size: 28px;">📧 Email de Test</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">LeadSynch CRM</p>
          </div>
          <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <p style="color: #374151; line-height: 1.6; white-space: pre-wrap; margin: 0;">${emailBody.replace(/\n/g, '<br>')}</p>
          </div>
          <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
            <p>Email envoyé depuis ${settings.from_email}</p>
            <p>Provider: ${settings.provider}</p>
          </div>
        </div>
      `,
      from: settings.from_email,
      fromName: settings.from_name,
      replyTo: settings.reply_to || settings.from_email,
      tenantId
    });

    console.log(`✅ Email de test envoyé à ${toEmail} depuis ${settings.from_email}`);

    res.json({
      message: `Email de test envoyé avec succès à ${toEmail} !`,
      details: {
        to: toEmail,
        from: settings.from_email,
        subject: emailSubject,
        provider: settings.provider
      }
    });
  } catch (error) {
    console.error('❌ Erreur envoi email test:', error);
    res.status(500).json({
      error: 'Erreur lors de l\'envoi de l\'email de test',
      message: error.message || 'Une erreur est survenue lors de l\'envoi'
    });
  }
}
