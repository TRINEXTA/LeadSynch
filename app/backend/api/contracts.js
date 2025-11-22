import { query, queryOne, queryAll, execute } from '../lib/db.js';
import { verifyAuth } from '../middleware/auth.js';
import { z } from 'zod';

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
  status: z.enum(['draft', 'sent', 'signed', 'cancelled', 'expired']).optional()
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
    if (method === 'GET') {
      const contractId = req.params?.id || req.query?.id;

      if (contractId) {
        // Get single contract
        const contract = await queryOne(
          `SELECT c.*, l.company_name, l.email as lead_email, l.phone as lead_phone,
                  l.address as lead_address, l.city as lead_city,
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

      // Generate reference
      const refResult = await queryOne(
        `SELECT generate_contract_reference($1) as reference`,
        [tenantId]
      );
      const reference = refResult?.reference || `CTR-${new Date().getFullYear()}-0001`;

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
          payment_frequency, user_count, monthly_price, amount, total_amount,
          start_date, end_date, notes, status, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
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
          data.monthly_price, // amount = monthly_price for compatibility
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
          `SELECT email, company_name FROM leads WHERE id = $1`,
          [data.lead_id]
        );

        if (lead?.email) {
          // Update contract with sent_at
          await execute(
            `UPDATE contracts SET sent_at = NOW() WHERE id = $1`,
            [contract.id]
          );

          // TODO: Send signature email via signature service
          // For now, just mark as sent
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

      if (data.status === 'sent') {
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
    console.error('Error in contracts API:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Données invalides',
        details: error.errors
      });
    }

    return res.status(500).json({ error: error.message });
  }
}
