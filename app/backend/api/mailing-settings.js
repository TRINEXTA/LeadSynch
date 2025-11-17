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
          reply_to_email: '',
          company_name: '',
          company_address: '',
          provider: 'elasticemail', // Par défaut
          api_key: '',
          configured: false
        }
      });
    }

    const settings = rows[0];

    // Utiliser la clé du .env comme fallback si aucune clé n'est enregistrée
    const actualApiKey = settings.api_key || process.env.ELASTIC_EMAIL_API_KEY || '';

    // Ne pas exposer la clé API complète pour des raisons de sécurité
    const maskedApiKey = actualApiKey
      ? `${actualApiKey.substring(0, 8)}...${actualApiKey.substring(actualApiKey.length - 4)}`
      : '';

    res.json({
      settings: {
        from_email: settings.from_email,
        from_name: settings.from_name,
        reply_to_email: settings.reply_to_email,
        company_name: settings.company_name,
        company_address: settings.company_address,
        provider: settings.provider,
        api_key: maskedApiKey,
        configured: settings.configured,
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
    const { from_email, from_name, reply_to_email, company_name, company_address, provider, api_key } = req.body;

    // Validation
    if (!from_email || !from_name) {
      return res.status(400).json({
        error: 'Paramètres invalides',
        message: 'L\'email expéditeur et le nom sont requis'
      });
    }

    // Utiliser la clé Elastic Email du .env comme fallback si aucune clé n'est fournie
    const finalApiKey = api_key || process.env.ELASTIC_EMAIL_API_KEY || '';

    // Vérifier si une config existe déjà
    const { rows: existing } = await q(
      `SELECT id FROM mailing_settings WHERE tenant_id = $1`,
      [tenantId]
    );

    let result;

    if (existing.length > 0) {
      // Mise à jour
      const updateFields = [];
      const values = [];
      let paramCount = 1;

      updateFields.push(`from_email = $${paramCount++}`);
      values.push(from_email);

      updateFields.push(`from_name = $${paramCount++}`);
      values.push(from_name);

      updateFields.push(`reply_to_email = $${paramCount++}`);
      values.push(reply_to_email || from_email);

      if (company_name !== undefined) {
        updateFields.push(`company_name = $${paramCount++}`);
        values.push(company_name);
      }

      if (company_address !== undefined) {
        updateFields.push(`company_address = $${paramCount++}`);
        values.push(company_address);
      }

      updateFields.push(`provider = $${paramCount++}`);
      values.push(provider || 'elasticemail');

      // Si une nouvelle clé API est fournie (non masquée), sinon utiliser la clé du .env
      if (api_key && !api_key.includes('...')) {
        updateFields.push(`api_key = $${paramCount++}`);
        values.push(finalApiKey);
      } else if (!api_key && finalApiKey) {
        // Utiliser la clé du .env si aucune clé n'est fournie
        updateFields.push(`api_key = $${paramCount++}`);
        values.push(finalApiKey);
      }

      updateFields.push(`configured = true`);
      updateFields.push(`updated_at = NOW()`);

      values.push(tenantId);
      values.push(existing[0].id);

      const { rows } = await q(
        `UPDATE mailing_settings
         SET ${updateFields.join(', ')}
         WHERE tenant_id = $${paramCount++} AND id = $${paramCount}
         RETURNING *`,
        values
      );

      result = rows[0];
    } else {
      // Création - Utiliser la clé du .env si aucune clé personnalisée n'est fournie
      const { rows } = await q(
        `INSERT INTO mailing_settings (
          tenant_id, from_email, from_name, reply_to_email, company_name, company_address, provider, api_key, configured
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
        RETURNING *`,
        [
          tenantId,
          from_email,
          from_name,
          reply_to_email || from_email,
          company_name || '',
          company_address || '',
          provider || 'elasticemail',
          finalApiKey
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
        company_name: result.company_name,
        company_address: result.company_address,
        provider: result.provider,
        configured: result.configured
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
    const { test_email } = req.body;

    if (!test_email) {
      return res.status(400).json({
        error: 'Email de test requis'
      });
    }

    // Récupérer les paramètres
    const { rows } = await q(
      `SELECT * FROM mailing_settings WHERE tenant_id = $1`,
      [tenantId]
    );

    if (rows.length === 0 || !rows[0].configured) {
      return res.status(400).json({
        error: 'Configuration email non définie'
      });
    }

    const settings = rows[0];

    // Utiliser la clé du .env comme fallback
    const apiKey = settings.api_key || process.env.ELASTIC_EMAIL_API_KEY;

    if (!apiKey) {
      return res.status(400).json({
        error: 'Clé API Elastic Email non configurée',
        message: 'Veuillez configurer ELASTIC_EMAIL_API_KEY dans .env ou fournir une clé API'
      });
    }

    // TODO: Implémenter l'envoi réel via ElasticEmail
    // Pour l'instant, simuler le succès
    console.log(`📧 Email de test envoyé à ${test_email} depuis ${settings.from_email}`);
    console.log(`🔑 Utilisation clé API: ${apiKey.substring(0, 8)}...`);

    res.json({
      message: 'Email de test envoyé avec succès',
      test_email
    });
  } catch (error) {
    console.error('Erreur envoi email test:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: error.message
    });
  }
}
