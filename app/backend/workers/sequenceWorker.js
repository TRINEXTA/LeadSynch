import { log, error, warn } from "../lib/logger.js";
import { query, queryOne, queryAll, execute } from '../lib/db.js';

/**
 * Worker pour exécuter les étapes de séquences automatisées
 * Doit être appelé périodiquement (toutes les minutes)
 */

const WORKER_INTERVAL = 60 * 1000; // 1 minute
let isRunning = false;

/**
 * Vérifie si on est dans les heures de travail
 */
function isWorkingHours(sequence) {
  if (!sequence.working_days_only) return true;

  const now = new Date();
  const day = now.getDay();

  // Samedi (6) et Dimanche (0)
  if (day === 0 || day === 6) return false;

  const currentTime = now.toTimeString().substring(0, 5); // HH:MM
  const startTime = sequence.working_hours_start || '09:00';
  const endTime = sequence.working_hours_end || '18:00';

  return currentTime >= startTime && currentTime <= endTime;
}

/**
 * Vérifie les conditions de sortie de séquence
 */
async function checkExitConditions(enrollment, sequence, lead) {
  const exitConditions = sequence.exit_conditions || [];

  for (const condition of exitConditions) {
    switch (condition.type) {
      case 'replied':
        // Vérifier si le lead a répondu (email reçu ou note manuelle)
        const replied = await queryOne(
          `SELECT 1 FROM lead_notes
           WHERE lead_id = $1 AND content ILIKE '%répondu%' OR content ILIKE '%replied%'
           AND created_at > $2
           LIMIT 1`,
          [lead.id, enrollment.enrolled_at]
        );
        if (replied) return { exit: true, reason: 'Lead a répondu' };
        break;

      case 'unsubscribed':
        // Vérifier si le lead s'est désabonné
        const unsubscribed = await queryOne(
          `SELECT 1 FROM email_unsubscribes WHERE lead_id = $1 LIMIT 1`,
          [lead.id]
        );
        if (unsubscribed) return { exit: true, reason: 'Lead désabonné' };
        break;

      case 'status_changed':
        // Vérifier si le statut a changé vers une valeur spécifique
        if (condition.value && lead.status === condition.value) {
          return { exit: true, reason: `Statut changé vers ${lead.status}` };
        }
        break;

      case 'converted':
        if (lead.status === 'gagne' || lead.status === 'won') {
          return { exit: true, reason: 'Lead converti' };
        }
        break;
    }
  }

  return { exit: false };
}

/**
 * Exécute une étape de séquence
 */
async function executeStep(enrollment, step, lead, tenantId) {
  log(`📧 Exécution étape ${step.step_order} (${step.step_type}) pour lead ${lead.company_name}`);

  const logEntry = {
    tenant_id: tenantId,
    enrollment_id: enrollment.id,
    step_id: step.id,
    step_order: step.step_order,
    action_type: step.step_type,
    status: 'sent',
    metadata: {}
  };

  try {
    switch (step.step_type) {
      case 'email':
        // Ajouter l'email à la queue
        const emailResult = await execute(
          `INSERT INTO email_queue (tenant_id, lead_id, subject, body, template_id, status, created_at)
           VALUES ($1, $2, $3, $4, $5, 'pending', NOW())
           RETURNING id`,
          [tenantId, lead.id, step.email_subject, step.email_body, step.email_template_id]
        );
        logEntry.metadata = { email_queue_id: emailResult.rows[0]?.id };
        break;

      case 'call_task':
        // Créer une tâche de rappel
        await execute(
          `INSERT INTO follow_ups (tenant_id, lead_id, title, description, status, due_date, created_at)
           VALUES ($1, $2, $3, $4, 'pending', NOW() + INTERVAL '1 day', NOW())`,
          [tenantId, lead.id, step.task_title || 'Appeler le prospect', step.task_description || '']
        );
        logEntry.action_type = 'task_created';
        break;

      case 'sms':
        // Pour SMS, on log l'intention (l'envoi réel dépend de l'intégration)
        log(`📱 SMS prévu pour ${lead.phone}: ${step.sms_content}`);
        logEntry.metadata = { phone: lead.phone, message: step.sms_content };
        // TODO: Intégrer avec Twilio ou autre provider SMS
        break;

      case 'whatsapp':
        // Pour WhatsApp, on log l'intention
        log(`📱 WhatsApp prévu pour ${lead.phone}: ${step.whatsapp_message}`);
        logEntry.metadata = { phone: lead.phone, template: step.whatsapp_template_name };
        // TODO: Intégrer avec Meta WhatsApp API
        break;

      case 'linkedin':
        // Créer une tâche pour contacter sur LinkedIn
        await execute(
          `INSERT INTO follow_ups (tenant_id, lead_id, title, description, status, due_date, created_at)
           VALUES ($1, $2, 'Contacter sur LinkedIn', $3, 'pending', NOW(), NOW())`,
          [tenantId, lead.id, step.linkedin_message]
        );
        logEntry.action_type = 'linkedin_task_created';
        break;

      case 'wait':
        // Rien à faire, juste attendre
        logEntry.action_type = 'wait_completed';
        break;

      case 'condition':
        // Évaluer la condition
        const conditionResult = await evaluateCondition(step, lead, enrollment);
        logEntry.metadata = { condition_result: conditionResult };

        // Retourner l'étape suivante basée sur la condition
        return {
          success: true,
          nextStepOrder: conditionResult ? step.condition_true_step : step.condition_false_step,
          logEntry
        };
    }

    return { success: true, logEntry };
  } catch (err) {
    logEntry.status = 'failed';
    logEntry.metadata = { error: err.message };
    error(`Erreur exécution étape ${step.id}:`, err);
    return { success: false, logEntry };
  }
}

/**
 * Évalue une condition de branchement
 */
async function evaluateCondition(step, lead, enrollment) {
  switch (step.condition_type) {
    case 'if_opened':
      // Vérifier si un email a été ouvert depuis l'inscription
      const opened = await queryOne(
        `SELECT 1 FROM email_events
         WHERE lead_id = $1 AND event_type = 'open' AND created_at > $2
         LIMIT 1`,
        [lead.id, enrollment.enrolled_at]
      );
      return !!opened;

    case 'if_clicked':
      // Vérifier si un lien a été cliqué
      const clicked = await queryOne(
        `SELECT 1 FROM email_events
         WHERE lead_id = $1 AND event_type = 'click' AND created_at > $2
         LIMIT 1`,
        [lead.id, enrollment.enrolled_at]
      );
      return !!clicked;

    case 'if_replied':
      // Vérifier si une note de réponse existe
      const replied = await queryOne(
        `SELECT 1 FROM lead_notes
         WHERE lead_id = $1 AND (content ILIKE '%répondu%' OR content ILIKE '%replied%')
         AND created_at > $2
         LIMIT 1`,
        [lead.id, enrollment.enrolled_at]
      );
      return !!replied;

    case 'if_not_opened':
      const notOpened = await queryOne(
        `SELECT 1 FROM email_events
         WHERE lead_id = $1 AND event_type = 'open' AND created_at > $2
         LIMIT 1`,
        [lead.id, enrollment.enrolled_at]
      );
      return !notOpened;

    default:
      return false;
  }
}

/**
 * Traite les inscriptions en attente d'exécution
 */
async function processEnrollments() {
  if (isRunning) {
    log('⏳ Sequence worker déjà en cours...');
    return;
  }

  isRunning = true;
  log('🔄 Démarrage du traitement des séquences...');

  try {
    // Récupérer les inscriptions actives dont l'étape suivante est due
    const { rows: enrollments } = await query(
      `SELECT se.*, s.name as sequence_name, s.exit_conditions, s.working_days_only,
        s.working_hours_start, s.working_hours_end,
        l.id as lead_id, l.company_name, l.email, l.phone, l.status as lead_status
       FROM sequence_enrollments se
       JOIN sequences s ON se.sequence_id = s.id
       JOIN leads l ON se.lead_id = l.id
       WHERE se.status = 'active'
         AND s.status = 'active'
         AND se.next_step_scheduled_at <= NOW()
       ORDER BY se.next_step_scheduled_at ASC
       LIMIT 100`
    );

    log(`📋 ${enrollments.length} inscriptions à traiter`);

    for (const enrollment of enrollments) {
      try {
        // Vérifier les heures de travail
        if (!isWorkingHours(enrollment)) {
          log(`⏰ Hors heures de travail pour séquence ${enrollment.sequence_name}`);
          continue;
        }

        // Vérifier les conditions de sortie
        const lead = {
          id: enrollment.lead_id,
          company_name: enrollment.company_name,
          email: enrollment.email,
          phone: enrollment.phone,
          status: enrollment.lead_status
        };

        const exitCheck = await checkExitConditions(enrollment, enrollment, lead);
        if (exitCheck.exit) {
          log(`🚪 Lead ${lead.company_name} sort de la séquence: ${exitCheck.reason}`);
          await execute(
            `UPDATE sequence_enrollments
             SET status = 'exited', exit_reason = $1, updated_at = NOW()
             WHERE id = $2`,
            [exitCheck.reason, enrollment.id]
          );
          continue;
        }

        // Récupérer l'étape actuelle
        const step = await queryOne(
          `SELECT * FROM sequence_steps
           WHERE sequence_id = $1 AND step_order = $2`,
          [enrollment.sequence_id, enrollment.current_step_order]
        );

        if (!step) {
          // Séquence terminée
          log(`✅ Séquence terminée pour ${lead.company_name}`);
          await execute(
            `UPDATE sequence_enrollments
             SET status = 'completed', completed_at = NOW(), updated_at = NOW()
             WHERE id = $1`,
            [enrollment.id]
          );
          continue;
        }

        // Exécuter l'étape
        const result = await executeStep(enrollment, step, lead, enrollment.tenant_id);

        // Logger l'exécution
        await execute(
          `INSERT INTO sequence_execution_logs
           (tenant_id, enrollment_id, step_id, step_order, action_type, status, metadata, executed_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
          [
            enrollment.tenant_id, enrollment.id, step.id, step.step_order,
            result.logEntry.action_type, result.logEntry.status,
            JSON.stringify(result.logEntry.metadata)
          ]
        );

        // Mettre à jour les stats de l'étape
        await execute(
          `UPDATE sequence_steps
           SET ${step.step_type === 'email' ? 'emails_sent' : 'tasks_created'} =
               ${step.step_type === 'email' ? 'emails_sent' : 'tasks_created'} + 1
           WHERE id = $1`,
          [step.id]
        );

        // Déterminer la prochaine étape
        let nextStepOrder = result.nextStepOrder || (step.step_order + 1);

        // Récupérer l'étape suivante pour calculer le délai
        const nextStep = await queryOne(
          `SELECT step_order, delay_days, delay_hours, delay_minutes
           FROM sequence_steps
           WHERE sequence_id = $1 AND step_order = $2`,
          [enrollment.sequence_id, nextStepOrder]
        );

        if (nextStep) {
          // Calculer la date de la prochaine exécution
          const delayMs = (nextStep.delay_days * 24 * 60 + nextStep.delay_hours * 60 + nextStep.delay_minutes) * 60 * 1000;
          const nextStepDate = new Date(Date.now() + delayMs);

          await execute(
            `UPDATE sequence_enrollments
             SET current_step_order = $1,
                 next_step_scheduled_at = $2,
                 last_step_executed_at = NOW(),
                 updated_at = NOW()
             WHERE id = $3`,
            [nextStepOrder, nextStepDate, enrollment.id]
          );
        } else {
          // Pas d'étape suivante = séquence terminée
          log(`✅ Séquence terminée pour ${lead.company_name}`);
          await execute(
            `UPDATE sequence_enrollments
             SET status = 'completed', completed_at = NOW(), updated_at = NOW()
             WHERE id = $1`,
            [enrollment.id]
          );
        }

      } catch (err) {
        error(`Erreur traitement inscription ${enrollment.id}:`, err);
        // Continuer avec les autres inscriptions
      }
    }

    log('✅ Traitement des séquences terminé');
  } catch (err) {
    error('Erreur sequence worker:', err);
  } finally {
    isRunning = false;
  }
}

/**
 * Démarre le worker
 */
export function startSequenceWorker() {
  log('🚀 Démarrage du sequence worker...');

  // Exécuter immédiatement puis toutes les minutes
  processEnrollments();
  setInterval(processEnrollments, WORKER_INTERVAL);
}

/**
 * Exécute manuellement le worker (pour tests)
 */
export async function runSequenceWorker() {
  await processEnrollments();
}

export default { startSequenceWorker, runSequenceWorker };
