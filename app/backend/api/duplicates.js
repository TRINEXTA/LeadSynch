import express from 'express';
import { query as q } from '../lib/db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Toutes les routes nécessitent l'authentification
router.use(authMiddleware);

/**
 * POST /api/duplicates/detect
 * Détecte les doublons potentiels dans les leads (via POST pour filtres avancés)
 */
router.post('/detect', async (req, res) => {
  try {
    const { tenant_id: tenantId } = req.user;
    const { method = 'all' } = req.body; // email, phone, company_name, ou all

    let duplicateGroups = [];

    // Détecter par email
    if (method === 'email' || method === 'all') {
      const { rows: emailDups } = await q(
        `SELECT
          email as key,
          'email' as method,
          array_agg(id ORDER BY created_at ASC) as lead_ids,
          COUNT(*)::int as count
         FROM leads
         WHERE tenant_id = $1 AND email IS NOT NULL AND email != ''
         GROUP BY email
         HAVING COUNT(*) > 1
         ORDER BY COUNT(*) DESC`,
        [tenantId]
      );

      for (const dup of emailDups) {
        const { rows: leads } = await q(
          `SELECT * FROM leads WHERE id = ANY($1) ORDER BY created_at ASC`,
          [dup.lead_ids]
        );
        duplicateGroups.push({
          method: 'email',
          key: dup.key,
          count: dup.count,
          leads
        });
      }
    }

    // Détecter par téléphone
    if (method === 'phone' || method === 'all') {
      const { rows: phoneDups } = await q(
        `SELECT
          phone as key,
          'phone' as method,
          array_agg(id ORDER BY created_at ASC) as lead_ids,
          COUNT(*)::int as count
         FROM leads
         WHERE tenant_id = $1 AND phone IS NOT NULL AND phone != ''
         GROUP BY phone
         HAVING COUNT(*) > 1
         ORDER BY COUNT(*) DESC`,
        [tenantId]
      );

      for (const dup of phoneDups) {
        const { rows: leads } = await q(
          `SELECT * FROM leads WHERE id = ANY($1) ORDER BY created_at ASC`,
          [dup.lead_ids]
        );
        duplicateGroups.push({
          method: 'phone',
          key: dup.key,
          count: dup.count,
          leads
        });
      }
    }

    // Détecter par nom d'entreprise
    if (method === 'company_name' || method === 'all') {
      const { rows: nameDups } = await q(
        `SELECT
          LOWER(TRIM(company_name)) as key,
          'company_name' as method,
          array_agg(id ORDER BY created_at ASC) as lead_ids,
          COUNT(*)::int as count
         FROM leads
         WHERE tenant_id = $1
           AND company_name IS NOT NULL
           AND company_name != ''
         GROUP BY LOWER(TRIM(company_name))
         HAVING COUNT(*) > 1
         ORDER BY COUNT(*) DESC`,
        [tenantId]
      );

      for (const dup of nameDups) {
        const { rows: leads } = await q(
          `SELECT * FROM leads WHERE id = ANY($1) ORDER BY created_at ASC`,
          [dup.lead_ids]
        );
        duplicateGroups.push({
          method: 'company_name',
          key: dup.key,
          count: dup.count,
          leads
        });
      }
    }

    res.json({
      success: true,
      total: duplicateGroups.length,
      duplicates: duplicateGroups
    });
  } catch (error) {
    console.error('Erreur détection doublons POST:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
});

/**
 * GET /api/duplicates/detect
 * Détecte les doublons potentiels dans les leads
 */
router.get('/detect', async (req, res) => {
  try {
    const { tenant_id: tenantId } = req.user;
    const { threshold = 0.8 } = req.query; // Seuil de similarité

    // Recherche de doublons par email (exact match)
    const { rows: emailDuplicates } = await q(
      `SELECT email, COUNT(*) as count, array_agg(id) as lead_ids
       FROM leads
       WHERE tenant_id = $1 AND email IS NOT NULL AND email != ''
       GROUP BY email
       HAVING COUNT(*) > 1
       ORDER BY COUNT(*) DESC`,
      [tenantId]
    );

    // Recherche de doublons par SIRET (exact match)
    const { rows: siretDuplicates } = await q(
      `SELECT siret, COUNT(*) as count, array_agg(id) as lead_ids
       FROM leads
       WHERE tenant_id = $1 AND siret IS NOT NULL AND siret != ''
       GROUP BY siret
       HAVING COUNT(*) > 1
       ORDER BY COUNT(*) DESC`,
      [tenantId]
    );

    // Recherche de doublons par nom + ville (similarité)
    const { rows: nameCityDuplicates } = await q(
      `SELECT
         LOWER(TRIM(company_name)) as normalized_name,
         LOWER(TRIM(city)) as normalized_city,
         COUNT(*) as count,
         array_agg(id) as lead_ids
       FROM leads
       WHERE tenant_id = $1
         AND company_name IS NOT NULL
         AND city IS NOT NULL
       GROUP BY LOWER(TRIM(company_name)), LOWER(TRIM(city))
       HAVING COUNT(*) > 1
       ORDER BY COUNT(*) DESC`,
      [tenantId]
    );

    const duplicates = {
      by_email: emailDuplicates.map(d => ({
        type: 'email',
        value: d.email,
        count: parseInt(d.count),
        lead_ids: d.lead_ids,
        severity: 'high' // Email identique = doublon sûr
      })),
      by_siret: siretDuplicates.map(d => ({
        type: 'siret',
        value: d.siret,
        count: parseInt(d.count),
        lead_ids: d.lead_ids,
        severity: 'high' // SIRET identique = doublon sûr
      })),
      by_name_city: nameCityDuplicates.map(d => ({
        type: 'name_city',
        value: `${d.normalized_name} - ${d.normalized_city}`,
        count: parseInt(d.count),
        lead_ids: d.lead_ids,
        severity: 'medium' // Nom + ville = doublon probable
      }))
    };

    const totalDuplicates =
      duplicates.by_email.length +
      duplicates.by_siret.length +
      duplicates.by_name_city.length;

    res.json({
      total: totalDuplicates,
      duplicates,
      summary: {
        by_email: duplicates.by_email.length,
        by_siret: duplicates.by_siret.length,
        by_name_city: duplicates.by_name_city.length
      }
    });
  } catch (error) {
    console.error('Erreur détection doublons:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
});

/**
 * GET /api/duplicates/group/:type/:value
 * Récupère les détails des leads en doublon pour un groupe spécifique
 */
router.get('/group/:type/:value', async (req, res) => {
  try {
    const { tenant_id: tenantId } = req.user;
    const { type, value } = req.params;

    let query;
    let params;

    switch (type) {
      case 'email':
        query = `SELECT * FROM leads WHERE tenant_id = $1 AND email = $2 ORDER BY created_at DESC`;
        params = [tenantId, value];
        break;

      case 'siret':
        query = `SELECT * FROM leads WHERE tenant_id = $1 AND siret = $2 ORDER BY created_at DESC`;
        params = [tenantId, value];
        break;

      case 'name_city':
        const [name, city] = value.split(' - ');
        query = `SELECT * FROM leads
                 WHERE tenant_id = $1
                 AND LOWER(TRIM(company_name)) = $2
                 AND LOWER(TRIM(city)) = $3
                 ORDER BY created_at DESC`;
        params = [tenantId, name, city];
        break;

      default:
        return res.status(400).json({ error: 'Type de doublon invalide' });
    }

    const { rows } = await q(query, params);

    res.json({
      type,
      value,
      count: rows.length,
      leads: rows
    });
  } catch (error) {
    console.error('Erreur récupération groupe doublons:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
});

/**
 * POST /api/duplicates/merge
 * Fusionne plusieurs leads en un seul
 */
router.post('/merge', async (req, res) => {
  try {
    const { tenant_id: tenantId, id: userId } = req.user;
    const { primary_lead_id, duplicate_lead_ids } = req.body;

    if (!primary_lead_id || !duplicate_lead_ids || !Array.isArray(duplicate_lead_ids)) {
      return res.status(400).json({
        error: 'Paramètres invalides',
        message: 'primary_lead_id et duplicate_lead_ids (array) requis'
      });
    }

    // Vérifier que tous les leads appartiennent au tenant
    const allLeadIds = [primary_lead_id, ...duplicate_lead_ids];
    const { rows: leadCheck } = await q(
      `SELECT id FROM leads WHERE id = ANY($1) AND tenant_id = $2`,
      [allLeadIds, tenantId]
    );

    if (leadCheck.length !== allLeadIds.length) {
      return res.status(403).json({
        error: 'Accès refusé',
        message: 'Un ou plusieurs leads n\'appartiennent pas à ce tenant'
      });
    }

    // Transférer les contacts, téléphones, notes des doublons vers le lead principal
    for (const duplicateId of duplicate_lead_ids) {
      // Transférer les contacts
      await q(
        `UPDATE lead_contacts SET lead_id = $1 WHERE lead_id = $2`,
        [primary_lead_id, duplicateId]
      );

      // Transférer les téléphones
      await q(
        `UPDATE lead_phones SET lead_id = $1 WHERE lead_id = $2`,
        [primary_lead_id, duplicateId]
      );

      // Transférer les bureaux
      await q(
        `UPDATE lead_offices SET lead_id = $1 WHERE lead_id = $2`,
        [primary_lead_id, duplicateId]
      );

      // Transférer les notes
      await q(
        `UPDATE lead_notes SET lead_id = $1 WHERE lead_id = $2`,
        [primary_lead_id, duplicateId]
      );

      // Transférer les relations de base de données
      await q(
        `UPDATE lead_database_relations
         SET lead_id = $1
         WHERE lead_id = $2
         ON CONFLICT (lead_id, database_id) DO NOTHING`,
        [primary_lead_id, duplicateId]
      );
    }

    // Supprimer les leads dupliqués
    await q(
      `DELETE FROM leads WHERE id = ANY($1)`,
      [duplicate_lead_ids]
    );

    // Enregistrer l'action dans les notes du lead principal
    await q(
      `INSERT INTO lead_notes (lead_id, user_id, content, type)
       VALUES ($1, $2, $3, 'system')`,
      [
        primary_lead_id,
        userId,
        `🔄 Fusion de ${duplicate_lead_ids.length} doublon(s): ${duplicate_lead_ids.join(', ')}`
      ]
    );

    res.json({
      message: `${duplicate_lead_ids.length} lead(s) fusionné(s) avec succès`,
      primary_lead_id,
      merged_count: duplicate_lead_ids.length
    });
  } catch (error) {
    console.error('Erreur fusion doublons:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
});

/**
 * POST /api/duplicates/merge-auto
 * Fusionne automatiquement plusieurs leads avec stratégie de conservation
 */
router.post('/merge-auto', async (req, res) => {
  try {
    const { tenant_id: tenantId, id: userId } = req.user;
    const { primary_lead_id, duplicate_ids, merge_strategy = 'keep_oldest' } = req.body;

    if (!primary_lead_id || !duplicate_ids || !Array.isArray(duplicate_ids)) {
      return res.status(400).json({
        error: 'Paramètres invalides',
        message: 'primary_lead_id et duplicate_ids (array) requis'
      });
    }

    // Vérifier que tous les leads appartiennent au tenant
    const allLeadIds = [primary_lead_id, ...duplicate_ids];
    const { rows: leadCheck } = await q(
      `SELECT id FROM leads WHERE id = ANY($1) AND tenant_id = $2`,
      [allLeadIds, tenantId]
    );

    if (leadCheck.length !== allLeadIds.length) {
      return res.status(403).json({
        error: 'Accès refusé',
        message: 'Un ou plusieurs leads n\'appartiennent pas à ce tenant'
      });
    }

    // Transférer automatiquement toutes les données des doublons
    for (const duplicateId of duplicate_ids) {
      // Transférer les contacts
      await q(
        `UPDATE lead_contacts SET lead_id = $1 WHERE lead_id = $2`,
        [primary_lead_id, duplicateId]
      ).catch(() => {}); // Ignorer si la table n'existe pas

      // Transférer les téléphones
      await q(
        `UPDATE lead_phones SET lead_id = $1 WHERE lead_id = $2`,
        [primary_lead_id, duplicateId]
      ).catch(() => {});

      // Transférer les notes
      await q(
        `UPDATE lead_notes SET lead_id = $1 WHERE lead_id = $2`,
        [primary_lead_id, duplicateId]
      ).catch(() => {});

      // Transférer les activités
      await q(
        `UPDATE activities SET lead_id = $1 WHERE lead_id = $2`,
        [primary_lead_id, duplicateId]
      ).catch(() => {});
    }

    // Supprimer les leads dupliqués
    await q(
      `DELETE FROM leads WHERE id = ANY($1)`,
      [duplicate_ids]
    );

    // Enregistrer l'action
    await q(
      `INSERT INTO lead_notes (lead_id, user_id, content, type)
       VALUES ($1, $2, $3, 'system')`,
      [
        primary_lead_id,
        userId,
        `🔄 Fusion automatique de ${duplicate_ids.length} doublon(s) (stratégie: ${merge_strategy})`
      ]
    ).catch(() => {}); // Ignorer si lead_notes n'existe pas

    res.json({
      success: true,
      message: `${duplicate_ids.length} lead(s) fusionné(s) automatiquement`,
      primary_lead_id,
      merged_count: duplicate_ids.length
    });
  } catch (error) {
    console.error('Erreur fusion automatique:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
});

/**
 * POST /api/duplicates/ignore
 * Marque un groupe de leads comme "non-doublon" pour éviter qu'ils réapparaissent
 */
router.post('/ignore', async (req, res) => {
  try {
    const { tenant_id: tenantId } = req.user;
    const { lead_ids, reason } = req.body;

    if (!lead_ids || !Array.isArray(lead_ids) || lead_ids.length < 2) {
      return res.status(400).json({
        error: 'Paramètres invalides',
        message: 'Au moins 2 lead_ids requis'
      });
    }

    // TODO: Créer une table d'exclusion des doublons
    // Pour l'instant, ajouter simplement une note
    const note = `🚫 Marqué comme non-doublon: ${reason || 'Pas de raison fournie'}`;

    for (const leadId of lead_ids) {
      await q(
        `INSERT INTO lead_notes (lead_id, user_id, content, type)
         VALUES ($1, $2, $3, 'system')`,
        [leadId, req.user.id, note]
      );
    }

    res.json({
      message: `${lead_ids.length} leads marqués comme non-doublons`,
      lead_ids
    });
  } catch (error) {
    console.error('Erreur ignore doublons:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
});

/**
 * DELETE /api/duplicates/:id
 * Supprime un lead doublon
 */
router.delete('/:id', async (req, res) => {
  try {
    const { tenant_id: tenantId } = req.user;
    const { id } = req.params;

    // Vérifier que le lead appartient au tenant
    const { rows } = await q(
      `SELECT id FROM leads WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Lead non trouvé' });
    }

    // Supprimer le lead (cascade supprimera les relations)
    await q(`DELETE FROM leads WHERE id = $1`, [id]);

    res.json({
      message: 'Lead supprimé avec succès',
      id
    });
  } catch (error) {
    console.error('Erreur suppression lead:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
});

export default router;
