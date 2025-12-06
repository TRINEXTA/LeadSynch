/**
 * BackgroundJobService - Service de gestion des jobs en arrière-plan
 *
 * Permet de :
 * - Créer et exécuter des jobs de génération de leads en background
 * - Suivre la progression des jobs
 * - Envoyer des notifications aux utilisateurs
 *
 * @author LeadSynch
 * @version 1.0.0
 */

import { log, error, warn } from '../lib/logger.js';
import { queryAll, queryOne, execute } from '../lib/db.js';
import { v4 as uuidv4 } from 'uuid';

// Jobs en cours d'exécution (en mémoire)
const activeJobs = new Map();

/**
 * Créer un nouveau job
 */
export async function createJob(tenantId, userId, jobType, params) {
  try {
    const jobId = uuidv4();

    await execute(`
      INSERT INTO background_jobs (id, tenant_id, user_id, job_type, params, status, created_at)
      VALUES ($1, $2, $3, $4, $5, 'pending', NOW())
    `, [jobId, tenantId, userId, jobType, JSON.stringify(params)]);

    log(`📋 [Job] Créé: ${jobId} (${jobType})`);

    return jobId;
  } catch (err) {
    error('Erreur création job:', err);
    throw err;
  }
}

/**
 * Démarrer un job
 */
export async function startJob(jobId) {
  try {
    await execute(`
      UPDATE background_jobs
      SET status = 'running', started_at = NOW(), progress = 0
      WHERE id = $1
    `, [jobId]);

    activeJobs.set(jobId, { status: 'running', cancelled: false });

    log(`▶️ [Job] Démarré: ${jobId}`);
  } catch (err) {
    error('Erreur démarrage job:', err);
  }
}

/**
 * Mettre à jour la progression d'un job
 */
export async function updateJobProgress(jobId, progress, message = null, itemsProcessed = null, itemsTotal = null) {
  try {
    let query = 'UPDATE background_jobs SET progress = $1';
    const params = [progress];
    let paramIndex = 2;

    if (message) {
      query += `, progress_message = $${paramIndex}`;
      params.push(message);
      paramIndex++;
    }

    if (itemsProcessed !== null) {
      query += `, items_processed = $${paramIndex}`;
      params.push(itemsProcessed);
      paramIndex++;
    }

    if (itemsTotal !== null) {
      query += `, items_total = $${paramIndex}`;
      params.push(itemsTotal);
      paramIndex++;
    }

    query += ` WHERE id = $${paramIndex}`;
    params.push(jobId);

    await execute(query, params);
  } catch (err) {
    // Ignorer les erreurs de mise à jour de progression
  }
}

/**
 * Terminer un job avec succès
 */
export async function completeJob(jobId, result, leadsData = null) {
  try {
    await execute(`
      UPDATE background_jobs
      SET status = 'completed',
          completed_at = NOW(),
          progress = 100,
          result = $1,
          leads_data = $2,
          items_success = COALESCE($3, items_processed)
      WHERE id = $4
    `, [JSON.stringify(result), leadsData ? JSON.stringify(leadsData) : null, result?.total || 0, jobId]);

    activeJobs.delete(jobId);

    // Créer une notification
    const job = await getJob(jobId);
    if (job) {
      await createNotification(job.tenant_id, job.user_id, {
        type: 'job_complete',
        title: getJobCompleteTitle(job.job_type, result),
        message: getJobCompleteMessage(job.job_type, result),
        data: result,
        jobId,
        actionUrl: getJobActionUrl(job.job_type, result),
        actionLabel: getJobActionLabel(job.job_type)
      });
    }

    log(`✅ [Job] Terminé: ${jobId}`);
  } catch (err) {
    error('Erreur complétion job:', err);
  }
}

/**
 * Échouer un job
 */
export async function failJob(jobId, errorMessage) {
  try {
    await execute(`
      UPDATE background_jobs
      SET status = 'failed',
          completed_at = NOW(),
          error_message = $1
      WHERE id = $2
    `, [errorMessage, jobId]);

    activeJobs.delete(jobId);

    // Créer une notification d'erreur
    const job = await getJob(jobId);
    if (job) {
      await createNotification(job.tenant_id, job.user_id, {
        type: 'job_failed',
        title: 'Erreur de traitement',
        message: errorMessage,
        jobId
      });
    }

    error(`❌ [Job] Échoué: ${jobId} - ${errorMessage}`);
  } catch (err) {
    error('Erreur échec job:', err);
  }
}

/**
 * Annuler un job
 */
export async function cancelJob(jobId) {
  try {
    const job = activeJobs.get(jobId);
    if (job) {
      job.cancelled = true;
    }

    await execute(`
      UPDATE background_jobs
      SET status = 'cancelled', completed_at = NOW()
      WHERE id = $1 AND status IN ('pending', 'running')
    `, [jobId]);

    activeJobs.delete(jobId);

    log(`🛑 [Job] Annulé: ${jobId}`);
    return true;
  } catch (err) {
    error('Erreur annulation job:', err);
    return false;
  }
}

/**
 * Vérifier si un job est annulé
 */
export function isJobCancelled(jobId) {
  const job = activeJobs.get(jobId);
  return job?.cancelled === true;
}

/**
 * Récupérer un job
 */
export async function getJob(jobId) {
  try {
    return await queryOne('SELECT * FROM background_jobs WHERE id = $1', [jobId]);
  } catch (err) {
    error('Erreur récupération job:', err);
    return null;
  }
}

/**
 * Récupérer les jobs d'un utilisateur
 */
export async function getUserJobs(tenantId, userId, status = null, limit = 20) {
  try {
    let query = `
      SELECT id, job_type, status, progress, progress_message,
             items_total, items_processed, items_success, items_failed,
             error_message, created_at, started_at, completed_at,
             params, result
      FROM background_jobs
      WHERE tenant_id = $1
    `;
    const params = [tenantId];
    let paramIndex = 2;

    if (userId) {
      query += ` AND user_id = $${paramIndex}`;
      params.push(userId);
      paramIndex++;
    }

    if (status) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
    params.push(limit);

    return await queryAll(query, params);
  } catch (err) {
    error('Erreur récupération jobs:', err);
    return [];
  }
}

/**
 * Récupérer les leads générés par un job
 */
export async function getJobLeads(jobId) {
  try {
    const job = await queryOne('SELECT leads_data FROM background_jobs WHERE id = $1', [jobId]);
    return job?.leads_data || [];
  } catch (err) {
    error('Erreur récupération leads job:', err);
    return [];
  }
}

// ============================================================
// NOTIFICATIONS
// ============================================================

/**
 * Créer une notification
 */
export async function createNotification(tenantId, userId, { type, title, message, data = null, jobId = null, actionUrl = null, actionLabel = null }) {
  try {
    const id = uuidv4();

    await execute(`
      INSERT INTO notifications (id, tenant_id, user_id, type, title, message, data, job_id, action_url, action_label, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
    `, [id, tenantId, userId, type, title, message, data ? JSON.stringify(data) : null, jobId, actionUrl, actionLabel]);

    log(`🔔 [Notification] Créée pour user ${userId}: ${title}`);

    return id;
  } catch (err) {
    error('Erreur création notification:', err);
    return null;
  }
}

/**
 * Récupérer les notifications d'un utilisateur
 */
export async function getUserNotifications(userId, unreadOnly = false, limit = 50) {
  try {
    let query = `
      SELECT id, type, title, message, data, action_url, action_label,
             read, read_at, job_id, created_at
      FROM notifications
      WHERE user_id = $1
    `;
    const params = [userId];

    if (unreadOnly) {
      query += ' AND read = FALSE';
    }

    query += ' ORDER BY created_at DESC LIMIT $2';
    params.push(limit);

    return await queryAll(query, params);
  } catch (err) {
    error('Erreur récupération notifications:', err);
    return [];
  }
}

/**
 * Compter les notifications non lues
 */
export async function countUnreadNotifications(userId) {
  try {
    const result = await queryOne(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND read = FALSE',
      [userId]
    );
    return parseInt(result?.count || 0);
  } catch (err) {
    return 0;
  }
}

/**
 * Marquer une notification comme lue
 */
export async function markNotificationRead(notificationId, userId) {
  try {
    await execute(`
      UPDATE notifications
      SET read = TRUE, read_at = NOW()
      WHERE id = $1 AND user_id = $2
    `, [notificationId, userId]);
    return true;
  } catch (err) {
    error('Erreur marquage notification:', err);
    return false;
  }
}

/**
 * Marquer toutes les notifications comme lues
 */
export async function markAllNotificationsRead(userId) {
  try {
    await execute(`
      UPDATE notifications
      SET read = TRUE, read_at = NOW()
      WHERE user_id = $1 AND read = FALSE
    `, [userId]);
    return true;
  } catch (err) {
    error('Erreur marquage notifications:', err);
    return false;
  }
}

/**
 * Supprimer les anciennes notifications (> 30 jours)
 */
export async function cleanupOldNotifications() {
  try {
    const result = await execute(`
      DELETE FROM notifications
      WHERE created_at < NOW() - INTERVAL '30 days'
    `);
    log(`🧹 [Notifications] Nettoyage: ${result.rowCount} supprimées`);
  } catch (err) {
    error('Erreur nettoyage notifications:', err);
  }
}

// ============================================================
// HELPERS
// ============================================================

function getJobCompleteTitle(jobType, result) {
  switch (jobType) {
    case 'lead_generation':
      return `${result?.total || 0} leads générés`;
    case 'lead_enrichment':
      return `${result?.enriched || 0} leads enrichis`;
    case 'csv_import':
      return `${result?.imported || 0} leads importés`;
    default:
      return 'Traitement terminé';
  }
}

function getJobCompleteMessage(jobType, result) {
  switch (jobType) {
    case 'lead_generation':
      const sources = [];
      if (result?.fromInternalDb > 0) sources.push(`${result.fromInternalDb} de votre base`);
      if (result?.fromGlobalCache > 0) sources.push(`${result.fromGlobalCache} du cache`);
      if (result?.fromSirene > 0) sources.push(`${result.fromSirene} de Sirene`);
      if (result?.fromGoogleMaps > 0) sources.push(`${result.fromGoogleMaps} de Google Maps`);
      return sources.length > 0 ? `Sources: ${sources.join(', ')}` : 'Génération terminée';
    case 'csv_import':
      return `${result?.duplicates || 0} doublons ignorés`;
    default:
      return null;
  }
}

function getJobActionUrl(jobType, result) {
  switch (jobType) {
    case 'lead_generation':
      return '/lead-generation';
    case 'csv_import':
      return result?.database_id ? `/leads?database=${result.database_id}` : '/leads';
    default:
      return null;
  }
}

function getJobActionLabel(jobType) {
  switch (jobType) {
    case 'lead_generation':
      return 'Voir les leads';
    case 'csv_import':
      return 'Voir les leads';
    default:
      return 'Voir';
  }
}

export default {
  createJob,
  startJob,
  updateJobProgress,
  completeJob,
  failJob,
  cancelJob,
  isJobCancelled,
  getJob,
  getUserJobs,
  getJobLeads,
  createNotification,
  getUserNotifications,
  countUnreadNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  cleanupOldNotifications
};
