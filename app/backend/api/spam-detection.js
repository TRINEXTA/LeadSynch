/**
 * API Endpoints pour la Détection Spam
 *
 * @module api/spam-detection
 */

import { Router } from 'express';
import { log, error } from '../lib/logger.js';
import {
  analyzeCampaignSpam,
  getSpamAnalysisHistory,
  validateEmailsBatch
} from '../services/spamDetectionService.js';

const router = Router();

/**
 * GET /api/campaigns/:campaignId/spam-analysis
 * Analyse spam d'une campagne
 */
router.get('/:campaignId/spam-analysis', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const tenantId = req.user.tenant_id;

    const result = await analyzeCampaignSpam(campaignId, tenantId);

    res.json(result);

  } catch (err) {
    error('❌ [API] Erreur spam analysis:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/campaigns/:campaignId/spam-analysis/history
 * Historique des analyses spam
 */
router.get('/:campaignId/spam-analysis/history', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const tenantId = req.user.tenant_id;

    const history = await getSpamAnalysisHistory(campaignId, tenantId);

    res.json({
      success: true,
      history
    });

  } catch (err) {
    error('❌ [API] Erreur spam history:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/validate-emails
 * Valider une liste d'emails (vérification domaines)
 */
router.post('/validate-emails', async (req, res) => {
  try {
    const { emails } = req.body;

    if (!emails || !Array.isArray(emails)) {
      return res.status(400).json({ error: 'emails array required' });
    }

    if (emails.length > 1000) {
      return res.status(400).json({ error: 'Maximum 1000 emails par requête' });
    }

    const result = await validateEmailsBatch(emails);

    res.json({
      success: true,
      total: emails.length,
      valid_count: result.valid.length,
      invalid_count: result.invalid.length,
      valid: result.valid,
      invalid: result.invalid
    });

  } catch (err) {
    error('❌ [API] Erreur validate emails:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
