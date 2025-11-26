import { query, queryOne, queryAll, execute } from '../lib/db.js';
import crypto from 'crypto';
import { sendEmail } from '../services/elasticEmail.js';
import { generateContractPDF } from '../services/pdfGenerator.js';

// =====================================================
// PUBLIC API - No auth required for client signature
// =====================================================

export default async function handler(req, res) {
  const { method } = req;
  const token = req.params?.token || req.query?.token;
  const action = req.query?.action || req.body?.action;

  if (!token) {
    return res.status(400).json({ error: 'Token manquant' });
  }

  try {
    // GET - View contract for signing
    if (method === 'GET') {
      return await getContractForSigning(req, res, token);
    }

    // POST - Various actions
    if (method === 'POST') {
      switch (action) {
        case 'send-code':
          return await sendVerificationCode(req, res, token);
        case 'verify':
          return await verifyCodeAndSign(req, res, token);
        case 'accept-terms':
          return await acceptTerms(req, res, token);
        default:
          return res.status(400).json({ error: 'Action non reconnue' });
      }
    }

    return res.status(405).json({ error: 'Méthode non autorisée' });

  } catch (error) {
    console.error('❌ [CONTRACT-SIGN] Erreur:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

// =====================================================
// GET - View contract publicly
// =====================================================
async function getContractForSigning(req, res, token) {
  const contract = await queryOne(
    `SELECT c.*,
            l.company_name, l.contact_name, l.email as lead_email, l.phone as lead_phone,
            l.address as lead_address, l.city as lead_city, l.postal_code as lead_postal_code,
            t.name as tenant_name,
            bc.company_name as provider_name, bc.siret, bc.tva_number,
            bc.address as provider_address, bc.postal_code as provider_postal_code,
            bc.city as provider_city, bc.phone as provider_phone, bc.email as provider_email
     FROM contracts c
     LEFT JOIN leads l ON c.lead_id = l.id
     LEFT JOIN tenants t ON c.tenant_id = t.id
     LEFT JOIN billing_configs bc ON c.tenant_id = bc.tenant_id
     WHERE c.signature_token = $1`,
    [token]
  );

  if (!contract) {
    return res.status(404).json({ error: 'Contrat non trouvé ou lien expiré' });
  }

  // Check if already signed
  if (contract.status === 'signed') {
    return res.json({
      contract: formatContractForClient(contract),
      already_signed: true,
      signed_at: contract.signed_at,
      message: 'Ce contrat a déjà été signé'
    });
  }

  // Increment view count
  await execute(
    `UPDATE contracts
     SET view_count = COALESCE(view_count, 0) + 1,
         public_link_viewed_at = COALESCE(public_link_viewed_at, NOW())
     WHERE id = $1`,
    [contract.id]
  );

  return res.json({
    contract: formatContractForClient(contract),
    terms_accepted: !!contract.terms_accepted_at,
    can_sign: true
  });
}

// =====================================================
// POST - Accept terms and conditions
// =====================================================
async function acceptTerms(req, res, token) {
  const contract = await queryOne(
    `SELECT * FROM contracts WHERE signature_token = $1`,
    [token]
  );

  if (!contract) {
    return res.status(404).json({ error: 'Contrat non trouvé' });
  }

  if (contract.status === 'signed') {
    return res.status(400).json({ error: 'Ce contrat a déjà été signé' });
  }

  await execute(
    `UPDATE contracts SET terms_accepted_at = NOW() WHERE id = $1`,
    [contract.id]
  );

  return res.json({
    success: true,
    message: 'Conditions acceptées. Vous pouvez maintenant demander un code de vérification.'
  });
}

// =====================================================
// POST - Send verification code by email
// =====================================================
async function sendVerificationCode(req, res, token) {
  const { signer_email } = req.body;

  if (!signer_email) {
    return res.status(400).json({ error: 'Email requis' });
  }

  const contract = await queryOne(
    `SELECT c.*, l.company_name, bc.company_name as provider_name
     FROM contracts c
     LEFT JOIN leads l ON c.lead_id = l.id
     LEFT JOIN billing_configs bc ON c.tenant_id = bc.tenant_id
     WHERE c.signature_token = $1`,
    [token]
  );

  if (!contract) {
    return res.status(404).json({ error: 'Contrat non trouvé' });
  }

  if (contract.status === 'signed') {
    return res.status(400).json({ error: 'Ce contrat a déjà été signé' });
  }

  // Check if terms accepted
  if (!contract.terms_accepted_at) {
    return res.status(400).json({ error: 'Veuillez d\'abord accepter les conditions générales' });
  }

  // Generate 6-digit code
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Save code
  await execute(
    `UPDATE contracts
     SET verification_code = $2,
         verification_code_expires_at = $3,
         verification_attempts = 0,
         signer_email = $4
     WHERE id = $1`,
    [contract.id, code, expiresAt, signer_email]
  );

  // Send code by email
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #3b82f6;">Code de vérification pour signature</h2>

      <p>Bonjour,</p>

      <p>Vous avez demandé un code de vérification pour signer le contrat <strong>${contract.reference}</strong>
         avec <strong>${contract.provider_name || 'votre prestataire'}</strong>.</p>

      <div style="background: #f3f4f6; padding: 30px; border-radius: 8px; margin: 30px 0; text-align: center;">
        <p style="margin: 0; font-size: 14px; color: #6b7280;">Votre code de vérification :</p>
        <p style="margin: 10px 0; font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1f2937;">${code}</p>
        <p style="margin: 0; font-size: 12px; color: #ef4444;">Ce code expire dans 10 minutes</p>
      </div>

      <p style="color: #6b7280; font-size: 14px;">
        Si vous n'avez pas demandé ce code, ignorez cet email.
      </p>

      <p style="color: #6b7280; font-size: 12px; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
        Ce message a été envoyé automatiquement. Merci de ne pas y répondre.
      </p>
    </div>
  `;

  try {
    await sendEmail({
      to: signer_email,
      subject: `Code de vérification : ${code} - Contrat ${contract.reference}`,
      htmlBody,
      fromName: contract.provider_name || 'LeadSynch'
    });

    console.log(`📧 Code de vérification envoyé à ${signer_email} pour contrat ${contract.reference}`);

    return res.json({
      success: true,
      message: `Code envoyé à ${signer_email}. Vérifiez votre boîte mail.`,
      expires_in_minutes: 10
    });

  } catch (error) {
    console.error('Erreur envoi code:', error);
    return res.status(500).json({ error: 'Erreur lors de l\'envoi du code' });
  }
}

// =====================================================
// POST - Verify code and sign contract
// =====================================================
async function verifyCodeAndSign(req, res, token) {
  const { code, signer_name } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Code requis' });
  }

  const contract = await queryOne(
    `SELECT c.*,
            l.company_name, l.email as lead_email,
            u.email as commercial_email, u.first_name as commercial_first_name
     FROM contracts c
     LEFT JOIN leads l ON c.lead_id = l.id
     LEFT JOIN users u ON c.created_by = u.id
     WHERE c.signature_token = $1`,
    [token]
  );

  if (!contract) {
    return res.status(404).json({ error: 'Contrat non trouvé' });
  }

  if (contract.status === 'signed') {
    return res.status(400).json({ error: 'Ce contrat a déjà été signé' });
  }

  // Check attempts
  if (contract.verification_attempts >= 5) {
    return res.status(400).json({
      error: 'Trop de tentatives. Demandez un nouveau code.',
      too_many_attempts: true
    });
  }

  // Increment attempts
  await execute(
    `UPDATE contracts SET verification_attempts = verification_attempts + 1 WHERE id = $1`,
    [contract.id]
  );

  // Check code
  if (contract.verification_code !== code) {
    return res.status(400).json({
      error: 'Code incorrect',
      attempts_remaining: 5 - (contract.verification_attempts + 1)
    });
  }

  // Check expiration
  if (new Date(contract.verification_code_expires_at) < new Date()) {
    return res.status(400).json({
      error: 'Code expiré. Demandez un nouveau code.',
      code_expired: true
    });
  }

  // Get client IP and user agent
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0] || req.connection?.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';

  // Sign the contract!
  await execute(
    `UPDATE contracts
     SET status = 'signed',
         signed_at = NOW(),
         signer_ip = $2,
         signer_user_agent = $3,
         verification_code = NULL,
         verification_code_expires_at = NULL
     WHERE id = $1`,
    [contract.id, clientIp, userAgent]
  );

  // Create signature record
  const signatureHash = crypto.createHash('sha256')
    .update(`${contract.id}-${contract.signer_email}-${new Date().toISOString()}`)
    .digest('hex');

  await execute(
    `INSERT INTO contract_signatures (
       contract_id, tenant_id, signer_email, signer_name, signer_ip, signer_user_agent,
       verification_code_verified_at, signature_hash
     ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)`,
    [contract.id, contract.tenant_id, contract.signer_email, signer_name, clientIp, userAgent, signatureHash]
  );

  // Send notifications to commercial and managers
  await sendSignatureNotifications(contract, signer_name);

  // Send confirmation to signer
  await sendSignerConfirmation(contract, signer_name);

  return res.json({
    success: true,
    message: 'Contrat signé avec succès ! Vous allez recevoir une confirmation par email.',
    signed_at: new Date().toISOString(),
    signature_hash: signatureHash
  });
}

// =====================================================
// HELPERS
// =====================================================

function formatContractForClient(contract) {
  let services = contract.services;
  if (typeof services === 'string') {
    try {
      services = JSON.parse(services);
    } catch (e) {
      services = [];
    }
  }

  return {
    reference: contract.reference,
    created_at: contract.created_at,
    status: contract.status,

    // Offer details
    offer_name: contract.offer_name,
    offer_type: contract.offer_type,
    services: services,

    // Contract terms
    contract_type: contract.contract_type,
    payment_frequency: contract.payment_frequency,
    user_count: contract.user_count,
    monthly_price: parseFloat(contract.monthly_price) || 0,
    total_amount: parseFloat(contract.total_amount) || 0,
    start_date: contract.start_date,
    end_date: contract.end_date,

    // Client info
    client: {
      company_name: contract.company_name,
      contact_name: contract.contact_name,
      email: contract.lead_email,
      phone: contract.lead_phone,
      address: contract.lead_address,
      city: contract.lead_city,
      postal_code: contract.lead_postal_code
    },

    // Provider info
    provider: {
      name: contract.provider_name || contract.tenant_name,
      siret: contract.siret,
      tva_number: contract.tva_number,
      address: contract.provider_address,
      city: contract.provider_city,
      postal_code: contract.provider_postal_code,
      phone: contract.provider_phone,
      email: contract.provider_email
    },

    notes: contract.notes
  };
}

async function sendSignatureNotifications(contract, signerName) {
  const subject = `✅ Contrat ${contract.reference} signé - ${contract.company_name}`;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #10b981;">✅ Contrat signé !</h2>

      <p>Le contrat <strong>${contract.reference}</strong> a été signé électroniquement.</p>

      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Détails</h3>
        <p><strong>Client :</strong> ${contract.company_name}</p>
        <p><strong>Signé par :</strong> ${signerName || 'Non renseigné'}</p>
        <p><strong>Email :</strong> ${contract.signer_email}</p>
        <p><strong>Offre :</strong> ${contract.offer_name}</p>
        <p><strong>Montant :</strong> ${parseFloat(contract.monthly_price || 0).toFixed(2)} €/mois</p>
        <p><strong>Date :</strong> ${new Date().toLocaleString('fr-FR')}</p>
      </div>

      <p style="background: #d1fae5; padding: 15px; border-radius: 8px;">
        🎉 <strong>Félicitations !</strong> Le contrat est maintenant actif. Vous pouvez télécharger le PDF signé depuis LeadSynch.
      </p>

      <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
        Ce message a été envoyé automatiquement par LeadSynch.
      </p>
    </div>
  `;

  // Notify commercial
  if (contract.commercial_email) {
    try {
      await sendEmail({
        to: contract.commercial_email,
        subject,
        htmlBody,
        fromName: 'LeadSynch'
      });

      await execute(
        `INSERT INTO signature_notifications (tenant_id, notification_type, contract_id, notified_email, subject, message)
         VALUES ($1, 'contract_signed', $2, $3, $4, $5)`,
        [contract.tenant_id, contract.id, contract.commercial_email, subject, `Signé par ${contract.signer_email}`]
      );

      console.log(`📧 Notification signature envoyée au commercial: ${contract.commercial_email}`);
    } catch (e) {
      console.error('Erreur envoi notification commercial:', e);
    }
  }

  // Notify managers
  const managers = await queryAll(
    `SELECT DISTINCT email FROM users
     WHERE tenant_id = $1 AND role IN ('admin', 'manager') AND is_active = true AND email != $2`,
    [contract.tenant_id, contract.commercial_email || '']
  );

  for (const manager of managers) {
    try {
      await sendEmail({
        to: manager.email,
        subject,
        htmlBody,
        fromName: 'LeadSynch'
      });

      await execute(
        `INSERT INTO signature_notifications (tenant_id, notification_type, contract_id, notified_email, subject, message)
         VALUES ($1, 'contract_signed', $2, $3, $4, $5)`,
        [contract.tenant_id, contract.id, manager.email, subject, `Signé par ${contract.signer_email}`]
      );

      console.log(`📧 Notification signature envoyée au manager: ${manager.email}`);
    } catch (e) {
      console.error('Erreur envoi notification manager:', e);
    }
  }
}

async function sendSignerConfirmation(contract, signerName) {
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #10b981;">✅ Contrat signé avec succès</h2>

      <p>Bonjour${signerName ? ' ' + signerName : ''},</p>

      <p>Nous confirmons que le contrat <strong>${contract.reference}</strong> a été signé électroniquement.</p>

      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Récapitulatif</h3>
        <p><strong>Référence :</strong> ${contract.reference}</p>
        <p><strong>Offre :</strong> ${contract.offer_name}</p>
        <p><strong>Montant :</strong> ${parseFloat(contract.monthly_price || 0).toFixed(2)} € HT/mois</p>
        <p><strong>Type :</strong> ${contract.contract_type === 'avec_engagement_12' ? 'Engagement 12 mois' : 'Sans engagement'}</p>
        <p><strong>Date de signature :</strong> ${new Date().toLocaleString('fr-FR')}</p>
      </div>

      <p>Notre équipe va prendre contact avec vous très prochainement pour la mise en place du service.</p>

      <p style="color: #6b7280; font-size: 12px; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
        Ce message a été envoyé automatiquement. Pour toute question, contactez directement votre commercial.
      </p>
    </div>
  `;

  try {
    await sendEmail({
      to: contract.signer_email,
      subject: `Confirmation de signature - Contrat ${contract.reference}`,
      htmlBody,
      fromName: 'LeadSynch'
    });
    console.log(`📧 Confirmation envoyée au signataire: ${contract.signer_email}`);
  } catch (e) {
    console.error('Erreur envoi confirmation signataire:', e);
  }
}

// Generate unique signature token
export function generateSignatureToken() {
  return crypto.randomBytes(32).toString('hex');
}
