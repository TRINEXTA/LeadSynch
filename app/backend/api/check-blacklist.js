/**
 * API Check Blacklist
 * Vérifier si des emails CSV sont dans la blacklist RGPD
 */

import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { queryAll } from '../lib/db.js';
import { parse } from 'csv-parse/sync';

const router = express.Router();

/**
 * POST /api/check-blacklist
 * Vérifie si des emails du CSV sont blacklistés
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const { csv_content } = req.body;

    if (!csv_content) {
      return res.status(400).json({
        success: false,
        error: 'csv_content requis'
      });
    }

    // Parser le CSV
    let records;
    try {
      records = parse(csv_content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
        bom: true
      });
    } catch (parseError) {
      return res.status(400).json({
        success: false,
        error: 'Format CSV invalide',
        details: parseError.message
      });
    }

    // Extraire tous les emails
    const emails = [];
    for (const record of records) {
      const email = (
        record['Email'] ||
        record.email ||
        record.mail ||
        record['E-mail'] ||
        ''
      ).trim().toLowerCase();

      if (email && email.includes('@')) {
        emails.push(email);
      }
    }

    if (emails.length === 0) {
      return res.json({
        success: true,
        blacklisted: [],
        total_emails: 0,
        blacklisted_count: 0
      });
    }

    console.log(`🔍 Vérification blacklist: ${emails.length} emails pour tenant ${tenant_id}`);

    // Vérifier lesquels sont blacklistés pour CE tenant
    const blacklisted = await queryAll(
      `SELECT
        eu.email,
        eu.reason,
        eu.unsubscribed_at,
        l.company_name,
        l.contact_name
       FROM email_unsubscribes eu
       LEFT JOIN leads l ON eu.lead_id = l.id
       WHERE eu.tenant_id = $1 AND eu.email = ANY($2)
       ORDER BY eu.unsubscribed_at DESC`,
      [tenant_id, emails]
    );

    const blacklistedCount = blacklisted.length;
    const percentage = ((blacklistedCount / emails.length) * 100).toFixed(1);

    console.log(`⚠️ ${blacklistedCount}/${emails.length} emails blacklistés (${percentage}%)`);

    return res.json({
      success: true,
      blacklisted: blacklisted.map(b => ({
        email: b.email,
        company_name: b.company_name,
        contact_name: b.contact_name,
        reason: b.reason,
        unsubscribed_at: b.unsubscribed_at
      })),
      total_emails: emails.length,
      blacklisted_count: blacklistedCount,
      percentage: parseFloat(percentage)
    });

  } catch (error) {
    console.error('❌ Erreur check-blacklist:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
