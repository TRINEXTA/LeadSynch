import { authMiddleware } from '../../middleware/auth.js';
import { queryAll, queryOne, execute } from '../../lib/db.js';

async function handler(req, res) {
  const tenant_id = req.user.tenant_id;

  try {
    // GET - Liste des templates
    if (req.method === 'GET') {
      const templates = await queryAll(
        `SELECT * FROM email_templates 
         WHERE tenant_id = $1 
         ORDER BY created_at DESC`,
        [tenant_id]
      );

      return res.status(200).json({
        success: true,
        templates: templates || []
      });
    }

    // POST - Créer un template
    if (req.method === 'POST') {
      const { name, subject, html_body, variables } = req.body;

      if (!name || !subject || !html_body) {
        return res.status(400).json({ error: 'Nom, sujet et contenu requis' });
      }

      const template = await execute(
        `INSERT INTO email_templates 
         (tenant_id, name, subject, html_body, variables, created_by)
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING *`,
        [tenant_id, name, subject, html_body, JSON.stringify(variables || {}), req.user.id]
      );

      return res.status(201).json({
        success: true,
        template
      });
    }

    // PUT - Mettre à jour un template
    if (req.method === 'PUT') {
      const { id, name, subject, html_body, variables } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'ID requis' });
      }

      const template = await execute(
        `UPDATE email_templates 
         SET name = COALESCE($1, name),
             subject = COALESCE($2, subject),
             html_body = COALESCE($3, html_body),
             variables = COALESCE($4, variables)
         WHERE id = $5 AND tenant_id = $6
         RETURNING *`,
        [name, subject, html_body, JSON.stringify(variables), id, tenant_id]
      );

      if (!template) {
        return res.status(404).json({ error: 'Template non trouvé' });
      }

      return res.status(200).json({
        success: true,
        template
      });
    }

    // DELETE - Supprimer un template
    if (req.method === 'DELETE') {
      const { id } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'ID requis' });
      }

      await execute(
        'DELETE FROM email_templates WHERE id = $1 AND tenant_id = $2',
        [id, tenant_id]
      );

      return res.status(200).json({
        success: true,
        message: 'Template supprimé'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Templates error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}

export default authMiddleware(handler);