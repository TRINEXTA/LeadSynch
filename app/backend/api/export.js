import express from 'express';
import { query as q } from '../lib/db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Toutes les routes nécessitent l'authentification
router.use(authMiddleware);

/**
 * ✅ SÉCURITÉ: Sanitize CSV formula injection
 * Prévient l'exécution de formules Excel malicieuses
 * @param {string} value - Valeur à sanitizer
 * @returns {string} - Valeur sécurisée
 */
function sanitizeCSVValue(value) {
  if (typeof value !== 'string') {
    return value;
  }

  // Caractères dangereux pouvant déclencher des formules Excel
  const dangerousChars = ['=', '+', '-', '@', '\t', '\r'];

  // Si la valeur commence par un caractère dangereux, préfixer avec '
  if (dangerousChars.some(char => value.startsWith(char))) {
    return "'" + value;
  }

  return value;
}

/**
 * Convertit des données en format CSV
 * @param {array} data - Tableau d'objets
 * @param {array} columns - Colonnes à inclure
 * @returns {string} - Données au format CSV
 */
function convertToCSV(data, columns) {
  if (!data || data.length === 0) {
    return '';
  }

  // Header
  const header = columns.map(col => `"${col.label}"`).join(',');

  // Rows
  const rows = data.map(item => {
    return columns.map(col => {
      let value = item[col.key] || '';

      // Formater les dates
      if (value instanceof Date || col.type === 'date') {
        value = new Date(value).toLocaleDateString('fr-FR');
      }

      // ✅ SÉCURITÉ: Sanitize formula injection
      if (typeof value === 'string') {
        value = sanitizeCSVValue(value);
        // Échapper les guillemets
        value = value.replace(/"/g, '""');
      }

      return `"${value}"`;
    }).join(',');
  });

  return [header, ...rows].join('\n');
}

/**
 * GET /api/export/leads/csv
 * Exporte les leads au format CSV
 */
router.get('/leads/csv', async (req, res) => {
  try {
    const { tenant_id: tenantId } = req.user;
    const { database_id, status, sector } = req.query;

    // Construire la requête
    let query = `SELECT * FROM leads WHERE tenant_id = $1`;
    const params = [tenantId];
    let paramIndex = 2;

    if (database_id) {
      query += ` AND id IN (
        SELECT lead_id FROM lead_database_relations WHERE database_id = $${paramIndex}
      )`;
      params.push(database_id);
      paramIndex++;
    }

    if (status) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (sector) {
      query += ` AND sector = $${paramIndex}`;
      params.push(sector);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC`;

    const { rows } = await q(query, params);

    // Définir les colonnes à exporter
    const columns = [
      { key: 'company_name', label: 'Nom entreprise' },
      { key: 'siret', label: 'SIRET' },
      { key: 'sector', label: 'Secteur' },
      { key: 'effectif', label: 'Effectif' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Téléphone' },
      { key: 'address', label: 'Adresse' },
      { key: 'postal_code', label: 'Code postal' },
      { key: 'city', label: 'Ville' },
      { key: 'website', label: 'Site web' },
      { key: 'status', label: 'Statut' },
      { key: 'score', label: 'Score' },
      { key: 'score_grade', label: 'Grade' },
      { key: 'created_at', label: 'Date création', type: 'date' }
    ];

    const csv = convertToCSV(rows, columns);

    // Définir les headers pour le téléchargement
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="leads_${Date.now()}.csv"`);

    // Ajouter le BOM UTF-8 pour Excel
    res.write('\uFEFF');
    res.end(csv);
  } catch (error) {
    console.error('Erreur export leads CSV:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
});

/**
 * GET /api/export/campaigns/csv
 * Exporte les campagnes au format CSV
 */
router.get('/campaigns/csv', async (req, res) => {
  try {
    const { tenant_id: tenantId } = req.user;

    const { rows } = await q(
      `SELECT
        c.*,
        u.first_name || ' ' || u.last_name as created_by_name
       FROM campaigns c
       LEFT JOIN users u ON c.created_by = u.id
       WHERE c.tenant_id = $1
       ORDER BY c.created_at DESC`,
      [tenantId]
    );

    const columns = [
      { key: 'name', label: 'Nom campagne' },
      { key: 'status', label: 'Statut' },
      { key: 'subject', label: 'Sujet' },
      { key: 'sent_count', label: 'Envoyés' },
      { key: 'opened_count', label: 'Ouverts' },
      { key: 'clicked_count', label: 'Cliqués' },
      { key: 'bounced_count', label: 'Bounces' },
      { key: 'open_rate', label: 'Taux ouverture (%)' },
      { key: 'click_rate', label: 'Taux clic (%)' },
      { key: 'created_by_name', label: 'Créée par' },
      { key: 'created_at', label: 'Date création', type: 'date' },
      { key: 'sent_at', label: 'Date envoi', type: 'date' }
    ];

    const csv = convertToCSV(rows, columns);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="campaigns_${Date.now()}.csv"`);
    res.write('\uFEFF');
    res.end(csv);
  } catch (error) {
    console.error('Erreur export campagnes CSV:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
});

/**
 * GET /api/export/campaign/:id/stats/csv
 * Exporte les statistiques détaillées d'une campagne
 */
router.get('/campaign/:id/stats/csv', async (req, res) => {
  try {
    const { tenant_id: tenantId } = req.user;
    const { id } = req.params;

    // Récupérer les stats par lead
    const { rows } = await q(
      `SELECT
        l.company_name,
        l.email,
        l.city,
        l.sector,
        (SELECT COUNT(*) FROM email_events WHERE lead_id = l.id AND campaign_id = $1 AND event_type = 'sent') as sent,
        (SELECT COUNT(*) FROM email_events WHERE lead_id = l.id AND campaign_id = $1 AND event_type = 'open') as opens,
        (SELECT COUNT(*) FROM email_events WHERE lead_id = l.id AND campaign_id = $1 AND event_type = 'click') as clicks,
        (SELECT COUNT(*) FROM email_events WHERE lead_id = l.id AND campaign_id = $1 AND event_type = 'bounce') as bounced,
        (SELECT MIN(created_at) FROM email_events WHERE lead_id = l.id AND campaign_id = $1 AND event_type = 'sent') as sent_date,
        (SELECT MIN(created_at) FROM email_events WHERE lead_id = l.id AND campaign_id = $1 AND event_type = 'open') as first_open_date
       FROM campaign_leads cl
       JOIN leads l ON cl.lead_id = l.id
       WHERE cl.campaign_id = $1 AND l.tenant_id = $2
       ORDER BY l.company_name`,
      [id, tenantId]
    );

    const columns = [
      { key: 'company_name', label: 'Entreprise' },
      { key: 'email', label: 'Email' },
      { key: 'city', label: 'Ville' },
      { key: 'sector', label: 'Secteur' },
      { key: 'sent', label: 'Envoyé' },
      { key: 'opens', label: 'Ouvertures' },
      { key: 'clicks', label: 'Clics' },
      { key: 'bounced', label: 'Bounce' },
      { key: 'sent_date', label: 'Date envoi', type: 'date' },
      { key: 'first_open_date', label: 'Première ouverture', type: 'date' }
    ];

    const csv = convertToCSV(rows, columns);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="campaign_${id}_stats_${Date.now()}.csv"`);
    res.write('\uFEFF');
    res.end(csv);
  } catch (error) {
    console.error('Erreur export stats campagne:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
});

/**
 * POST /api/export/leads/selection/csv
 * Exporte une sélection de leads au format CSV
 */
router.post('/leads/selection/csv', async (req, res) => {
  try {
    const { tenant_id: tenantId } = req.user;
    const { lead_ids } = req.body;

    if (!lead_ids || !Array.isArray(lead_ids) || lead_ids.length === 0) {
      return res.status(400).json({
        error: 'Paramètres invalides',
        message: 'lead_ids (array) requis'
      });
    }

    const { rows } = await q(
      `SELECT * FROM leads
       WHERE id = ANY($1) AND tenant_id = $2
       ORDER BY company_name`,
      [lead_ids, tenantId]
    );

    const columns = [
      { key: 'company_name', label: 'Nom entreprise' },
      { key: 'siret', label: 'SIRET' },
      { key: 'sector', label: 'Secteur' },
      { key: 'effectif', label: 'Effectif' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Téléphone' },
      { key: 'address', label: 'Adresse' },
      { key: 'postal_code', label: 'Code postal' },
      { key: 'city', label: 'Ville' },
      { key: 'website', label: 'Site web' },
      { key: 'status', label: 'Statut' },
      { key: 'score', label: 'Score' },
      { key: 'created_at', label: 'Date création', type: 'date' }
    ];

    const csv = convertToCSV(rows, columns);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="leads_selection_${Date.now()}.csv"`);
    res.write('\uFEFF');
    res.end(csv);
  } catch (error) {
    console.error('Erreur export sélection leads:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
});

export default router;
