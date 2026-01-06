import { log, error, warn } from "../lib/logger.js";
import db from '../config/db.js';
import { sendEmail } from '../services/elasticEmail.js';

// ==================== HELPERS ====================
const queryOne = async (query, params = []) => {
  const { rows } = await db.query(query, params);
  return rows[0] || null;
};

const queryAll = async (query, params = []) => {
  const { rows } = await db.query(query, params);
  return rows;
};

const execute = async (query, params = []) => {
  return await db.query(query, params);
};

// ==================== PROCESS EMAIL QUEUE ====================
const processEmailQueue = async () => {
  try {
    log('🔄 [EMAIL WORKER] Traitement de la queue d\'emails...');

    // Récupérer les campagnes actives de type email
    const activeCampaigns = await queryAll(
      `SELECT * FROM campaigns 
       WHERE status = 'active' 
       AND type = 'email'
       ORDER BY created_at ASC`
    );

    if (activeCampaigns.length === 0) {
      log('ℹ️ [EMAIL WORKER] Aucune campagne email active');
      return;
    }

    log(`📊 [EMAIL WORKER] ${activeCampaigns.length} campagne(s) email active(s)`);

    for (const campaign of activeCampaigns) {
      await processCampaign(campaign);
    }

    log('✅ [EMAIL WORKER] Traitement terminé');

  } catch (err) {
    error('❌ [EMAIL WORKER] Erreur:', err);
  }
};

// ==================== PROCESS ONE CAMPAIGN ====================
const processCampaign = async (campaign) => {
  try {
    log(`\n🔍 [EMAIL WORKER] Traitement campagne: ${campaign.name}`);

    // Utiliser le timezone Paris pour les horaires
    const now = new Date();
    const parisTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
    const currentHour = parisTime.getHours();
    const currentMinute = parisTime.getMinutes();
    const currentTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
    const currentDay = parisTime.getDay(); // 0 = Dimanche, 1 = Lundi, 2 = Mardi, etc.

    log(`🕐 [EMAIL WORKER] Heure Paris: ${parisTime.toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}`);
    log(`📅 [EMAIL WORKER] Jour actuel: ${currentDay} (0=Dim, 1=Lun, 2=Mar, 3=Mer, 4=Jeu, 5=Ven, 6=Sam)`);
    log(`⏰ [EMAIL WORKER] Heure: ${currentTime}`);

    const [startHour, startMin] = campaign.send_time_start.split(':').map(Number);
    const [endHour, endMin] = campaign.send_time_end.split(':').map(Number);

    const currentMinutes = currentHour * 60 + currentMinute;
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    // Vérifier jour d'envoi
    const sendDays = campaign.send_days || [1, 2, 3, 4, 5]; // Par défaut: Lun-Ven
    
    log(`📋 [EMAIL WORKER] Jours configurés dans BDD: ${JSON.stringify(sendDays)}`);
    log(`🔍 [EMAIL WORKER] Type de sendDays: ${typeof sendDays}`);
    log(`🔍 [EMAIL WORKER] sendDays est un Array ? ${Array.isArray(sendDays)}`);
    
    // Si sendDays est un string JSON, le parser
    let parsedSendDays = sendDays;
    if (typeof sendDays === 'string') {
      try {
        parsedSendDays = JSON.parse(sendDays);
        log(`🔧 [EMAIL WORKER] sendDays parsé: ${JSON.stringify(parsedSendDays)}`);
      } catch (e) {
        error(`❌ [EMAIL WORKER] Erreur parsing sendDays:`, e);
        parsedSendDays = [1, 2, 3, 4, 5];
      }
    }
    
    log(`🔍 [EMAIL WORKER] currentDay (${currentDay}) est dans parsedSendDays (${JSON.stringify(parsedSendDays)}) ? ${parsedSendDays.includes(currentDay)}`);
    
    // Conversion jour : si dimanche (0), convertir en 7
    const dayToCheck = currentDay === 0 ? 7 : currentDay;
    log(`🔍 [EMAIL WORKER] Jour à vérifier après conversion: ${dayToCheck}`);
    
    if (!parsedSendDays.includes(dayToCheck)) {
      log(`⏸️ [EMAIL WORKER] Campagne "${campaign.name}": Pas d'envoi aujourd'hui`);
      log(`   ❌ currentDay=${currentDay}, dayToCheck=${dayToCheck}, sendDays=${JSON.stringify(parsedSendDays)}`);
      return;
    }

    log(`✅ [EMAIL WORKER] Jour OK ! On peut envoyer.`);
    log(`🔍 [EMAIL WORKER] Horaires configurés: ${campaign.send_time_start} - ${campaign.send_time_end}`);
    log(`🔍 [EMAIL WORKER] Minutes actuelles: ${currentMinutes}, Début: ${startMinutes}, Fin: ${endMinutes}`);

    // Vérifier heure d'envoi
    if (currentMinutes < startMinutes || currentMinutes > endMinutes) {
      log(`⏸️ [EMAIL WORKER] Campagne "${campaign.name}": Hors horaires d'envoi`);
      log(`   ❌ Heure actuelle: ${currentTime}, Plage autorisée: ${campaign.send_time_start}-${campaign.send_time_end}`);
      return;
    }

    log(`✅ [EMAIL WORKER] Heure OK ! On peut envoyer.`);

    // ==================== VÉRIFIER INTERVALLE ENTRE LES VAGUES ====================
    const cycleIntervalMinutes = campaign.cycle_interval_minutes || 10; // Par défaut 10 minutes

    log(`🔧 [EMAIL WORKER] Config: ${campaign.emails_per_cycle || 50} emails/vague, ${cycleIntervalMinutes} min intervalle`);

    // Vérifier quand le dernier email a été envoyé pour cette campagne
    // Calcul fait directement en SQL pour éviter les problèmes de timezone JS/PostgreSQL
    const lastSentEmail = await queryOne(
      `SELECT
         sent_at,
         EXTRACT(EPOCH FROM (NOW() - sent_at)) / 60 AS minutes_since_sent
       FROM email_queue
       WHERE campaign_id = $1 AND status = 'sent' AND sent_at IS NOT NULL
       ORDER BY sent_at DESC LIMIT 1`,
      [campaign.id]
    );

    log(`🔍 [EMAIL WORKER] DEBUG lastSentEmail:`, JSON.stringify(lastSentEmail));

    if (lastSentEmail && lastSentEmail.minutes_since_sent != null) {
      const minutesSinceLastBatch = parseFloat(lastSentEmail.minutes_since_sent);

      log(`⏱️ [EMAIL WORKER] Dernier envoi: ${new Date(lastSentEmail.sent_at).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}`);
      log(`⏱️ [EMAIL WORKER] Minutes depuis dernier batch: ${minutesSinceLastBatch.toFixed(1)} / ${cycleIntervalMinutes} min requis`);

      if (minutesSinceLastBatch < cycleIntervalMinutes) {
        const waitMinutes = (cycleIntervalMinutes - minutesSinceLastBatch).toFixed(1);
        log(`⏸️ [EMAIL WORKER] Campagne "${campaign.name}": Attente entre les vagues`);
        log(`   ⏳ Prochain envoi dans ${waitMinutes} minute(s)`);
        return;
      }
      log(`✅ [EMAIL WORKER] ${minutesSinceLastBatch.toFixed(1)} min écoulées >= ${cycleIntervalMinutes} min, on peut envoyer`);
    } else {
      log(`ℹ️ [EMAIL WORKER] Aucun email envoyé avant, première vague`);
    }

    log(`✅ [EMAIL WORKER] Intervalle OK ! Envoi de la vague de ${campaign.emails_per_cycle || 50} emails.`);

    // Récupérer le template
    const template = await queryOne(
      'SELECT * FROM email_templates WHERE id = $1',
      [campaign.template_id]
    );

    if (!template) {
      error(`❌ [EMAIL WORKER] Template non trouvé pour campagne ${campaign.name}`);
      return;
    }

    log(`✅ [EMAIL WORKER] Template trouvé: ${template.name}`);

    // Récupérer les emails en attente (EXCLURE les désinscrits - RGPD)
    // IMPORTANT: Joindre tenants pour récupérer le nom de l'entreprise expéditrice
    const emailsToSend = await queryAll(
      `SELECT eq.*, l.email, l.company, l.contact_name,
              t.company_name as tenant_company_name
       FROM email_queue eq
       JOIN leads l ON eq.lead_id = l.id
       JOIN tenants t ON eq.tenant_id = t.id
       WHERE eq.campaign_id = $1
       AND eq.status = 'pending'
       AND (l.unsubscribed = false OR l.unsubscribed IS NULL)
       AND NOT EXISTS (
         SELECT 1 FROM email_unsubscribes eu
         WHERE eu.email = l.email AND eu.tenant_id = eq.tenant_id
       )
       ORDER BY eq.created_at ASC
       LIMIT $2`,
      [campaign.id, campaign.emails_per_cycle || 50]
    );

    if (emailsToSend.length === 0) {
      log(`✅ [EMAIL WORKER] Campagne "${campaign.name}": Tous les emails envoyés`);
      
      // Marquer la campagne en mode tracking (15 jours) au lieu de completed
      await execute(
        `UPDATE campaigns 
         SET status = 'tracking',
             tracking_end_date = NOW() + INTERVAL '15 days',
             updated_at = NOW()
         WHERE id = $1`,
        [campaign.id]
      );
      
      log(`📊 [EMAIL WORKER] Campagne "${campaign.name}" en mode tracking (période: 15 jours)`);
      log(`📅 [EMAIL WORKER] Les stats seront synchronisées pendant 15 jours`);
      return;
    }

    log(`📧 [EMAIL WORKER] ${emailsToSend.length} emails à envoyer pour "${campaign.name}"...`);

    // Collecteurs pour batch updates (optimisation N+1)
    const successIds = [];
    const failedEmails = []; // { id, error_message }

    // Fonction pour personnaliser le template
    const personalizeTemplate = (htmlBody, emailData) => {
      let result = htmlBody;

      const nameVariablePattern = /\{\{(PRENOM|prenom|Prenom|firstname|first_name|firstName|contact_name|contact_first_name|contactName|name|nom|NOM)\}\}/gi;
      const greetingPattern = /\b(Bonjour|Bonsoir|Cher|Chère|Hello|Hi|Salut)\s+\{\{(PRENOM|prenom|Prenom|firstname|first_name|firstName|contact_name|contact_first_name|contactName|name|nom|NOM)\}\}\s*([,!]?)/gi;

      result = result.replace(greetingPattern, (match, greeting, variable, punctuation) => {
        if (emailData.contact_name && emailData.contact_name.trim()) {
          return `${greeting} ${emailData.contact_name}${punctuation}`;
        }
        return `${greeting}${punctuation}`;
      });

      result = result.replace(nameVariablePattern, emailData.contact_name || '');
      result = result
        .replace(/\{\{(company|COMPANY|company_name|COMPANY_NAME|entreprise|ENTREPRISE)\}\}/gi, emailData.company || 'Entreprise')
        .replace(/\{\{(lead_email|email|EMAIL|mail|MAIL)\}\}/gi, emailData.email)
        .replace(/  +/g, ' ');

      if (campaign.track_clicks) {
        // Utiliser l'URL de l'API backend pour le tracking
        const trackingUrl = process.env.API_URL || process.env.APP_URL;
        if (trackingUrl) {
          result += `<img src="${trackingUrl}/api/track/open/${emailData.id}" width="1" height="1" style="display:none;" />`;
        }
      }

      return result;
    };

    // Envoyer les emails par batch de 10 avec pause entre les batches
    const BATCH_SIZE = 10;
    const BATCH_DELAY_MS = 500;

    for (let i = 0; i < emailsToSend.length; i += BATCH_SIZE) {
      const batch = emailsToSend.slice(i, i + BATCH_SIZE);

      // Traiter le batch en parallèle
      const results = await Promise.allSettled(
        batch.map(async (emailData) => {
          const htmlBody = personalizeTemplate(template.html_body, emailData);

          await sendEmail({
            to: emailData.recipient_email,
            subject: campaign.subject || template.subject,
            htmlBody: htmlBody,
            fromName: emailData.tenant_company_name || 'Support'
          });

          return emailData.id;
        })
      );

      // Collecter les résultats
      results.forEach((result, index) => {
        const emailData = batch[index];
        if (result.status === 'fulfilled') {
          successIds.push(result.value);
        } else {
          failedEmails.push({
            id: emailData.id,
            error_message: result.reason?.message || 'Unknown error'
          });
        }
      });

      // Pause entre les batches (sauf pour le dernier)
      if (i + BATCH_SIZE < emailsToSend.length) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
      }
    }

    // BATCH UPDATE : Marquer les emails envoyés avec succès
    if (successIds.length > 0) {
      await execute(
        `UPDATE email_queue
         SET status = 'sent', sent_at = NOW()
         WHERE id = ANY($1)`,
        [successIds]
      );
      log(`✅ [EMAIL WORKER] ${successIds.length} emails envoyés avec succès`);
    }

    // BATCH UPDATE : Marquer les emails échoués
    if (failedEmails.length > 0) {
      // Pour les erreurs, on doit faire une mise à jour par erreur unique
      const errorGroups = {};
      failedEmails.forEach(({ id, error_message }) => {
        const key = error_message.substring(0, 200);
        if (!errorGroups[key]) errorGroups[key] = [];
        errorGroups[key].push(id);
      });

      for (const [errorMsg, ids] of Object.entries(errorGroups)) {
        await execute(
          `UPDATE email_queue
           SET status = 'failed', error_message = $1
           WHERE id = ANY($2)`,
          [errorMsg, ids]
        );
      }
      log(`❌ [EMAIL WORKER] ${failedEmails.length} emails échoués`);
    }

    const successCount = successIds.length;
    const failCount = failedEmails.length;

    // Mettre à jour les statistiques de la campagne
    const stats = await queryOne(
      `SELECT 
         COUNT(*) FILTER (WHERE status = 'sent') as sent,
         COUNT(*) FILTER (WHERE status = 'failed') as failed,
         COUNT(*) FILTER (WHERE status = 'pending') as pending
       FROM email_queue
       WHERE campaign_id = $1`,
      [campaign.id]
    );

    await execute(
      `UPDATE campaigns 
       SET sent_count = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [stats.sent, campaign.id]
    );

    log(`📊 [EMAIL WORKER] Campagne "${campaign.name}": ${successCount} envoyés, ${failCount} échecs`);
    log(`📊 [EMAIL WORKER] Stats totales: ${stats.sent} envoyés, ${stats.failed} échecs, ${stats.pending} en attente`);

  } catch (err) {
    error(`❌ [EMAIL WORKER] Erreur traitement campagne ${campaign.name}:`, err);
  }
};

// ==================== START WORKER ====================
// IMPORTANT: Intervalle de 10 minutes minimum pour éviter le blacklistage du domaine
// Le worker vérifie les campagnes actives et envoie les emails par vagues
// Chaque campagne a son propre cycle_interval_minutes (défaut: 10 min)
const WORKER_INTERVAL_MINUTES = 10;

const startEmailWorker = () => {
  log('🚀 [EMAIL WORKER] Démarrage du worker d\'emails...');

  // Traiter immédiatement au démarrage
  processEmailQueue();

  // Puis toutes les 10 minutes (anti-spam protection)
  setInterval(processEmailQueue, WORKER_INTERVAL_MINUTES * 60 * 1000);

  log(`✅ [EMAIL WORKER] Worker démarré (intervalle: ${WORKER_INTERVAL_MINUTES} minutes)`);
};

export default startEmailWorker;
export { processEmailQueue, processCampaign };