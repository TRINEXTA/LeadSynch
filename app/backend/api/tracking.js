import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { queryOne } from '../lib/db.js';

const router = Router();
router.use(authMiddleware);

router.get('/campaign/:campaign_id/stats', async (req, res) => {
  try {
    const stats = await queryOne(
      `SELECT 
        COUNT(CASE WHEN event_type = 'sent' THEN 1 END) as sent,
        COUNT(CASE WHEN event_type = 'delivered' THEN 1 END) as delivered,
        COUNT(CASE WHEN event_type = 'open' THEN 1 END) as opens,
        COUNT(CASE WHEN event_type = 'click' THEN 1 END) as clicks,
        COUNT(CASE WHEN event_type = 'bounce' THEN 1 END) as bounces
       FROM email_tracking 
       WHERE campaign_id = $1`,
      [req.params.campaign_id]
    );
    
    return res.json({ success: true, stats: stats || { sent: 0, delivered: 0, opens: 0, clicks: 0, bounces: 0 } });
  } catch (error) {
    console.error('Erreur stats:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
