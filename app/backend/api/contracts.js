import { log, error, warn } from "../lib/logger.js";
import { query, queryOne, queryAll, execute } from '../lib/db.js';
import { verifyAuth } from '../middleware/auth.js';
import { z } from 'zod';
import crypto from 'crypto';
import { sendEmail } from '../services/elasticEmail.js';
import { generateContractPDF, savePDF } from '../services/pdfGenerator.js';

// Validation schemas
const createContractSchema = z.object({
  lead_id: z.string().uuid().optional(),
  pipeline_lead_id: z.string().uuid().optional(),
  proposal_id: z.string().uuid().optional(),
  offer_type: z.string(),
  offer_name: z.string(),
  services: z.array(z.string()).default([]),
  contract_type: z.enum(['sans_engagement', 'avec_engagement_12']).default('avec_engagement_12'),
  payment_frequency: z.enum(['mensuel', 'annuel']).default('mensuel'),
  user_count: z.number().min(1).default(1),
  monthly_price: z.number().min(0),
  total_amount: z.number().min(0),
  start_date: z.string(),
  notes: z.string().optional(),
  send_for_signature: z.boolean().default(false)
});

const updateContractSchema = z.object({
  offer_type: z.string().optional(),
  offer_name: z.string().optional(),
  services: z.array(z.string()).optional(),
  contract_type: z.enum(['sans_engagement', 'avec_engagement_12']).optional(),
  payment_frequency: z.enum(['mensuel', 'annuel']).optional(),
  user_count: z.number().min(1).optional(),
  monthly_price: z.number().min(0).optional(),
  total_amount: z.number().min(0).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['draft', 'sent', 'signed', 'cancelled', 'expired']).optional(),
  send_for_signature: z.boolean().optional()
});

export default async function handler(req, res) {
  // Verify authentication
  const authResult = await verifyAuth(req);
  if (!authResult.authenticated) {
    return res.status(401).json({ error: 'Non autorisé' });
  }

  const { userId, tenantId } = authResult;
  const { method } = req;

  try {
    // GET /api/contracts - List contracts
    // GET /api/contracts/:id - Get single contract
    // GET /api/contracts/:id?action=pdf - Generate PDF
    if (method === 'GET') {
      const contractId = req.params?.id || req.query?.id;
      const action = req.query?.action;

      if (contractId) {
        // Get single contract with full lead info
        const contract = await queryOne(
          `SELECT c.*, l.company_name, l.email as lead_email, l.phone as lead_phone,
                  l.address as lead_address, l.city as lead_city, l.postal_code as lead_postal_code,
                  l.contact_name as lead_contact_name,
                  u.first_name as created_by_name, u.last_name as created_by_lastname
           FROM contracts c
           LEFT JOIN leads l ON c.lead_id = l.id
           LEFT JOIN users u ON c.created_by = u.id
           WHERE c.id = $1 AND c.tenant_id = $2`,
          [contractId, tenantId]
        );

        if (!contract) {
          return res.status(404).json({ error: 'Contrat non trouvé' });
        }

        // Generate PDF if requested
        if (action === 'pdf') {
          // Get tenant info for PDF header
          const tenant = await queryOne(
            `SELECT t.*, bi.company_name as name, bi.siret, bi.tva_number,
                    bi.address_line1 as address, bi.postal_code, bi.city
             FROM tenants t
             LEFT JOIN billing_info bi ON t.id = bi.tenant_id
             WHERE t.id = $1`,
            [tenantId]
          );

          // Build lead object for template
          const lead = {
            company_name: contract.company_name,
            contact_name: contract.lead_contact_name,
            email: contract.lead_email,
            phone: contract.lead_phone,
            address: contract.lead_address,
            postal_code: contract.lead_postal_code,
            city: contract.lead_city
          };

          // Parse services if JSON string
          const contractData = {
            ...contract,
            services: typeof contract.services === 'string'
              ? JSON.parse(contract.services)
              : contract.services
          };

          // Generate PDF
          const pdfBuffer = await generateContractPDF(contractData, lead, tenant);
          const filename = `contrat-${contract.reference || contract.id.substring(0, 8)}.pdf`;
          const pdfUrl = await savePDF(pdfBuffer, filename);

          // Return PDF as base64 for frontend download
          const pdfBase64 = pdfBuffer.toString('base64');

          return res.json({
            success: true,
            pdf_url: pdfUrl,
            pdf_base64: pdfBase64,
            filename,
            contract_id: contract.id,
            reference: contract.reference
          });
        }

        return res.json({ contract });
      }

      // List contracts with filters
      const { status, lead_id, search, page = 1, limit = 50 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      let whereClause = 'WHERE c.tenant_id = $1';
      const params = [tenantId];
      let paramIndex = 2;

      if (status) {
        whereClause += ` AND c.status = $${paramIndex++}`;
        params.push(status);
      }

      if (lead_id) {
        whereClause += ` AND c.lead_id = $${paramIndex++}`;
        params.push(lead_id);
      }

      if (search) {
        whereClause += ` AND (c.reference ILIKE $${paramIndex} OR c.offer_name ILIKE $${paramIndex} OR l.company_name ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      const contracts = await queryAll(
        `SELECT c.*, l.company_name, l.email as lead_email
         FROM contracts c
         LEFT JOIN leads l ON c.lead_id = l.id
         ${whereClause}
         ORDER BY c.created_at DESC
         LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
        [...params, parseInt(limit), offset]
      );

      // Get total count
      const countResult = await queryOne(
        `SELECT COUNT(*) as total FROM contracts c
         LEFT JOIN leads l ON c.lead_id = l.id
         ${whereClause}`,
        params
      );

      return res.json({
        contracts,
        total: parseInt(countResult.total),
        page: parseInt(page),
        limit: parseInt(limit)
      });
    }

    // POST /api/contracts - Create contract
    if (method === 'POST') {
      const data = createContractSchema.parse(req.body);

      // Generate reference manually (simple format)
      const year = new Date().getFullYear();
      const countResult = await queryOne(
        `SELECT COUNT(*) as count FROM contracts WHERE tenant_id = $1 AND reference LIKE $2`,
        [tenantId, `CTR-${year}-%`]
      );
      const seq = (parseInt(countResult?.count) || 0) + 1;
      const reference = `CTR-${year}-${String(seq).padStart(4, '0')}`;

      // Calculate end date based on contract type
      let end_date = null;
      if (data.contract_type === 'avec_engagement_12') {
        const startDate = new Date(data.start_date);
        startDate.setFullYear(startDate.getFullYear() + 1);
        end_date = startDate.toISOString().split('T')[0];
      }

      // Create contract
      const contract = await queryOne(
        `INSERT INTO contracts (
          tenant_id, lead_id, pipeline_lead_id, proposal_id, reference,
          title, offer_type, offer_name, services, contract_type,
          payment_frequency, user_count, monthly_price, total_amount,
          start_date, end_date, notes, status, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        RETURNING *`,
        [
          tenantId,
          data.lead_id || null,
          data.pipeline_lead_id || null,
          data.proposal_id || null,
          reference,
          data.offer_name, // title = offer_name
          data.offer_type,
          data.offer_name,
          JSON.stringify(data.services),
          data.contract_type,
          data.payment_frequency,
          data.user_count,
          data.monthly_price,
          data.total_amount,
          data.start_date,
          end_date,
          data.notes || null,
          data.send_for_signature ? 'sent' : 'draft',
          userId
        ]
      );

      // If send_for_signature is true, trigger the signature flow
      if (data.send_for_signature && data.lead_id) {
        // Get lead info for email
        const lead = await queryOne(
          `SELECT email, company_name, contact_name FROM leads WHERE id = $1`,
          [data.lead_id]
        );

        // Get tenant/business info
        const tenant = await queryOne(
          `SELECT t.name as tenant_name, bi.company_name as provider_name
           FROM tenants t
           LEFT JOIN billing_info bi ON t.id = bi.tenant_id
           WHERE t.id = $1`,
          [tenantId]
        );

        if (lead?.email) {
          // Generate unique signature token
          const signatureToken = crypto.randomBytes(32).toString('hex');

          // Update contract with signature token and sent_at
          await execute(
            `UPDATE contracts SET signature_token = $1, sent_at = NOW(), public_link_sent_at = NOW() WHERE id = $2`,
            [signatureToken, contract.id]
          );

          const providerName = tenant?.provider_name || tenant?.tenant_name || 'Votre prestataire';
          const signatureLink = `${process.env.FRONTEND_URL || 'https://app.leadsynch.com'}/sign/${signatureToken}`;

          const htmlBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #1f2937;">Bonjour ${lead.contact_name || 'Madame, Monsieur'},</h2>

              <p>Suite à notre échange, nous avons le plaisir de vous transmettre votre contrat pour signature.</p>

              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #4f46e5;">Contrat N° ${reference}</h3>
                <p><strong>Client :</strong> ${lead.company_name || 'N/A'}</p>
                <p><strong>Offre :</strong> ${data.offer_name}</p>
                <p><strong>Montant TTC :</strong> ${parseFloat(data.total_amount || 0).toFixed(2)} €</p>
                <p><strong>Date de début :</strong> ${new Date(data.start_date).toLocaleDateString('fr-FR')}</p>
              </div>

              <p>Pour signer ce contrat électroniquement, veuillez cliquer sur le bouton ci-dessous :</p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${signatureLink}"
                   style="display: inline-block; background: linear-gradient(135deg, #059669, #10b981); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                  ✍️ Signer le contrat
                </a>
              </div>

              <p style="color: #6b7280; font-size: 14px;">
                <strong>Processus de signature sécurisé :</strong><br>
                1. Consultez les détails du contrat<br>
                2. Acceptez les conditions générales<br>
                3. Un code de vérification vous sera envoyé par email<br>
                4. Entrez le code pour valider votre signature
              </p>

              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

              <p>Cordialement,<br><strong>${providerName}</strong></p>

              <p style="color: #9ca3af; font-size: 12px; margin-top: 30px;">
                Ce message a été envoyé automatiquement. Si vous n'êtes pas à l'origine de cette demande, veuillez ignorer cet email.
              </p>
            </div>
          `;

          try {
            await sendEmail({
              to: lead.email,
              subject: `Contrat à signer N° ${reference} - ${providerName}`,
              htmlBody,
              fromName: providerName
            });
            log(`📧 [CONTRACT] Email de signature envoyé à ${lead.email} pour contrat ${reference}`);
          } catch (emailError) {
            error(`❌ [CONTRACT] Erreur envoi email:`, emailError);
            // Don't fail the request, just log the error
          }
        }
      }

      return res.status(201).json({
        contract,
        message: data.send_for_signature ? 'Contrat créé et envoyé pour signature' : 'Contrat créé en brouillon'
      });
    }

    // PUT /api/contracts/:id - Update contract
    if (method === 'PUT') {
      const contractId = req.params?.id || req.query?.id;
      if (!contractId) {
        return res.status(400).json({ error: 'ID du contrat requis' });
      }

      const data = updateContractSchema.parse(req.body);

      // Check ownership
      const existing = await queryOne(
        `SELECT * FROM contracts WHERE id = $1 AND tenant_id = $2`,
        [contractId, tenantId]
      );

      if (!existing) {
        return res.status(404).json({ error: 'Contrat non trouvé' });
      }

      // Build update query
      const updates = [];
      const updateParams = [];
      let updateIndex = 1;

      const fieldMappings = {
        offer_type: 'offer_type',
        offer_name: 'offer_name',
        contract_type: 'contract_type',
        payment_frequency: 'payment_frequency',
        user_count: 'user_count',
        monthly_price: 'monthly_price',
        total_amount: 'total_amount',
        start_date: 'start_date',
        end_date: 'end_date',
        notes: 'notes',
        status: 'status'
      };

      for (const [key, column] of Object.entries(fieldMappings)) {
        if (data[key] !== undefined) {
          updates.push(`${column} = $${updateIndex++}`);
          updateParams.push(data[key]);
        }
      }

      if (data.services) {
        updates.push(`services = $${updateIndex++}`);
        updateParams.push(JSON.stringify(data.services));
      }

      // Handle send_for_signature action
      let newSignatureToken = null;
      if (data.send_for_signature) {
        // Generate signature token if not exists
        if (!existing.signature_token) {
          newSignatureToken = crypto.randomBytes(32).toString('hex');
          updates.push(`signature_token = $${updateIndex++}`);
          updateParams.push(newSignatureToken);
        } else {
          newSignatureToken = existing.signature_token;
        }
        updates.push(`status = $${updateIndex++}`);
        updateParams.push('sent');
        updates.push(`sent_at = NOW()`);
        updates.push(`public_link_sent_at = NOW()`);
      } else if (data.status === 'sent') {
        updates.push(`sent_at = NOW()`);
      } else if (data.status === 'signed') {
        updates.push(`signed_at = NOW()`);
      }

      updates.push(`updated_at = NOW()`);

      const contract = await queryOne(
        `UPDATE contracts SET ${updates.join(', ')}
         WHERE id = $${updateIndex++} AND tenant_id = $${updateIndex}
         RETURNING *`,
        [...updateParams, contractId, tenantId]
      );

      // Send signature email if send_for_signature was requested
      if (data.send_for_signature && newSignatureToken) {
        // Get lead info for email
        const lead = await queryOne(
          `SELECT company_name, contact_name, email FROM leads WHERE id = $1`,
          [existing.lead_id]
        );

        // Get tenant/business info
        const tenant = await queryOne(
          `SELECT t.name as tenant_name, bi.company_name as provider_name
           FROM tenants t
           LEFT JOIN billing_info bi ON t.id = bi.tenant_id
           WHERE t.id = $1`,
          [tenantId]
        );

        if (lead?.email) {
          const providerName = tenant?.provider_name || tenant?.tenant_name || 'Votre prestataire';
          const signatureLink = `${process.env.FRONTEND_URL || 'https://app.leadsynch.com'}/sign/${newSignatureToken}`;

          const htmlBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #1f2937;">Bonjour ${lead.contact_name || 'Madame, Monsieur'},</h2>

              <p>Suite à notre échange, nous avons le plaisir de vous transmettre votre contrat pour signature.</p>

              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #4f46e5;">Contrat N° ${contract.reference}</h3>
                <p><strong>Client :</strong> ${lead.company_name || 'N/A'}</p>
                <p><strong>Offre :</strong> ${contract.offer_name}</p>
                <p><strong>Montant TTC :</strong> ${parseFloat(contract.total_amount || 0).toFixed(2)} €</p>
                ${contract.start_date ? `<p><strong>Date de début :</strong> ${new Date(contract.start_date).toLocaleDateString('fr-FR')}</p>` : ''}
              </div>

              <p>Pour signer ce contrat électroniquement, veuillez cliquer sur le bouton ci-dessous :</p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${signatureLink}"
                   style="display: inline-block; background: linear-gradient(135deg, #059669, #10b981); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                  ✍️ Signer le contrat
                </a>
              </div>

              <p style="color: #6b7280; font-size: 14px;">
                <strong>Processus de signature sécurisé :</strong><br>
                1. Consultez les détails du contrat<br>
                2. Acceptez les conditions générales<br>
                3. Un code de vérification vous sera envoyé par email<br>
                4. Entrez le code pour valider votre signature
              </p>

              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

              <p>Cordialement,<br><strong>${providerName}</strong></p>

              <p style="color: #9ca3af; font-size: 12px; margin-top: 30px;">
                Ce message a été envoyé automatiquement. Si vous n'êtes pas à l'origine de cette demande, veuillez ignorer cet email.
              </p>
            </div>
          `;

          try {
            await sendEmail({
              to: lead.email,
              subject: `Contrat à signer N° ${contract.reference} - ${providerName}`,
              htmlBody,
              fromName: providerName
            });
            log(`📧 [CONTRACT] Email de signature envoyé à ${lead.email} pour contrat ${contract.reference}`);
          } catch (emailError) {
            error(`❌ [CONTRACT] Erreur envoi email:`, emailError);
          }
        }

        return res.json({
          contract,
          message: 'Contrat envoyé pour signature',
          signature_link_sent: true
        });
      }

      return res.json({ contract, message: 'Contrat mis à jour' });
    }

    // DELETE /api/contracts/:id
    if (method === 'DELETE') {
      const contractId = req.params?.id || req.query?.id;
      if (!contractId) {
        return res.status(400).json({ error: 'ID du contrat requis' });
      }

      // Check if contract can be deleted (only draft contracts)
      const existing = await queryOne(
        `SELECT status FROM contracts WHERE id = $1 AND tenant_id = $2`,
        [contractId, tenantId]
      );

      if (!existing) {
        return res.status(404).json({ error: 'Contrat non trouvé' });
      }

      if (existing.status !== 'draft') {
        return res.status(400).json({
          error: 'Seuls les contrats en brouillon peuvent être supprimés'
        });
      }

      await execute(
        `DELETE FROM contracts WHERE id = $1 AND tenant_id = $2`,
        [contractId, tenantId]
      );

      return res.json({ message: 'Contrat supprimé' });
    }

    return res.status(405).json({ error: 'Méthode non autorisée' });

  } catch (error) {
    error('Error in contracts API:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Données invalides',
        details: error.errors
      });
    }

    return res.status(500).json({ error: error.message });
  }
}
