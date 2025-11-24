import { query, queryOne, queryAll, execute } from '../lib/db.js';
import { verifyAuth } from '../middleware/auth.js';
import { z } from 'zod';
import { generateProposalPDF, savePDF } from '../services/pdfGenerator.js';

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
          return res.status(404).json({ error: 'Devis non trouve' });
        }

        // Generate PDF if requested
        if (action === 'pdf') {
          // Get tenant info for PDF
          const tenant = await queryOne(
            `SELECT t.*, bc.company_name as name, bc.siret, bc.tva_number, bc.address, bc.postal_code, bc.city, bc.email as contact_email
             FROM tenants t
             LEFT JOIN billing_configs bc ON t.id = bc.tenant_id
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
          const filename = `devis-${proposal.reference || proposal.id.substring(0, 8)}.pdf`;
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

      return res.status(201).json({ proposal, message: 'Devis créé avec succès' });
    }

    // PUT /api/proposals/:id - Update proposal
    if (method === 'PUT') {
      const proposalId = req.params?.id || req.query?.id;
      if (!proposalId) {
        return res.status(400).json({ error: 'ID du devis requis' });
      }

      const data = updateProposalSchema.parse(req.body);

      // Check ownership
      const existing = await queryOne(
        `SELECT * FROM proposals WHERE id = $1 AND tenant_id = $2`,
        [proposalId, tenantId]
      );

      if (!existing) {
        return res.status(404).json({ error: 'Devis non trouvé' });
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

      if (data.status) {
        updates.push(`status = $${updateIndex++}`);
        updateParams.push(data.status);

        // Track status changes
        if (data.status === 'sent') {
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

      return res.json({ proposal, message: 'Devis mis à jour' });
    }

    // DELETE /api/proposals/:id
    if (method === 'DELETE') {
      const proposalId = req.params?.id || req.query?.id;
      if (!proposalId) {
        return res.status(400).json({ error: 'ID du devis requis' });
      }

      const result = await execute(
        `DELETE FROM proposals WHERE id = $1 AND tenant_id = $2`,
        [proposalId, tenantId]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Devis non trouvé' });
      }

      return res.json({ message: 'Devis supprimé' });
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
