import { authMiddleware } from '../middleware/auth.js';
import { queryAll, execute } from '../lib/db.js';

async function handler(req, res) {
  const tenant_id = req.user.tenant_id;

  try {
    if (req.method === 'GET') {
      const templates = await queryAll(
        'SELECT * FROM email_templates WHERE tenant_id = $1 ORDER BY created_at DESC',
        [tenant_id]
      );
      return res.status(200).json({ success: true, templates: templates || [] });
    }

    if (req.method === 'POST') {
      const { name, subject, html_body, variables } = req.body;
      if (!name || !subject || !html_body) {
        return res.status(400).json({ error: 'Nom, sujet et contenu requis' });
      }
      const template = await execute(
        `INSERT INTO email_templates (tenant_id, name, subject, html_body, variables, created_by)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [tenant_id, name, subject, html_body, JSON.stringify(variables || {}), req.user.id]
      );
      return res.status(201).json({ success: true, template });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Templates error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}

export default authMiddleware(handler);
