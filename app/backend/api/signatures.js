import express from 'express';
import crypto from 'crypto';
import { authMiddleware as authenticateToken } from '../middleware/auth.js';
import db from '../config/db.js';
import { sendEmailViaGraph } from '../services/emailService.js';

const router = express.Router();

// Helper functions
const queryOne = async (query, params = []) => {
  const { rows } = await db.query(query, params);
  return rows[0] || null;
};

const queryAll = async (query, params = []) => {
  const { rows } = await db.query(query, params);
  return rows;
};

// ========== ENVOYER CONTRAT POUR SIGNATURE ==========
router.post('/contracts/:id/send-for-signature', authenticateToken, async (req, res) => {
  try {
    const contractId = req.params.id;
    const tenantId = req.user.tenant_id;
    
    // Récupérer le contrat
    const contract = await queryOne(
      `SELECT c.*, l.email as client_email, l.contact_name, l.company_name
       FROM contracts c
       JOIN leads l ON c.lead_id = l.id
       WHERE c.id = $1 AND c.tenant_id = $2`,
      [contractId, tenantId]
    );
    
    if (!contract) {
      return res.status(404).json({ error: 'Contrat introuvable' });
    }
    
    // Générer token unique
    const signatureToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 jours
    
    // Créer signature
    await db.query(
      `INSERT INTO contract_signatures 
       (contract_id, tenant_id, signer_email, signer_company, signature_token, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')`,
      [contractId, tenantId, contract.client_email, contract.company_name, signatureToken]
    );
    
    // Créer token sécurisé
    await db.query(
      `INSERT INTO signature_tokens (contract_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [contractId, signatureToken, expiresAt]
    );
    
    // Envoyer email
    const signatureLink = `${process.env.FRONTEND_URL}/sign/${signatureToken}`;
    
    await sendEmailViaGraph({
      to: contract.client_email,
      subject: `Signature de contrat - ${contract.contract_number}`,
      html: `
        <h2>Bonjour ${contract.contact_name},</h2>
        <p>Votre contrat est prêt à être signé.</p>
        <p><strong>Contrat N° ${contract.contract_number}</strong></p>
        <p>Montant: ${contract.total_amount} € TTC</p>
        <br>
        <a href="${signatureLink}" style="background:#4F46E5;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;">
          📝 Signer le contrat
        </a>
        <br><br>
        <p>Ce lien est valide pendant 7 jours.</p>
      `
    });
    
    // Mettre à jour statut contrat
    await db.query(
      `UPDATE contracts SET status = 'sent', sent_at = NOW() WHERE id = $1`,
      [contractId]
    );
    
    return res.json({ 
      success: true, 
      message: 'Contrat envoyé pour signature'
    });
    
  } catch (error) {
    console.error('❌ Erreur envoi signature:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ========== RÉCUPÉRER CONTRAT PAR TOKEN (PUBLIC) ==========
router.get('/:token', async (req, res) => {
  try {
    const token = req.params.token;
    
    // Vérifier token
    const contract = await queryOne(
      `SELECT st.*, c.*, l.company_name, l.contact_name
       FROM signature_tokens st
       JOIN contracts c ON st.contract_id = c.id
       JOIN leads l ON c.lead_id = l.id
       WHERE st.token = $1 
         AND st.expires_at > NOW() 
         AND st.is_used = FALSE`,
      [token]
    );
    
    if (!contract) {
      return res.status(404).json({ error: 'Lien invalide ou expiré' });
    }
    
    // Logger l'accès
    await db.query(
      `INSERT INTO signature_audit_log (signature_id, action, ip_address, user_agent)
       SELECT id, 'link_clicked', $2, $3 
       FROM contract_signatures 
       WHERE signature_token = $1`,
      [token, req.ip, req.headers['user-agent']]
    );
    
    return res.json({
      success: true,
      contract: {
        id: contract.contract_id,
        number: contract.contract_number,
        amount: contract.total_amount,
        company: contract.company_name,
        contact: contract.contact_name,
        pdf_url: contract.pdf_url
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ========== DEMANDER CODE OTP ==========
router.post('/:token/request-otp', async (req, res) => {
  try {
    const token = req.params.token;
    const { signer_firstname, signer_lastname, signer_email, signer_position, cgv_accepted } = req.body;
    
    if (!cgv_accepted) {
      return res.status(400).json({ error: 'Vous devez accepter les CGV' });
    }
    
    // Générer OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    
    // Sauvegarder
    await db.query(
      `UPDATE contract_signatures 
       SET signer_name = $1,
           signer_firstname = $2,
           signer_lastname = $3,
           signer_email = $4,
           signer_position = $5,
           cgv_accepted = $6,
           cgv_accepted_at = NOW(),
           signature_otp = $7,
           otp_expires_at = $8,
           status = 'otp_sent'
       WHERE signature_token = $9`,
      [`${signer_firstname} ${signer_lastname}`, signer_firstname, signer_lastname, signer_email, signer_position, cgv_accepted, otp, otpExpiresAt, token]
    );
    
    // Envoyer OTP
    await sendEmailViaGraph({
      to: signer_email,
      subject: 'Code de validation de signature',
      html: `
        <h2>Code de validation</h2>
        <p>Votre code de validation pour signer le contrat :</p>
        <h1 style="font-size:48px;color:#4F46E5;letter-spacing:8px;">${otp}</h1>
        <p>Ce code est valide pendant 10 minutes.</p>
      `
    });
    
    return res.json({ success: true, message: 'Code OTP envoyé' });
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ========== VÉRIFIER OTP ET SIGNER ==========
router.post('/:token/verify-otp', async (req, res) => {
  try {
    const token = req.params.token;
    const { otp } = req.body;
    
    // Vérifier OTP
    const signature = await queryOne(
      `SELECT * FROM contract_signatures 
       WHERE signature_token = $1 
         AND signature_otp = $2 
         AND otp_expires_at > NOW()
         AND status = 'otp_sent'`,
      [token, otp]
    );
    
    if (!signature) {
      await db.query(
        `UPDATE contract_signatures 
         SET otp_attempts = otp_attempts + 1 
         WHERE signature_token = $1`,
        [token]
      );
      
      return res.status(400).json({ error: 'Code invalide ou expiré' });
    }
    
    // Marquer comme signé
    await db.query(
      `UPDATE contract_signatures 
       SET status = 'signed',
           signed_at = NOW(),
           signature_ip = $2,
           signature_user_agent = $3
       WHERE id = $1`,
      [signature.id, req.ip, req.headers['user-agent']]
    );
    
    // Mettre à jour contrat
    await db.query(
      `UPDATE contracts 
       SET status = 'signed',
           signed_at = NOW(),
           signed_by_name = $2
       WHERE id = $1`,
      [signature.contract_id, signature.signer_name]
    );
    
    // Marquer token utilisé
    await db.query(
      `UPDATE signature_tokens 
       SET is_used = TRUE, used_at = NOW() 
       WHERE token = $1`,
      [token]
    );
    
    // Envoyer confirmations
    await sendEmailViaGraph({
      to: signature.signer_email,
      subject: 'Contrat signé - Confirmation',
      html: `
        <h2>✅ Contrat signé avec succès</h2>
        <p>Votre signature a été enregistrée le ${new Date().toLocaleString('fr-FR')}.</p>
      `
    });
    
    return res.json({ 
      success: true, 
      message: 'Contrat signé avec succès'
    });
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;