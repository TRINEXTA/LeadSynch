import { authMiddleware } from '../middleware/auth.js';
import { queryAll, queryOne } from '../lib/db.js';
import { z } from 'zod';

// Validation schema
const createTeamSchema = z.object({
  name: z.string().min(1, 'Nom requis'),
  description: z.string().optional(),
  manager_id: z.string().uuid().optional()
});

async function handler(req, res) {
  const { method } = req;

  try {
    // GET - List teams
    if (method === 'GET') {
      const teams = await queryAll(
        `SELECT t.id, t.name, t.description, t.created_at,
                u.first_name || ' ' || u.last_name as manager_name,
                COUNT(tm.user_id) as member_count
         FROM teams t
         LEFT JOIN users u ON t.manager_id = u.id
         LEFT JOIN team_members tm ON t.id = tm.team_id
         WHERE t.tenant_id = $1
         GROUP BY t.id, u.first_name, u.last_name
         ORDER BY t.created_at DESC`,
        [req.user.tenant_id]
      );

      return res.status(200).json({
        success: true,
        teams
      });
    }

    // POST - Create team
    if (method === 'POST') {
      // Only admin/manager can create teams
      if (!['admin', 'manager'].includes(req.user.role)) {
        return res.status(403).json({ 
          error: 'Permissions insuffisantes' 
        });
      }

      const data = createTeamSchema.parse(req.body);

      // Create team
      const newTeam = await queryOne(
        `INSERT INTO teams (tenant_id, name, description, manager_id)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name, description, manager_id, created_at`,
        [
          req.user.tenant_id,
          data.name,
          data.description || null,
          data.manager_id || null
        ]
      );

      return res.status(201).json({
        success: true,
        team: newTeam
      });
    }

    return res.status(405).json({ error: 'Méthode non autorisée' });

  } catch (error) {
    console.error('Teams API error:', error);

    if (error.name === 'ZodError') {
      return res.status(400).json({ 
        error: 'Données invalides',
        details: error.errors 
      });
    }

    return res.status(500).json({ 
      error: 'Erreur serveur' 
    });
  }
}

export default authMiddleware(handler);
