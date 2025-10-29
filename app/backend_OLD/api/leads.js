import { authMiddleware } from '../middleware/auth.js';
import { queryAll, queryOne, execute } from '../lib/db.js';

// GET tous les leads
async function getLeads(req, res) {
  try {
    const leads = await queryAll(
      'SELECT * FROM leads WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 100',
      [req.user.tenant_id]
    );
    return res.status(200).json({
      success: true,
      leads: leads || []
    });
  } catch (error) {
    console.error('Leads error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}

// GET un lead par ID
async function getLead(req, res) {
  try {
    const { id } = req.params;
    const lead = await queryOne(
      'SELECT * FROM leads WHERE id = $1 AND tenant_id = $2',
      [id, req.user.tenant_id]
    );
    
    if (!lead) {
      return res.status(404).json({ error: 'Lead non trouvé' });
    }
    
    return res.status(200).json({ success: true, lead });
  } catch (error) {
    console.error('Lead error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}

// POST créer un lead
async function createLead(req, res) {
  try {
    const { company_name, email, phone, status, source } = req.body;
    
    const result = await execute(
      `INSERT INTO leads (company_name, email, phone, status, source, tenant_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [company_name, email, phone, status || 'nouveau', source, req.user.tenant_id, req.user.id]
    );
    
    return res.status(201).json({ success: true, lead: result });
  } catch (error) {
    console.error('Create lead error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}

// PUT mettre à jour un lead
async function updateLead(req, res) {
  try {
    const { id } = req.params;
    const { company_name, email, phone, status } = req.body;
    
    const result = await execute(
      `UPDATE leads 
       SET company_name = $1, email = $2, phone = $3, status = $4, updated_at = NOW()
       WHERE id = $5 AND tenant_id = $6 RETURNING *`,
      [company_name, email, phone, status, id, req.user.tenant_id]
    );
    
    return res.status(200).json({ success: true, lead: result });
  } catch (error) {
    console.error('Update lead error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}

// DELETE supprimer un lead
async function deleteLead(req, res) {
  try {
    const { id } = req.params;
    
    await execute(
      'DELETE FROM leads WHERE id = $1 AND tenant_id = $2',
      [id, req.user.tenant_id]
    );
    
    return res.status(200).json({ success: true, message: 'Lead supprimé' });
  } catch (error) {
    console.error('Delete lead error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}

// Router principal
export default function handler(req, res) {
  return authMiddleware(async (req, res) => {
    if (req.method === 'GET' && !req.params.id) {
      return getLeads(req, res);
    } else if (req.method === 'GET' && req.params.id) {
      return getLead(req, res);
    } else if (req.method === 'POST') {
      return createLead(req, res);
    } else if (req.method === 'PUT') {
      return updateLead(req, res);
    } else if (req.method === 'DELETE') {
      return deleteLead(req, res);
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  })(req, res);
}