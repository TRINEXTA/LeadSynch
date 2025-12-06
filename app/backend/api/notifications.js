/**
 * Notifications API - Endpoints pour les notifications utilisateur
 *
 * @author LeadSynch
 * @version 1.0.0
 */

import { log, error } from '../lib/logger.js';
import { authMiddleware } from '../middleware/auth.js';
import {
  getUserNotifications,
  countUnreadNotifications,
  markNotificationRead,
  markAllNotificationsRead
} from '../services/backgroundJobService.js';

async function handler(req, res) {
  const userId = req.user.id;
  const tenantId = req.user.tenant_id;
  const url = req.originalUrl || req.url || '';

  try {
    // ============================================================
    // GET /notifications - Liste des notifications
    // ============================================================
    if (req.method === 'GET' && !url.includes('/count')) {
      const unreadOnly = req.query.unread === 'true';
      const limit = parseInt(req.query.limit) || 50;

      const notifications = await getUserNotifications(userId, unreadOnly, limit);
      const unreadCount = await countUnreadNotifications(userId);

      return res.json({
        success: true,
        notifications,
        unread_count: unreadCount
      });
    }

    // ============================================================
    // GET /notifications/count - Nombre de notifications non lues
    // ============================================================
    if (req.method === 'GET' && url.includes('/count')) {
      const count = await countUnreadNotifications(userId);
      return res.json({ success: true, count });
    }

    // ============================================================
    // POST /notifications/:id/read - Marquer comme lue
    // ============================================================
    if (req.method === 'POST' && url.includes('/read')) {
      // Extraire l'ID de la notification de l'URL
      const match = url.match(/\/notifications\/([^/]+)\/read/);
      const notificationId = match ? match[1] : req.body.notification_id;

      if (!notificationId) {
        return res.status(400).json({ error: 'notification_id requis' });
      }

      await markNotificationRead(notificationId, userId);
      return res.json({ success: true });
    }

    // ============================================================
    // POST /notifications/read-all - Tout marquer comme lu
    // ============================================================
    if (req.method === 'POST' && url.includes('/read-all')) {
      await markAllNotificationsRead(userId);
      return res.json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    error('Notifications API error:', err);
    return res.status(500).json({ error: err.message });
  }
}

export default authMiddleware(handler);
