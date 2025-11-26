import { query, queryOne, queryAll, execute } from '../lib/db.js';
import crypto from 'crypto';
import { sendEmail } from '../services/elasticEmail.js';

// =====================================================
// PUBLIC API - No auth required for client acceptance
// =====================================================

export default async function handler(req, res) {
  const { method } = req;
  const token = req.params?.token || req.query?.token;

  if (!token) {
    return res.status(400).json({ error: 'Token manquant' });
  }

  try {
    // GET - View proposal for acceptance
    if (method === 'GET') {
      return await getProposalForAcceptance(req, res, token);
    }

    // POST - Accept proposal (bon pour accord)
    if (method === 'POST') {
      return await acceptProposal(req, res, token);
    }

    return res.status(405).json({ error: 'Méthode non autorisée' });

  } catch (error) {
    console.error('❌ [PROPOSAL-ACCEPT] Erreur:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

// =====================================================
// GET - View proposal publicly
// =====================================================
async function getProposalForAcceptance(req, res, token) {
  // Find proposal by token
  const proposal = await queryOne(
    `SELECT p.*,
            l.company_name, l.contact_name, l.email as lead_email, l.phone as lead_phone,
            l.address as lead_address, l.city as lead_city, l.postal_code as lead_postal_code,
            t.name as tenant_name,
            bc.company_name as provider_name, bc.siret, bc.tva_number,
            bc.address as provider_address, bc.postal_code as provider_postal_code,
            bc.city as provider_city, bc.phone as provider_phone, bc.email as provider_email
     FROM proposals p
     LEFT JOIN leads l ON p.lead_id = l.id
     LEFT JOIN tenants t ON p.tenant_id = t.id
     LEFT JOIN billing_configs bc ON p.tenant_id = bc.tenant_id
     WHERE p.acceptance_token = $1`,
    [token]
  );

  if (!proposal) {
    return res.status(404).json({ error: 'Proposition non trouvée ou lien expiré' });
  }

  // Check if already accepted
  if (proposal.status === 'accepted') {
    return res.json({
      proposal: formatProposalForClient(proposal),
      already_accepted: true,
      accepted_at: proposal.accepted_at,
      message: 'Cette proposition a déjà été acceptée'
    });
  }

  // Check if expired
  if (proposal.valid_until && new Date(proposal.valid_until) < new Date()) {
    return res.json({
      proposal: formatProposalForClient(proposal),
      expired: true,
      message: 'Cette proposition a expiré'
    });
  }

  // Increment view count
  await execute(
    `UPDATE proposals
     SET view_count = COALESCE(view_count, 0) + 1,
         public_link_viewed_at = COALESCE(public_link_viewed_at, NOW())
     WHERE id = $1`,
    [proposal.id]
  );

  return res.json({
    proposal: formatProposalForClient(proposal),
    can_accept: true
  });
}

// =====================================================
// POST - Accept proposal (Bon pour accord)
// =====================================================
async function acceptProposal(req, res, token) {
  const { acceptor_name, acceptor_email, comments } = req.body;

  if (!acceptor_email) {
    return res.status(400).json({ error: 'Email requis pour valider la proposition' });
  }

  // Find proposal by token
  const proposal = await queryOne(
    `SELECT p.*, l.company_name, l.email as lead_email,
            u.email as commercial_email, u.first_name as commercial_first_name,
            u2.email as manager_email, u2.first_name as manager_first_name
     FROM proposals p
     LEFT JOIN leads l ON p.lead_id = l.id
     LEFT JOIN users u ON p.created_by = u.id
     LEFT JOIN users u2 ON u2.tenant_id = p.tenant_id AND u2.role IN ('admin', 'manager') AND u2.is_active = true
     WHERE p.acceptance_token = $1`,
    [token]
  );

  if (!proposal) {
    return res.status(404).json({ error: 'Proposition non trouvée' });
  }

  if (proposal.status === 'accepted') {
    return res.status(400).json({ error: 'Cette proposition a déjà été acceptée' });
  }

  if (proposal.valid_until && new Date(proposal.valid_until) < new Date()) {
    return res.status(400).json({ error: 'Cette proposition a expiré' });
  }

  // Get client IP and user agent
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0] || req.connection?.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';

  // Update proposal status to accepted
  await execute(
    `UPDATE proposals
     SET status = 'accepted',
         accepted_at = NOW(),
         acceptor_email = $2,
         acceptor_ip = $3,
         acceptor_user_agent = $4
     WHERE id = $1`,
    [proposal.id, acceptor_email, clientIp, userAgent]
  );

  // Create acceptance record
  await execute(
    `INSERT INTO proposal_acceptances (proposal_id, tenant_id, acceptor_email, acceptor_name, acceptor_ip, acceptor_user_agent)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [proposal.id, proposal.tenant_id, acceptor_email, acceptor_name, clientIp, userAgent]
  );

  // Send notifications to commercial and managers
  await sendAcceptanceNotifications(proposal, acceptor_name, acceptor_email, comments);

  return res.json({
    success: true,
    message: 'Proposition acceptée avec succès ! L\'équipe commerciale va vous contacter.',
    accepted_at: new Date().toISOString()
  });
}

// =====================================================
// HELPERS
// =====================================================

function formatProposalForClient(proposal) {
  // Parse services if JSON string
  let services = proposal.services;
  if (typeof services === 'string') {
    try {
      services = JSON.parse(services);
    } catch (e) {
      services = [];
    }
  }

  return {
    reference: proposal.reference,
    created_at: proposal.created_at,
    valid_until: proposal.valid_until,
    status: proposal.status,

    // Client info
    client: {
      company_name: proposal.company_name,
      contact_name: proposal.contact_name,
      email: proposal.lead_email,
      phone: proposal.lead_phone,
      address: proposal.lead_address,
      city: proposal.lead_city,
      postal_code: proposal.lead_postal_code
    },

    // Provider info
    provider: {
      name: proposal.provider_name || proposal.tenant_name,
      siret: proposal.siret,
      tva_number: proposal.tva_number,
      address: proposal.provider_address,
      city: proposal.provider_city,
      postal_code: proposal.provider_postal_code,
      phone: proposal.provider_phone,
      email: proposal.provider_email
    },

    // Services & pricing
    services: services,
    total_ht: parseFloat(proposal.total_ht) || 0,
    tva_rate: 20,
    total_ttc: (parseFloat(proposal.total_ht) || 0) * 1.2,
    notes: proposal.notes
  };
}

async function sendAcceptanceNotifications(proposal, acceptorName, acceptorEmail, comments) {
  const subject = `✅ Proposition ${proposal.reference} acceptée - ${proposal.company_name}`;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #10b981;">✅ Proposition acceptée !</h2>

      <p>La proposition <strong>${proposal.reference}</strong> a été acceptée.</p>

      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Détails</h3>
        <p><strong>Client :</strong> ${proposal.company_name}</p>
        <p><strong>Accepté par :</strong> ${acceptorName || 'Non renseigné'}</p>
        <p><strong>Email :</strong> ${acceptorEmail}</p>
        <p><strong>Montant HT :</strong> ${parseFloat(proposal.total_ht || 0).toFixed(2)} €</p>
        <p><strong>Date :</strong> ${new Date().toLocaleString('fr-FR')}</p>
        ${comments ? `<p><strong>Commentaire :</strong> ${comments}</p>` : ''}
      </div>

      <p style="background: #dbeafe; padding: 15px; border-radius: 8px;">
        💡 <strong>Prochaine étape :</strong> Vous pouvez maintenant générer le contrat depuis le Pipeline.
      </p>

      <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
        Ce message a été envoyé automatiquement par LeadSynch.
      </p>
    </div>
  `;

  // Notify commercial
  if (proposal.commercial_email) {
    try {
      await sendEmail({
        to: proposal.commercial_email,
        subject,
        htmlBody,
        fromName: 'LeadSynch'
      });

      // Log notification
      await execute(
        `INSERT INTO signature_notifications (tenant_id, notification_type, proposal_id, notified_email, subject, message)
         VALUES ($1, 'proposal_accepted', $2, $3, $4, $5)`,
        [proposal.tenant_id, proposal.id, proposal.commercial_email, subject, `Accepté par ${acceptorEmail}`]
      );

      console.log(`📧 Notification envoyée au commercial: ${proposal.commercial_email}`);
    } catch (e) {
      console.error('Erreur envoi notification commercial:', e);
    }
  }

  // Notify managers
  const managers = await queryAll(
    `SELECT DISTINCT email FROM users
     WHERE tenant_id = $1 AND role IN ('admin', 'manager') AND is_active = true AND email != $2`,
    [proposal.tenant_id, proposal.commercial_email || '']
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
        `INSERT INTO signature_notifications (tenant_id, notification_type, proposal_id, notified_email, subject, message)
         VALUES ($1, 'proposal_accepted', $2, $3, $4, $5)`,
        [proposal.tenant_id, proposal.id, manager.email, subject, `Accepté par ${acceptorEmail}`]
      );

      console.log(`📧 Notification envoyée au manager: ${manager.email}`);
    } catch (e) {
      console.error('Erreur envoi notification manager:', e);
    }
  }
}

// Generate unique acceptance token
export function generateAcceptanceToken() {
  return crypto.randomBytes(32).toString('hex');
}
