import { log, error } from "../lib/logger.js";
import express from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { query, queryOne, queryAll, execute } from '../lib/db.js';
import crypto from 'crypto';

const router = express.Router();

// ========== SCHEMAS DE VALIDATION ==========

const configSchema = z.object({
  provider: z.enum(['meta', 'twilio', '360dialog']).default('meta'),
  api_key: z.string().optional(),
  api_secret: z.string().optional(),
  phone_number_id: z.string().optional(),
  business_account_id: z.string().optional(),
  access_token: z.string().optional(),
  daily_limit: z.number().int().positive().default(1000)
});

const templateSchema = z.object({
  template_name: z.string().min(1).max(100),
  language: z.string().default('fr'),
  category: z.enum(['marketing', 'utility', 'authentication']).default('marketing'),
  header_type: z.enum(['text', 'image', 'video', 'document']).optional(),
  header_content: z.string().optional(),
  body_text: z.string().min(1),
  footer_text: z.string().optional(),
  buttons: z.array(z.object({
    type: z.enum(['quick_reply', 'url', 'phone']),
    text: z.string(),
    url: z.string().optional(),
    phone: z.string().optional()
  })).optional(),
  variables: z.array(z.string()).optional()
});

const sendMessageSchema = z.object({
  lead_id: z.string().uuid().optional(),
  phone_number: z.string().min(10).max(20),
  message_type: z.enum(['template', 'text']),
  template_name: z.string().optional(),
  template_variables: z.record(z.string()).optional(),
  message_content: z.string().optional()
});

// ========== HELPER FUNCTIONS ==========

/**
 * Formate un numéro de téléphone au format international
 */
function formatPhoneNumber(phone) {
  // Supprimer tous les caractères non numériques
  let cleaned = phone.replace(/\D/g, '');

  // Si commence par 0, remplacer par 33 (France)
  if (cleaned.startsWith('0')) {
    cleaned = '33' + cleaned.substring(1);
  }

  // Si ne commence pas par un code pays, ajouter 33
  if (!cleaned.startsWith('33') && cleaned.length === 9) {
    cleaned = '33' + cleaned;
  }

  return cleaned;
}

/**
 * Envoie un message via Meta WhatsApp Cloud API
 */
async function sendViaMeta(config, phoneNumber, messageData) {
  const response = await fetch(
    `https://graph.facebook.com/v18.0/${config.phone_number_id}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phoneNumber,
        ...messageData
      })
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error?.message || 'Erreur envoi WhatsApp');
  }

  return result;
}

/**
 * Envoie un message via Twilio WhatsApp
 */
async function sendViaTwilio(config, phoneNumber, messageData) {
  const accountSid = config.api_key;
  const authToken = config.api_secret;
  const fromNumber = config.phone_number_id;

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        From: `whatsapp:+${fromNumber}`,
        To: `whatsapp:+${phoneNumber}`,
        Body: messageData.text?.body || messageData.template?.name || ''
      })
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Erreur envoi Twilio');
  }

  return { messages: [{ id: result.sid }] };
}

// ========== ROUTES CONFIGURATION ==========

/**
 * GET /config
 * Récupère la configuration WhatsApp du tenant
 */
router.get('/config', authMiddleware, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;

    const config = await queryOne(
      `SELECT id, provider, phone_number_id, business_account_id, is_active,
        daily_limit, messages_sent_today, last_reset_at, created_at, updated_at
       FROM whatsapp_config
       WHERE tenant_id = $1`,
      [tenantId]
    );

    res.json({
      success: true,
      config: config || null,
      is_configured: !!config && config.is_active
    });
  } catch (err) {
    error('Erreur récupération config WhatsApp:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /config
 * Configure ou met à jour l'intégration WhatsApp
 */
router.post('/config', authMiddleware, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;

    // Vérifier les permissions
    if (!['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Permission refusée' });
    }

    const data = configSchema.parse(req.body);

    // Générer un token de vérification webhook
    const webhookVerifyToken = crypto.randomBytes(32).toString('hex');

    const { rows } = await query(
      `INSERT INTO whatsapp_config (
        tenant_id, provider, api_key, api_secret, phone_number_id,
        business_account_id, access_token, webhook_verify_token, daily_limit, is_active
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
       ON CONFLICT (tenant_id) DO UPDATE SET
        provider = EXCLUDED.provider,
        api_key = EXCLUDED.api_key,
        api_secret = EXCLUDED.api_secret,
        phone_number_id = EXCLUDED.phone_number_id,
        business_account_id = EXCLUDED.business_account_id,
        access_token = EXCLUDED.access_token,
        daily_limit = EXCLUDED.daily_limit,
        updated_at = NOW()
       RETURNING id, provider, phone_number_id, is_active, webhook_verify_token`,
      [
        tenantId, data.provider, data.api_key || null, data.api_secret || null,
        data.phone_number_id || null, data.business_account_id || null,
        data.access_token || null, webhookVerifyToken, data.daily_limit
      ]
    );

    res.json({
      success: true,
      config: rows[0],
      webhook_verify_token: webhookVerifyToken,
      webhook_url: `${process.env.API_BASE_URL || 'https://api.leadsynch.com'}/api/whatsapp/webhook/${tenantId}`
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors });
    }
    error('Erreur configuration WhatsApp:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /config
 * Désactive l'intégration WhatsApp
 */
router.delete('/config', authMiddleware, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;

    if (!['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Permission refusée' });
    }

    await execute(
      `UPDATE whatsapp_config SET is_active = false, updated_at = NOW()
       WHERE tenant_id = $1`,
      [tenantId]
    );

    res.json({ success: true, message: 'Intégration WhatsApp désactivée' });
  } catch (err) {
    error('Erreur désactivation WhatsApp:', err);
    res.status(500).json({ error: err.message });
  }
});

// ========== ROUTES TEMPLATES ==========

/**
 * GET /templates
 * Liste les templates WhatsApp
 */
router.get('/templates', authMiddleware, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;

    const { rows } = await query(
      `SELECT * FROM whatsapp_templates
       WHERE tenant_id = $1
       ORDER BY created_at DESC`,
      [tenantId]
    );

    res.json({ success: true, templates: rows });
  } catch (err) {
    error('Erreur liste templates:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /templates
 * Crée un template WhatsApp
 */
router.post('/templates', authMiddleware, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const data = templateSchema.parse(req.body);

    const { rows } = await query(
      `INSERT INTO whatsapp_templates (
        tenant_id, template_name, language, category, header_type, header_content,
        body_text, footer_text, buttons, variables, status
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')
       RETURNING *`,
      [
        tenantId, data.template_name, data.language, data.category,
        data.header_type || null, data.header_content || null,
        data.body_text, data.footer_text || null,
        JSON.stringify(data.buttons || []), JSON.stringify(data.variables || [])
      ]
    );

    res.status(201).json({ success: true, template: rows[0] });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors });
    }
    error('Erreur création template:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /templates/:id
 * Supprime un template
 */
router.delete('/templates/:id', authMiddleware, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;

    await execute(
      'DELETE FROM whatsapp_templates WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    res.json({ success: true, message: 'Template supprimé' });
  } catch (err) {
    error('Erreur suppression template:', err);
    res.status(500).json({ error: err.message });
  }
});

// ========== ROUTES MESSAGES ==========

/**
 * POST /send
 * Envoie un message WhatsApp
 */
router.post('/send', authMiddleware, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;
    const data = sendMessageSchema.parse(req.body);

    // Récupérer la configuration
    const config = await queryOne(
      'SELECT * FROM whatsapp_config WHERE tenant_id = $1 AND is_active = true',
      [tenantId]
    );

    if (!config) {
      return res.status(400).json({ error: 'WhatsApp non configuré' });
    }

    // Vérifier la limite quotidienne
    const today = new Date().toISOString().split('T')[0];
    if (config.last_reset_at !== today) {
      await execute(
        `UPDATE whatsapp_config SET messages_sent_today = 0, last_reset_at = $1 WHERE id = $2`,
        [today, config.id]
      );
      config.messages_sent_today = 0;
    }

    if (config.messages_sent_today >= config.daily_limit) {
      return res.status(429).json({ error: 'Limite quotidienne de messages atteinte' });
    }

    // Formater le numéro de téléphone
    const phoneNumber = formatPhoneNumber(data.phone_number);

    // Construire le message
    let messageData;
    if (data.message_type === 'template') {
      messageData = {
        type: 'template',
        template: {
          name: data.template_name,
          language: { code: 'fr' },
          components: data.template_variables ? [
            {
              type: 'body',
              parameters: Object.values(data.template_variables).map(v => ({
                type: 'text',
                text: v
              }))
            }
          ] : []
        }
      };
    } else {
      messageData = {
        type: 'text',
        text: { body: data.message_content }
      };
    }

    // Envoyer selon le provider
    let result;
    if (config.provider === 'meta') {
      result = await sendViaMeta(config, phoneNumber, messageData);
    } else if (config.provider === 'twilio') {
      result = await sendViaTwilio(config, phoneNumber, messageData);
    } else {
      return res.status(400).json({ error: `Provider ${config.provider} non supporté` });
    }

    // Enregistrer le message
    const { rows } = await query(
      `INSERT INTO whatsapp_messages (
        tenant_id, lead_id, direction, phone_number, message_type,
        template_name, template_variables, message_content,
        whatsapp_message_id, status, sent_at, sent_by
       )
       VALUES ($1, $2, 'outbound', $3, $4, $5, $6, $7, $8, 'sent', NOW(), $9)
       RETURNING *`,
      [
        tenantId, data.lead_id || null, phoneNumber, data.message_type,
        data.template_name || null, JSON.stringify(data.template_variables || {}),
        data.message_content || null, result.messages?.[0]?.id || null, userId
      ]
    );

    // Incrémenter le compteur
    await execute(
      'UPDATE whatsapp_config SET messages_sent_today = messages_sent_today + 1 WHERE id = $1',
      [config.id]
    );

    // Mettre à jour la conversation
    await query(
      `INSERT INTO whatsapp_conversations (tenant_id, lead_id, phone_number, last_message_at, last_message_direction, last_message_preview, status)
       VALUES ($1, $2, $3, NOW(), 'outbound', $4, 'open')
       ON CONFLICT (tenant_id, phone_number) DO UPDATE SET
        last_message_at = NOW(),
        last_message_direction = 'outbound',
        last_message_preview = $4,
        updated_at = NOW()`,
      [tenantId, data.lead_id || null, phoneNumber, (data.message_content || data.template_name || '').substring(0, 100)]
    );

    res.json({
      success: true,
      message: rows[0],
      whatsapp_message_id: result.messages?.[0]?.id
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors });
    }
    error('Erreur envoi WhatsApp:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /messages
 * Liste les messages WhatsApp
 */
router.get('/messages', authMiddleware, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const leadId = req.query.lead_id;
    const phoneNumber = req.query.phone;
    const limit = parseInt(req.query.limit) || 50;

    let whereClause = 'WHERE wm.tenant_id = $1';
    const params = [tenantId];

    if (leadId) {
      whereClause += ` AND wm.lead_id = $${params.length + 1}`;
      params.push(leadId);
    }

    if (phoneNumber) {
      whereClause += ` AND wm.phone_number = $${params.length + 1}`;
      params.push(formatPhoneNumber(phoneNumber));
    }

    params.push(limit);

    const { rows } = await query(
      `SELECT wm.*, l.company_name
       FROM whatsapp_messages wm
       LEFT JOIN leads l ON wm.lead_id = l.id
       ${whereClause}
       ORDER BY wm.created_at DESC
       LIMIT $${params.length}`,
      params
    );

    res.json({ success: true, messages: rows });
  } catch (err) {
    error('Erreur liste messages:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /conversations
 * Liste les conversations WhatsApp
 */
router.get('/conversations', authMiddleware, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const status = req.query.status || 'open';
    const limit = parseInt(req.query.limit) || 50;

    const { rows } = await query(
      `SELECT wc.*, l.company_name, l.contact_name,
        u.first_name || ' ' || u.last_name as assigned_to_name
       FROM whatsapp_conversations wc
       LEFT JOIN leads l ON wc.lead_id = l.id
       LEFT JOIN users u ON wc.assigned_to = u.id
       WHERE wc.tenant_id = $1 AND wc.status = $2
       ORDER BY wc.last_message_at DESC
       LIMIT $3`,
      [tenantId, status, limit]
    );

    res.json({ success: true, conversations: rows });
  } catch (err) {
    error('Erreur liste conversations:', err);
    res.status(500).json({ error: err.message });
  }
});

// ========== WEBHOOK ==========

/**
 * GET /webhook/:tenantId
 * Vérification du webhook (challenge Meta)
 */
router.get('/webhook/:tenantId', async (req, res) => {
  const { tenantId } = req.params;
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe') {
    const config = await queryOne(
      'SELECT webhook_verify_token FROM whatsapp_config WHERE tenant_id = $1',
      [tenantId]
    );

    if (config && config.webhook_verify_token === token) {
      log(`✅ Webhook WhatsApp vérifié pour tenant ${tenantId}`);
      return res.status(200).send(challenge);
    }
  }

  res.status(403).send('Forbidden');
});

/**
 * POST /webhook/:tenantId
 * Réception des messages entrants
 */
router.post('/webhook/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const body = req.body;

    log('📱 Webhook WhatsApp reçu:', JSON.stringify(body).substring(0, 500));

    // Vérifier que le tenant existe
    const config = await queryOne(
      'SELECT id FROM whatsapp_config WHERE tenant_id = $1 AND is_active = true',
      [tenantId]
    );

    if (!config) {
      return res.status(200).send('OK'); // Toujours répondre 200 à Meta
    }

    // Traiter les messages entrants (Meta format)
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (value?.messages) {
      for (const message of value.messages) {
        const phoneNumber = message.from;
        const messageId = message.id;
        const messageType = message.type;
        let messageContent = '';

        if (messageType === 'text') {
          messageContent = message.text?.body || '';
        } else if (messageType === 'button') {
          messageContent = message.button?.text || '';
        }

        // Trouver le lead par numéro de téléphone
        const lead = await queryOne(
          `SELECT id FROM leads WHERE tenant_id = $1 AND (
            REGEXP_REPLACE(phone, '[^0-9]', '', 'g') LIKE '%' || $2
            OR REGEXP_REPLACE(direct_line, '[^0-9]', '', 'g') LIKE '%' || $2
           )
           LIMIT 1`,
          [tenantId, phoneNumber.slice(-9)]
        );

        // Enregistrer le message entrant
        await execute(
          `INSERT INTO whatsapp_messages (
            tenant_id, lead_id, direction, phone_number, message_type,
            message_content, whatsapp_message_id, status, created_at
           )
           VALUES ($1, $2, 'inbound', $3, $4, $5, $6, 'received', NOW())`,
          [tenantId, lead?.id || null, phoneNumber, messageType, messageContent, messageId]
        );

        // Mettre à jour la conversation
        await query(
          `INSERT INTO whatsapp_conversations (tenant_id, lead_id, phone_number, last_message_at, last_message_direction, last_message_preview, unread_count, status)
           VALUES ($1, $2, $3, NOW(), 'inbound', $4, 1, 'open')
           ON CONFLICT (tenant_id, phone_number) DO UPDATE SET
            last_message_at = NOW(),
            last_message_direction = 'inbound',
            last_message_preview = $4,
            unread_count = whatsapp_conversations.unread_count + 1,
            updated_at = NOW()`,
          [tenantId, lead?.id || null, phoneNumber, messageContent.substring(0, 100)]
        );

        log(`📥 Message WhatsApp reçu de ${phoneNumber}: ${messageContent.substring(0, 50)}`);
      }
    }

    // Traiter les mises à jour de statut
    if (value?.statuses) {
      for (const status of value.statuses) {
        await execute(
          `UPDATE whatsapp_messages
           SET status = $1,
               ${status.status === 'delivered' ? 'delivered_at = NOW()' : ''}
               ${status.status === 'read' ? 'read_at = NOW()' : ''}
           WHERE whatsapp_message_id = $2`,
          [status.status, status.id]
        );
      }
    }

    res.status(200).send('OK');
  } catch (err) {
    error('Erreur webhook WhatsApp:', err);
    res.status(200).send('OK'); // Toujours répondre 200 à Meta
  }
});

export default router;
