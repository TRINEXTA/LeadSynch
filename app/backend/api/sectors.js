import { authMiddleware } from '../middleware/auth.js';
import { queryAll, execute } from '../lib/db.js';

async function handler(req, res) {
  const tenant_id = req.user.tenant_id;

  try {
    // GET - Liste des secteurs avec count
    if (req.method === 'GET') {
      const sectors = await queryAll(
        `SELECT 
          industry as sector,
          COUNT(*) as leads_count
         FROM leads
         WHERE tenant_id = $1
         AND industry IS NOT NULL
         AND industry != ''
         GROUP BY industry
         ORDER BY leads_count DESC`,
        [tenant_id]
      );

      return res.status(200).json({ 
        success: true, 
        sectors: sectors || [] 
      });
    }

    // PUT - Renommer un secteur
    if (req.method === 'PUT') {
      const { old_name, new_name } = req.body;

      if (!old_name || !new_name) {
        return res.status(400).json({ 
          error: 'Ancien et nouveau nom requis' 
        });
      }

      await execute(
        `UPDATE leads 
         SET industry = $1, updated_at = NOW()
         WHERE tenant_id = $2 AND industry = $3`,
        [new_name, tenant_id, old_name]
      );

      return res.status(200).json({ 
        success: true,
        message: 'Secteur renomme'
      });
    }

    // DELETE - Supprimer un secteur
    if (req.method === 'DELETE') {
      const urlParams = new URL(req.url, `http://${req.headers.host}`).searchParams;
      const sector = urlParams.get('sector');

      if (!sector) {
        return res.status(400).json({ error: 'Secteur requis' });
      }

      await execute(
        `UPDATE leads 
         SET industry = NULL, updated_at = NOW()
         WHERE tenant_id = $1 AND industry = $2`,
        [tenant_id, sector]
      );

      return res.status(200).json({ 
        success: true,
        message: 'Secteur supprime'
      });
    }

    // POST - Fusionner des secteurs
    if (req.method === 'POST') {
      const { sectors_to_merge, target_sector } = req.body;

      if (!sectors_to_merge || !target_sector || sectors_to_merge.length === 0) {
        return res.status(400).json({ 
          error: 'Secteurs et cible requis' 
        });
      }

      for (const sector of sectors_to_merge) {
        await execute(
          `UPDATE leads 
           SET industry = $1, updated_at = NOW()
           WHERE tenant_id = $2 AND industry = $3`,
          [target_sector, tenant_id, sector]
        );
      }

      return res.status(200).json({ 
        success: true,
        message: `${sectors_to_merge.length} secteur(s) fusionne(s)`
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Sectors error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

export default authMiddleware(handler);
