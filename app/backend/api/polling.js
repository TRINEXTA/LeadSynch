import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { pollingService } from '../lib/elasticEmailPolling.js';

const router = Router();
router.use(authMiddleware);

// Synchroniser une campagne spécifique
router.post('/sync/:campaign_id', async (req, res) => {
  try {
    const result = await pollingService.syncCampaignStats(req.params.campaign_id);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Synchroniser toutes les campagnes actives
router.post('/sync-all', async (req, res) => {
  try {
    const result = await pollingService.syncAllActiveCampaigns();
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
