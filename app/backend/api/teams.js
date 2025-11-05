import { authMiddleware } from '../middleware/auth.js';
import { queryAll, queryOne, execute } from '../lib/db.js';

async function handler(req, res) {
  const tenant_id = req.user.tenant_id;

  try {
    // GET - Liste des équipes
    if (req.method === 'GET' && !req.url.includes('/members')) {
      const teams = await queryAll(
        `SELECT t.*, 
                u.first_name || ' ' || u.last_name as manager_name,
                COUNT(DISTINCT tm.user_id) as members_count
         FROM teams t
         LEFT JOIN users u ON t.manager_id = u.id
         LEFT JOIN team_members tm ON t.id = tm.team_id
         WHERE t.tenant_id = $1
         GROUP BY t.id, t.name, t.description, t.manager_id, t.created_at, t.updated_at, u.first_name, u.last_name
         ORDER BY t.created_at DESC`,
        [tenant_id]
      );

      return res.json({ success: true, teams: teams || [] });
    }

    // GET - Membres d'une équipe
    if (req.method === 'GET' && req.url.includes('/members')) {
      const teamId = req.url.split('/')[1];
      
      const members = await queryAll(
        `SELECT tm.*, u.first_name, u.last_name, u.email, u.role as user_role
         FROM team_members tm
         JOIN users u ON tm.user_id = u.id
         WHERE tm.team_id = $1`,
        [teamId]
      );

      return res.json({ success: true, members: members || [] });
    }

    // POST - Créer une équipe
    if (req.method === 'POST' && !req.url.includes('/members')) {
      const { name, description, manager_id } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Nom requis' });
      }

      const team = await queryOne(
        `INSERT INTO teams (tenant_id, name, description, manager_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         RETURNING *`,
        [tenant_id, name, description || null, manager_id || null]
      );

      return res.status(201).json({ success: true, team });
    }

    // POST - Ajouter un membre à une équipe
    if (req.method === 'POST' && req.url.includes('/members')) {
      const teamId = req.url.split('/')[1];
      const { user_id, role } = req.body;

      if (!user_id) {
        return res.status(400).json({ error: 'user_id requis' });
      }

      await execute(
        `INSERT INTO team_members (id, team_id, user_id, role, joined_at)
         VALUES (gen_random_uuid(), $1, $2, $3, NOW())
         ON CONFLICT (team_id, user_id) DO NOTHING`,
        [teamId, user_id, role || 'member']
      );

      return res.json({ success: true, message: 'Membre ajoute' });
    }

    // PUT - Modifier une équipe
    if (req.method === 'PUT') {
      const teamId = req.url.split('/')[1];
      const { name, description, manager_id } = req.body;

      await execute(
        `UPDATE teams 
         SET name = $1, description = $2, manager_id = $3, updated_at = NOW()
         WHERE id = $4 AND tenant_id = $5`,
        [name, description, manager_id, teamId, tenant_id]
      );

      return res.json({ success: true, message: 'Equipe modifiee' });
    }

    // DELETE - Supprimer une équipe
    if (req.method === 'DELETE' && !req.url.includes('/members')) {
      const teamId = req.url.split('/')[1];

      // Supprimer d'abord les membres
      await execute('DELETE FROM team_members WHERE team_id = $1', [teamId]);
      
      // Puis l'équipe
      await execute('DELETE FROM teams WHERE id = $1 AND tenant_id = $2', [teamId, tenant_id]);

      return res.json({ success: true, message: 'Equipe supprimee' });
    }

    // DELETE - Retirer un membre d'une équipe
    if (req.method === 'DELETE' && req.url.includes('/members')) {
      const parts = req.url.split('/');
      const teamId = parts[1];
      const userId = parts[3];

      await execute(
        'DELETE FROM team_members WHERE team_id = $1 AND user_id = $2',
        [teamId, userId]
      );

      return res.json({ success: true, message: 'Membre retire' });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Teams error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

export default authMiddleware(handler);
