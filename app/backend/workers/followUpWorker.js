/**
 * Worker de Relances Automatiques
 *
 * Ce worker gère l'envoi des emails de relance pour les campagnes.
 * Il tourne toutes les 30 minutes et traite les relances programmées.
 *
 * Logique:
 * 1. Vérifie les campagnes avec relances activées
 * 2. Identifie les leads éligibles selon le target_audience
 * 3. Envoie les emails de relance par batch (même logique que l'email principal)
 *
 * @module followUpWorker
 */

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

// ==================== CONFIGURATION ====================
const WORKER_INTERVAL_MINUTES = 10; // Tourne toutes les 10 minutes (même règle que emailWorker)
const EMAILS_PER_BATCH = 50;         // 50 emails max par exécution
const BATCH_SIZE = 10;               // Taille des sous-batches pour l'envoi
const BATCH_DELAY_MS = 500;          // Délai entre sous-batches
const SURVEILLANCE_DAYS = 15;        // Jours de surveillance avant clôture automatique

// ==================== PROCESS FOLLOW-UP QUEUE ====================
const processFollowUpQueue = async () => {
  try {
    log('🔄 [FOLLOW-UP WORKER] Traitement des relances...');

    // 1. Vérifier les campagnes en surveillance pour clôture automatique
    await checkSurveillanceCampaigns();

    // 2. Récupérer les campagnes avec relances activées (y compris terminées pour relances tardives)
    const campaignsWithFollowUps = await queryAll(`
      SELECT c.id, c.name, c.tenant_id, c.subject, c.status,
             c.follow_ups_enabled, c.follow_up_delay_days,
             c.send_time_start, c.send_time_end, c.send_days,
             c.track_clicks, c.created_at
      FROM campaigns c
      WHERE c.follow_ups_enabled = true
      AND c.status NOT IN ('archived', 'closed')
      AND c.type = 'email'
      ORDER BY c.created_at ASC
    `);

    if (campaignsWithFollowUps.length === 0) {
      log('ℹ️ [FOLLOW-UP WORKER] Aucune campagne avec relances actives');
      return;
    }

    log(`📊 [FOLLOW-UP WORKER] ${campaignsWithFollowUps.length} campagne(s) avec relances`);

    for (const campaign of campaignsWithFollowUps) {
      await processCampaignFollowUps(campaign);
    }

    log('✅ [FOLLOW-UP WORKER] Traitement terminé');

  } catch (err) {
    error('❌ [FOLLOW-UP WORKER] Erreur:', err);
  }
};

// ==================== CHECK SURVEILLANCE CAMPAIGNS ====================
const checkSurveillanceCampaigns = async () => {
  try {
    // Trouver les campagnes en surveillance depuis plus de 15 jours
    const campaignsToClose = await queryAll(`
      SELECT id, name, surveillance_started_at
      FROM campaigns
      WHERE status = 'surveillance'
      AND surveillance_started_at IS NOT NULL
      AND surveillance_started_at < NOW() - INTERVAL '${SURVEILLANCE_DAYS} days'
    `);

    if (campaignsToClose.length === 0) {
      return;
    }

    log(`🔒 [FOLLOW-UP WORKER] ${campaignsToClose.length} campagne(s) à clôturer après surveillance`);

    for (const campaign of campaignsToClose) {
      await execute(`
        UPDATE campaigns
        SET status = 'closed',
            closed_at = NOW(),
            updated_at = NOW()
        WHERE id = $1
      `, [campaign.id]);

      log(`✅ [FOLLOW-UP WORKER] Campagne "${campaign.name}" clôturée automatiquement`);
    }

  } catch (err) {
    error('❌ [FOLLOW-UP WORKER] Erreur vérification surveillance:', err);
  }
};

// ==================== PROCESS ONE CAMPAIGN'S FOLLOW-UPS ====================
const processCampaignFollowUps = async (campaign) => {
  try {
    log(`\n🔍 [FOLLOW-UP WORKER] Traitement relances: ${campaign.name}`);

    // Passer en "relances_en_cours" si pas déjà fait
    if (campaign.status !== 'relances_en_cours' && campaign.status !== 'surveillance') {
      await execute(`
        UPDATE campaigns
        SET status = 'relances_en_cours',
            updated_at = NOW()
        WHERE id = $1
      `, [campaign.id]);
      log(`📌 [FOLLOW-UP WORKER] Statut "${campaign.name}" → relances_en_cours`);
    }

    // Vérifier les horaires et jours (même logique que emailWorker)
    const now = new Date();
    const parisTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
    const currentHour = parisTime.getHours();
    const currentMinute = parisTime.getMinutes();
    const currentTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
    const currentDay = parisTime.getDay();

    // Vérifier jour d'envoi
    let sendDays = campaign.send_days || [1, 2, 3, 4, 5];
    if (typeof sendDays === 'string') {
      try {
        sendDays = JSON.parse(sendDays);
      } catch (e) {
        sendDays = [1, 2, 3, 4, 5];
      }
    }

    const dayToCheck = currentDay === 0 ? 7 : currentDay;
    if (!sendDays.includes(dayToCheck)) {
      log(`⏸️ [FOLLOW-UP] "${campaign.name}": Pas d'envoi aujourd'hui (jour ${dayToCheck})`);
      return;
    }

    // Vérifier les horaires
    if (campaign.send_time_start && campaign.send_time_end) {
      const [startHour, startMin] = campaign.send_time_start.split(':').map(Number);
      const [endHour, endMin] = campaign.send_time_end.split(':').map(Number);
      const currentMinutes = currentHour * 60 + currentMinute;
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      if (currentMinutes < startMinutes || currentMinutes > endMinutes) {
        log(`⏸️ [FOLLOW-UP] "${campaign.name}": Hors horaires (${currentTime})`);
        return;
      }
    }

    // Récupérer les relances configurées pour cette campagne
    const followUps = await queryAll(`
      SELECT * FROM campaign_follow_ups
      WHERE campaign_id = $1
      AND status IN ('pending', 'scheduled', 'active')
      ORDER BY follow_up_number ASC
    `, [campaign.id]);

    if (followUps.length === 0) {
      // Vérifier si toutes les relances sont vraiment terminées
      const allFollowUps = await queryAll(`
        SELECT * FROM campaign_follow_ups
        WHERE campaign_id = $1
      `, [campaign.id]);

      if (allFollowUps.length > 0) {
        // Il y a des relances mais toutes sont terminées -> passer en surveillance
        const allCompleted = allFollowUps.every(fu => fu.status === 'completed' || fu.status === 'cancelled');

        if (allCompleted && campaign.status !== 'surveillance') {
          await execute(`
            UPDATE campaigns
            SET status = 'surveillance',
                surveillance_started_at = NOW(),
                updated_at = NOW()
            WHERE id = $1
          `, [campaign.id]);
          log(`👁️ [FOLLOW-UP WORKER] Campagne "${campaign.name}" → surveillance (${SURVEILLANCE_DAYS} jours)`);
        }
      }

      log(`ℹ️ [FOLLOW-UP] "${campaign.name}": Toutes les relances terminées`);
      return;
    }

    for (const followUp of followUps) {
      await processFollowUp(campaign, followUp);
    }

  } catch (err) {
    error(`❌ [FOLLOW-UP WORKER] Erreur campagne ${campaign.name}:`, err);
  }
};

// ==================== PROCESS ONE FOLLOW-UP ====================
const processFollowUp = async (campaign, followUp) => {
  try {
    log(`📬 [FOLLOW-UP] Traitement relance #${followUp.follow_up_number} (${followUp.target_audience})`);

    // Vérifier si le délai est passé depuis l'envoi de l'email principal
    // ou depuis la relance précédente
    const delayCheck = await checkFollowUpDelay(campaign, followUp);
    if (!delayCheck.ready) {
      log(`⏳ [FOLLOW-UP] Délai non atteint: ${delayCheck.message}`);
      return;
    }

    // Si la relance est "pending", vérifier s'il y a déjà des leads dans la queue
    // Sinon, les identifier et les ajouter
    if (followUp.status === 'pending' || followUp.status === 'scheduled') {
      await populateFollowUpQueue(campaign, followUp);

      // Activer la relance
      await execute(`
        UPDATE campaign_follow_ups
        SET status = 'active', started_at = NOW(), updated_at = NOW()
        WHERE id = $1
      `, [followUp.id]);

      followUp.status = 'active';
    }

    // Récupérer les emails à envoyer
    const emailsToSend = await queryAll(`
      SELECT fq.*, l.email, l.company, l.contact_name
      FROM follow_up_queue fq
      JOIN leads l ON fq.lead_id = l.id
      WHERE fq.follow_up_id = $1
      AND fq.status = 'pending'
      ORDER BY fq.created_at ASC
      LIMIT $2
    `, [followUp.id, EMAILS_PER_BATCH]);

    if (emailsToSend.length === 0) {
      log(`✅ [FOLLOW-UP] Relance #${followUp.follow_up_number}: Tous les emails envoyés`);

      // Marquer la relance comme terminée
      await execute(`
        UPDATE campaign_follow_ups
        SET status = 'completed', completed_at = NOW(), updated_at = NOW()
        WHERE id = $1
      `, [followUp.id]);

      return;
    }

    log(`📧 [FOLLOW-UP] ${emailsToSend.length} emails de relance à envoyer...`);

    // Envoyer les emails
    const { successIds, failedEmails } = await sendFollowUpEmails(
      campaign,
      followUp,
      emailsToSend
    );

    // Mettre à jour les statistiques
    await updateFollowUpStats(followUp, successIds.length, failedEmails.length);

    log(`📊 [FOLLOW-UP] Relance #${followUp.follow_up_number}: ${successIds.length} envoyés, ${failedEmails.length} échecs`);

  } catch (err) {
    error(`❌ [FOLLOW-UP] Erreur relance #${followUp.follow_up_number}:`, err);
  }
};

// ==================== CHECK FOLLOW-UP DELAY ====================
const checkFollowUpDelay = async (campaign, followUp) => {
  const delayDays = followUp.delay_days || campaign.follow_up_delay_days || 3;

  // Pour la relance #1: vérifier depuis le dernier email principal
  // Pour la relance #2: vérifier depuis la relance #1
  let referenceQuery;
  let referenceParams;

  if (followUp.follow_up_number === 1) {
    // Vérifier depuis le dernier email principal envoyé
    referenceQuery = `
      SELECT MAX(sent_at) as last_sent
      FROM email_queue
      WHERE campaign_id = $1 AND status = 'sent'
    `;
    referenceParams = [campaign.id];
  } else {
    // Vérifier depuis la relance précédente
    referenceQuery = `
      SELECT MAX(sent_at) as last_sent
      FROM follow_up_queue fq
      JOIN campaign_follow_ups cfu ON fq.follow_up_id = cfu.id
      WHERE cfu.campaign_id = $1
      AND cfu.follow_up_number = $2
      AND fq.status = 'sent'
    `;
    referenceParams = [campaign.id, followUp.follow_up_number - 1];
  }

  const reference = await queryOne(referenceQuery, referenceParams);

  if (!reference || !reference.last_sent) {
    // Si relance #1 et pas d'email envoyé, attendre
    if (followUp.follow_up_number === 1) {
      return {
        ready: false,
        message: 'Aucun email principal envoyé encore'
      };
    }
    // Si relance #2 et relance #1 pas commencée
    return {
      ready: false,
      message: `Relance #${followUp.follow_up_number - 1} pas encore envoyée`
    };
  }

  const lastSent = new Date(reference.last_sent);
  const now = new Date();
  const daysSince = (now - lastSent) / (1000 * 60 * 60 * 24);

  if (daysSince < delayDays) {
    return {
      ready: false,
      message: `${daysSince.toFixed(1)} jours / ${delayDays} jours requis`
    };
  }

  return { ready: true };
};

// ==================== POPULATE FOLLOW-UP QUEUE ====================
const populateFollowUpQueue = async (campaign, followUp) => {
  log(`🔍 [FOLLOW-UP] Identification des leads éligibles (${followUp.target_audience})...`);

  // Utiliser la fonction SQL créée dans la migration
  // ou implémenter la logique directement
  let eligibleLeadsQuery;

  if (followUp.target_audience === 'opened_not_clicked') {
    // Leads qui ont ouvert mais pas cliqué
    eligibleLeadsQuery = `
      SELECT DISTINCT l.id as lead_id, l.email
      FROM leads l
      JOIN email_queue eq ON eq.lead_id = l.id AND eq.campaign_id = $1
      WHERE eq.status = 'sent'
      AND l.unsubscribed = false
      -- A ouvert
      AND EXISTS (
        SELECT 1 FROM email_tracking et
        WHERE et.lead_id = l.id
        AND et.campaign_id = $1
        AND et.event_type = 'open'
        AND et.follow_up_id IS NULL
      )
      -- Mais pas cliqué
      AND NOT EXISTS (
        SELECT 1 FROM email_tracking et
        WHERE et.lead_id = l.id
        AND et.campaign_id = $1
        AND et.event_type = 'click'
        AND et.follow_up_id IS NULL
      )
      -- Pas déjà dans une queue de relance
      AND NOT EXISTS (
        SELECT 1 FROM follow_up_queue fq
        WHERE fq.lead_id = l.id
        AND fq.follow_up_id = $2
      )
      -- Pas bounced
      AND eq.status != 'bounced'
    `;
  } else {
    // Leads qui n'ont pas ouvert du tout
    eligibleLeadsQuery = `
      SELECT DISTINCT l.id as lead_id, l.email
      FROM leads l
      JOIN email_queue eq ON eq.lead_id = l.id AND eq.campaign_id = $1
      WHERE eq.status = 'sent'
      AND l.unsubscribed = false
      -- N'a jamais ouvert
      AND NOT EXISTS (
        SELECT 1 FROM email_tracking et
        WHERE et.lead_id = l.id
        AND et.campaign_id = $1
        AND et.event_type = 'open'
        AND et.follow_up_id IS NULL
      )
      -- Pas déjà dans une queue de relance
      AND NOT EXISTS (
        SELECT 1 FROM follow_up_queue fq
        WHERE fq.lead_id = l.id
        AND fq.follow_up_id = $2
      )
      -- Pas bounced
      AND eq.status != 'bounced'
    `;
  }

  const eligibleLeads = await queryAll(eligibleLeadsQuery, [campaign.id, followUp.id]);

  log(`📊 [FOLLOW-UP] ${eligibleLeads.length} leads éligibles trouvés`);

  if (eligibleLeads.length === 0) {
    return;
  }

  // Insérer dans la queue de relance
  const values = eligibleLeads.map(lead =>
    `('${followUp.id}', '${campaign.id}', '${lead.lead_id}', '${campaign.tenant_id}', '${lead.email}', 'pending', NOW())`
  ).join(',\n');

  await execute(`
    INSERT INTO follow_up_queue
    (follow_up_id, campaign_id, lead_id, tenant_id, recipient_email, status, created_at)
    VALUES ${values}
    ON CONFLICT (follow_up_id, lead_id) DO NOTHING
  `);

  // Mettre à jour le total éligible
  await execute(`
    UPDATE campaign_follow_ups
    SET total_eligible = $1, updated_at = NOW()
    WHERE id = $2
  `, [eligibleLeads.length, followUp.id]);

  log(`✅ [FOLLOW-UP] ${eligibleLeads.length} leads ajoutés à la queue`);
};

// ==================== SEND FOLLOW-UP EMAILS ====================
const sendFollowUpEmails = async (campaign, followUp, emailsToSend) => {
  const successIds = [];
  const failedEmails = [];

  // Personnaliser le template avec fallback intelligent
  const personalizeTemplate = (htmlBody, emailData) => {
    let result = htmlBody;

    // Déterminer le nom à utiliser: contact_name ou company
    const displayName = (emailData.contact_name && emailData.contact_name.trim())
      ? emailData.contact_name.trim()
      : (emailData.company && emailData.company.trim())
        ? emailData.company.trim()
        : null;

    // Pattern pour les salutations avec variable de nom
    const greetingPattern = /\b(Bonjour|Bonsoir|Cher|Chère|Hello|Hi|Salut)\s*\{\{[^}]+\}\}\s*([,!]?)/gi;

    // Remplacer les salutations
    result = result.replace(greetingPattern, (match, greeting, punctuation) => {
      if (displayName) {
        return `${greeting} ${displayName}${punctuation}`;
      }
      // Pas de nom ni d'entreprise: juste "Bonjour,"
      return `${greeting}${punctuation}`;
    });

    // Pattern pour toutes les variables de nom
    const nameVariablePattern = /\{\{(PRENOM|prenom|Prenom|firstname|first_name|firstName|contact_name|contact_name_or_company|name|nom|NOM)\}\}/gi;

    // Remplacer les variables de nom
    result = result.replace(nameVariablePattern, displayName || '');

    // Remplacer les autres variables
    result = result
      .replace(/\{\{(company|COMPANY|company_name|COMPANY_NAME|entreprise|ENTREPRISE)\}\}/gi, emailData.company || '')
      .replace(/\{\{(lead_email|email|EMAIL|mail|MAIL)\}\}/gi, emailData.email)
      // Nettoyer les espaces doubles et les virgules orphelines
      .replace(/,\s*,/g, ',')
      .replace(/\s+,/g, ',')
      .replace(/  +/g, ' ')
      .replace(/\s+\./g, '.');

    // Ajouter le pixel de tracking pour cette relance
    if (campaign.track_clicks) {
      result += `<img src="${process.env.APP_URL || 'https://leadsynch.com'}/api/track/open?lead_id=${emailData.lead_id}&campaign_id=${campaign.id}&follow_up_id=${followUp.id}" width="1" height="1" style="display:none;" />`;
    }

    return result;
  };

  // Envoyer par batch
  for (let i = 0; i < emailsToSend.length; i += BATCH_SIZE) {
    const batch = emailsToSend.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map(async (emailData) => {
        const htmlBody = personalizeTemplate(followUp.html_content, emailData);

        await sendEmail({
          to: emailData.recipient_email,
          subject: followUp.subject,
          htmlBody: htmlBody,
          fromName: 'LeadSync'
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

    // Pause entre les batches
    if (i + BATCH_SIZE < emailsToSend.length) {
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  // BATCH UPDATE : Marquer les emails envoyés
  if (successIds.length > 0) {
    await execute(`
      UPDATE follow_up_queue
      SET status = 'sent', sent_at = NOW()
      WHERE id = ANY($1)
    `, [successIds]);
  }

  // BATCH UPDATE : Marquer les échecs
  if (failedEmails.length > 0) {
    const errorGroups = {};
    failedEmails.forEach(({ id, error_message }) => {
      const key = error_message.substring(0, 200);
      if (!errorGroups[key]) errorGroups[key] = [];
      errorGroups[key].push(id);
    });

    for (const [errorMsg, ids] of Object.entries(errorGroups)) {
      await execute(`
        UPDATE follow_up_queue
        SET status = 'failed', error_message = $1
        WHERE id = ANY($2)
      `, [errorMsg, ids]);
    }
  }

  return { successIds, failedEmails };
};

// ==================== UPDATE FOLLOW-UP STATS ====================
const updateFollowUpStats = async (followUp, sentCount, failedCount) => {
  await execute(`
    UPDATE campaign_follow_ups
    SET total_sent = total_sent + $1,
        updated_at = NOW()
    WHERE id = $2
  `, [sentCount, followUp.id]);
};

// ==================== START WORKER ====================
const startFollowUpWorker = () => {
  log('🚀 [FOLLOW-UP WORKER] Démarrage du worker de relances...');

  // Premier traitement après 2 minutes (laisser le temps au worker principal)
  setTimeout(() => {
    processFollowUpQueue();
  }, 2 * 60 * 1000);

  // Puis toutes les 10 minutes (même règle que emailWorker pour anti-blacklist)
  setInterval(processFollowUpQueue, WORKER_INTERVAL_MINUTES * 60 * 1000);

  log(`✅ [FOLLOW-UP WORKER] Worker démarré (intervalle: ${WORKER_INTERVAL_MINUTES} minutes, max ${EMAILS_PER_BATCH} emails/batch)`);
};

export default startFollowUpWorker;
export { processFollowUpQueue, processCampaignFollowUps, processFollowUp };
