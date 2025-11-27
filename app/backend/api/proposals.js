import { query, queryOne, queryAll, execute } from '../lib/db.js';
import { verifyAuth } from '../middleware/auth.js';
import { z } from 'zod';
import crypto from 'crypto';
import { generateProposalPDF, savePDF } from '../services/pdfGenerator.js';
import { sendEmail } from '../services/elasticEmail.js';

// Generate unique acceptance token
function generateAcceptanceToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Validation schemas
const createProposalSchema = z.object({
  lead_id: z.string().uuid().optional(),
  pipeline_lead_id: z.string().uuid().optional(),
  services: z.array(z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    quantity: z.number().default(1),
    unit_price: z.number(),
    url: z.string().optional()
  })).min(1, 'Au moins un service requis'),
  notes: z.string().optional(),
  valid_until: z.string().optional(),
  total_ht: z.number().min(0)
});

const updateProposalSchema = z.object({
  services: z.array(z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    quantity: z.number().default(1),
    unit_price: z.number(),
    url: z.string().optional()
  })).optional(),
  notes: z.string().optional(),
  valid_until: z.string().optional(),
  total_ht: z.number().min(0).optional(),
  status: z.enum(['draft', 'sent', 'accepted', 'rejected', 'expired']).optional()
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
    // GET /api/proposals - List proposals
    // GET /api/proposals/:id - Get single proposal
    // GET /api/proposals/:id?action=pdf - Download PDF
    if (method === 'GET') {
      const proposalId = req.params?.id || req.query?.id;
      const action = req.query?.action;

      if (proposalId) {
        // Get single proposal with full lead and tenant info
        const proposal = await queryOne(
          `SELECT p.*, l.company_name, l.email as lead_email, l.phone as lead_phone,
                  l.contact_name, l.address as lead_address, l.city as lead_city, l.postal_code as lead_postal_code,
                  u.first_name as created_by_name
           FROM proposals p
           LEFT JOIN leads l ON p.lead_id = l.id
           LEFT JOIN users u ON p.created_by = u.id
           WHERE p.id = $1 AND p.tenant_id = $2`,
          [proposalId, tenantId]
        );

        if (!proposal) {
          return res.status(404).json({ error: 'Proposition non trouvée' });
        }

        // Generate PDF if requested
        if (action === 'pdf') {
          // Get tenant info for PDF
          const tenant = await queryOne(
            `SELECT t.*, bi.company_name as name, bi.siret, bi.tva_number, bi.address_line1 as address, bi.postal_code, bi.city
             FROM tenants t
             LEFT JOIN billing_info bi ON t.id = bi.tenant_id
             WHERE t.id = $1`,
            [tenantId]
          );

          // Parse services if string
          const services = typeof proposal.services === 'string'
            ? JSON.parse(proposal.services)
            : proposal.services;

          // Build lead object for PDF
          const lead = {
            company_name: proposal.company_name,
            contact_name: proposal.contact_name,
            email: proposal.lead_email,
            phone: proposal.lead_phone,
            address: proposal.lead_address,
            city: proposal.lead_city,
            postal_code: proposal.lead_postal_code
          };

          // Generate PDF
          const pdfBuffer = await generateProposalPDF(
            { ...proposal, services },
            lead,
            tenant
          );

          // Save PDF and return URL
          const filename = `proposition-${proposal.reference || proposal.id.substring(0, 8)}.pdf`;
          const pdfUrl = await savePDF(pdfBuffer, filename);

          // Also return base64 for direct download
          const pdfBase64 = pdfBuffer.toString('base64');

          return res.json({
            success: true,
            pdf_url: pdfUrl,
            pdf_base64: pdfBase64,
            filename: filename
          });
        }

        return res.json({ proposal });
      }

      // List proposals with filters
      const { status, lead_id, search, page = 1, limit = 50 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      let whereClause = 'WHERE p.tenant_id = $1';
      const params = [tenantId];
      let paramIndex = 2;

      if (status) {
        whereClause += ` AND p.status = $${paramIndex++}`;
        params.push(status);
      }

      if (lead_id) {
        whereClause += ` AND p.lead_id = $${paramIndex++}`;
        params.push(lead_id);
      }

      if (search) {
        whereClause += ` AND (p.reference ILIKE $${paramIndex} OR l.company_name ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      const proposals = await queryAll(
        `SELECT p.*, l.company_name, l.email as lead_email
         FROM proposals p
         LEFT JOIN leads l ON p.lead_id = l.id
         ${whereClause}
         ORDER BY p.created_at DESC
         LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
        [...params, parseInt(limit), offset]
      );

      // Get total count
      const countResult = await queryOne(
        `SELECT COUNT(*) as total FROM proposals p
         LEFT JOIN leads l ON p.lead_id = l.id
         ${whereClause}`,
        params
      );

      return res.json({
        proposals,
        total: parseInt(countResult.total),
        page: parseInt(page),
        limit: parseInt(limit)
      });
    }

    // POST /api/proposals - Create proposal
    if (method === 'POST') {
      const data = createProposalSchema.parse(req.body);

      // Generate reference manually (simple format)
      const year = new Date().getFullYear();
      const countResult = await queryOne(
        `SELECT COUNT(*) as count FROM proposals WHERE tenant_id = $1 AND reference LIKE $2`,
        [tenantId, `DEV-${year}-%`]
      );
      const seq = (parseInt(countResult?.count) || 0) + 1;
      const reference = `DEV-${year}-${String(seq).padStart(4, '0')}`;

      // Calculate totals
      const total_ht = data.total_ht || data.services.reduce((sum, s) => sum + (s.quantity * s.unit_price), 0);
      const tax_rate = data.tax_rate || 20.00;
      const total_tva = total_ht * tax_rate / 100;
      const total_ttc = total_ht + total_tva;

      const proposal = await queryOne(
        `INSERT INTO proposals (
          tenant_id, lead_id, pipeline_lead_id, reference, services,
          total_ht, tax_rate, total_tva, total_ttc, notes, valid_until, created_by, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'draft')
        RETURNING *`,
        [
          tenantId,
          data.lead_id || null,
          data.pipeline_lead_id || null,
          reference,
          JSON.stringify(data.services),
          total_ht,
          tax_rate,
          total_tva,
          total_ttc,
          data.notes || null,
          data.valid_until || null,
          userId
        ]
      );

      return res.status(201).json({ proposal, message: 'Proposition créée avec succès' });
    }

    // PUT /api/proposals/:id - Update proposal
    if (method === 'PUT') {
      const proposalId = req.params?.id || req.query?.id;
      if (!proposalId) {
        return res.status(400).json({ error: 'ID de la proposition requis' });
      }

      const data = updateProposalSchema.parse(req.body);

      // Check ownership
      const existing = await queryOne(
        `SELECT * FROM proposals WHERE id = $1 AND tenant_id = $2`,
        [proposalId, tenantId]
      );

      if (!existing) {
        return res.status(404).json({ error: 'Proposition non trouvée' });
      }

      // Build update query
      const updates = [];
      const updateParams = [];
      let updateIndex = 1;

      if (data.services) {
        updates.push(`services = $${updateIndex++}`);
        updateParams.push(JSON.stringify(data.services));

        // Recalculate totals
        const total_ht = data.services.reduce((sum, s) => sum + (s.quantity * s.unit_price), 0);
        updates.push(`total_ht = $${updateIndex++}`);
        updateParams.push(total_ht);
        updates.push(`total_ttc = $${updateIndex++}`);
        updateParams.push(total_ht * 1.2);
      }

      if (data.notes !== undefined) {
        updates.push(`notes = $${updateIndex++}`);
        updateParams.push(data.notes);
      }

      if (data.valid_until) {
        updates.push(`valid_until = $${updateIndex++}`);
        updateParams.push(data.valid_until);
      }

      // Handle send_with_link action - send proposal with acceptance link
      let newAcceptanceToken = null;
      if (data.send_with_link) {
        // Generate acceptance token if not exists
        if (!existing.acceptance_token) {
          newAcceptanceToken = generateAcceptanceToken();
          updates.push(`acceptance_token = $${updateIndex++}`);
          updateParams.push(newAcceptanceToken);
        } else {
          newAcceptanceToken = existing.acceptance_token;
        }
        updates.push(`status = $${updateIndex++}`);
        updateParams.push('sent');
        updates.push(`sent_at = NOW()`);
        updates.push(`public_link_sent_at = NOW()`);
      } else if (data.status) {
        updates.push(`status = $${updateIndex++}`);
        updateParams.push(data.status);

        // Track status changes
        if (data.status === 'sent') {
          // Generate acceptance token when sending
          if (!existing.acceptance_token) {
            const token = generateAcceptanceToken();
            updates.push(`acceptance_token = $${updateIndex++}`);
            updateParams.push(token);
          }
          updates.push(`sent_at = NOW()`);
        } else if (data.status === 'accepted') {
          updates.push(`accepted_at = NOW()`);
        } else if (data.status === 'rejected') {
          updates.push(`rejected_at = NOW()`);
        }
      }

      if (data.total_ht !== undefined) {
        updates.push(`total_ht = $${updateIndex++}`);
        updateParams.push(data.total_ht);
        updates.push(`total_ttc = $${updateIndex++}`);
        updateParams.push(data.total_ht * 1.2);
      }

      updates.push(`updated_at = NOW()`);

      const proposal = await queryOne(
        `UPDATE proposals SET ${updates.join(', ')}
         WHERE id = $${updateIndex++} AND tenant_id = $${updateIndex}
         RETURNING *`,
        [...updateParams, proposalId, tenantId]
      );

      // Send email with acceptance link if send_with_link was requested
      if (data.send_with_link && newAcceptanceToken) {
        // Get lead info for email
        const lead = await queryOne(
          `SELECT company_name, contact_name, email FROM leads WHERE id = $1`,
          [existing.lead_id]
        );

        // Get tenant/business info for email
        const tenant = await queryOne(
          `SELECT t.name as tenant_name, bi.company_name as provider_name
           FROM tenants t
           LEFT JOIN billing_info bi ON t.id = bi.tenant_id
           WHERE t.id = $1`,
          [tenantId]
        );

        if (lead?.email) {
          const acceptanceLink = `${process.env.FRONTEND_URL || 'https://app.leadsynch.com'}/accept/${newAcceptanceToken}`;
          const providerName = tenant?.provider_name || tenant?.tenant_name || 'Votre prestataire';

          const htmlBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #1f2937;">Bonjour ${lead.contact_name || 'Madame, Monsieur'},</h2>

              <p>Nous avons le plaisir de vous transmettre notre proposition commerciale.</p>

              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #4f46e5;">Proposition N° ${proposal.reference}</h3>
                <p><strong>Client :</strong> ${lead.company_name || 'N/A'}</p>
                <p><strong>Montant HT :</strong> ${parseFloat(proposal.total_ht || 0).toFixed(2)} €</p>
                <p><strong>Montant TTC :</strong> ${(parseFloat(proposal.total_ht || 0) * 1.2).toFixed(2)} €</p>
                ${proposal.valid_until ? `<p><strong>Valide jusqu'au :</strong> ${new Date(proposal.valid_until).toLocaleDateString('fr-FR')}</p>` : ''}
              </div>

              <p>Pour accepter cette proposition, veuillez cliquer sur le bouton ci-dessous :</p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${acceptanceLink}"
                   style="display: inline-block; background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                  ✅ Consulter et accepter la proposition
                </a>
              </div>

              <p style="color: #6b7280; font-size: 14px;">
                Ce lien est sécurisé et vous permet de consulter les détails de la proposition et de donner votre accord ("Bon pour accord").
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
              subject: `Proposition commerciale N° ${proposal.reference} - ${providerName}`,
              htmlBody,
              fromName: providerName
            });
            console.log(`📧 [PROPOSAL] Email avec lien d'acceptation envoyé à ${lead.email} pour proposition ${proposal.reference}`);
          } catch (emailError) {
            console.error(`❌ [PROPOSAL] Erreur envoi email:`, emailError);
            // Don't fail the request, just log the error
          }
        }

        return res.json({
          proposal,
          message: 'Proposition envoyée avec lien d\'acceptation',
          acceptance_link_sent: true
        });
      }

      return res.json({ proposal, message: 'Proposition mise à jour' });
    }

    // DELETE /api/proposals/:id
    if (method === 'DELETE') {
      const proposalId = req.params?.id || req.query?.id;
      if (!proposalId) {
        return res.status(400).json({ error: 'ID de la proposition requis' });
      }

      const result = await execute(
        `DELETE FROM proposals WHERE id = $1 AND tenant_id = $2`,
        [proposalId, tenantId]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Proposition non trouvée' });
      }

      return res.json({ message: 'Proposition supprimée' });
    }

    return res.status(405).json({ error: 'Méthode non autorisée' });

  } catch (error) {
    console.error('Error in proposals API:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Données invalides',
        details: error.errors
      });
    }

    return res.status(500).json({ error: error.message });
  }
}
