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
    console.log('🔄 [EMAIL WORKER] Traitement de la queue d\'emails...');

    // Récupérer les campagnes actives de type email
    const activeCampaigns = await queryAll(
      `SELECT * FROM campaigns 
       WHERE status = 'active' 
       AND type = 'email'
       ORDER BY created_at ASC`
    );

    if (activeCampaigns.length === 0) {
      console.log('ℹ️ [EMAIL WORKER] Aucune campagne email active');
      return;
    }

    console.log(`📊 [EMAIL WORKER] ${activeCampaigns.length} campagne(s) email active(s)`);

    for (const campaign of activeCampaigns) {
      await processCampaign(campaign);
    }

    console.log('✅ [EMAIL WORKER] Traitement terminé');

  } catch (error) {
    console.error('❌ [EMAIL WORKER] Erreur:', error);
  }
};

// ==================== PROCESS ONE CAMPAIGN ====================
const processCampaign = async (campaign) => {
  try {
    console.log(`\n🔍 [EMAIL WORKER] Traitement campagne: ${campaign.name}`);

    // Vérifier si on est dans les horaires d'envoi
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
    const currentDay = now.getDay(); // 0 = Dimanche, 1 = Lundi, 2 = Mardi, etc.

    console.log(`🕐 [EMAIL WORKER] Maintenant: ${now.toLocaleString('fr-FR')}`);
    console.log(`📅 [EMAIL WORKER] Jour actuel (getDay): ${currentDay} (0=Dim, 1=Lun, 2=Mar, 3=Mer, 4=Jeu, 5=Ven, 6=Sam)`);
    console.log(`⏰ [EMAIL WORKER] Heure actuelle: ${currentTime}`);

    const [startHour, startMin] = campaign.send_time_start.split(':').map(Number);
    const [endHour, endMin] = campaign.send_time_end.split(':').map(Number);

    const currentMinutes = currentHour * 60 + currentMinute;
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    // Vérifier jour d'envoi
    const sendDays = campaign.send_days || [1, 2, 3, 4, 5]; // Par défaut: Lun-Ven
    
    console.log(`📋 [EMAIL WORKER] Jours configurés dans BDD: ${JSON.stringify(sendDays)}`);
    console.log(`🔍 [EMAIL WORKER] Type de sendDays: ${typeof sendDays}`);
    console.log(`🔍 [EMAIL WORKER] sendDays est un Array ? ${Array.isArray(sendDays)}`);
    
    // Si sendDays est un string JSON, le parser
    let parsedSendDays = sendDays;
    if (typeof sendDays === 'string') {
      try {
        parsedSendDays = JSON.parse(sendDays);
        console.log(`🔧 [EMAIL WORKER] sendDays parsé: ${JSON.stringify(parsedSendDays)}`);
      } catch (e) {
        console.error(`❌ [EMAIL WORKER] Erreur parsing sendDays:`, e);
        parsedSendDays = [1, 2, 3, 4, 5];
      }
    }
    
    console.log(`🔍 [EMAIL WORKER] currentDay (${currentDay}) est dans parsedSendDays (${JSON.stringify(parsedSendDays)}) ? ${parsedSendDays.includes(currentDay)}`);
    
    // Conversion jour : si dimanche (0), convertir en 7
    const dayToCheck = currentDay === 0 ? 7 : currentDay;
    console.log(`🔍 [EMAIL WORKER] Jour à vérifier après conversion: ${dayToCheck}`);
    
    if (!parsedSendDays.includes(dayToCheck)) {
      console.log(`⏸️ [EMAIL WORKER] Campagne "${campaign.name}": Pas d'envoi aujourd'hui`);
      console.log(`   ❌ currentDay=${currentDay}, dayToCheck=${dayToCheck}, sendDays=${JSON.stringify(parsedSendDays)}`);
      return;
    }

    console.log(`✅ [EMAIL WORKER] Jour OK ! On peut envoyer.`);
    console.log(`🔍 [EMAIL WORKER] Horaires configurés: ${campaign.send_time_start} - ${campaign.send_time_end}`);
    console.log(`🔍 [EMAIL WORKER] Minutes actuelles: ${currentMinutes}, Début: ${startMinutes}, Fin: ${endMinutes}`);

    // Vérifier heure d'envoi
    if (currentMinutes < startMinutes || currentMinutes > endMinutes) {
      console.log(`⏸️ [EMAIL WORKER] Campagne "${campaign.name}": Hors horaires d'envoi`);
      console.log(`   ❌ Heure actuelle: ${currentTime}, Plage autorisée: ${campaign.send_time_start}-${campaign.send_time_end}`);
      return;
    }

    console.log(`✅ [EMAIL WORKER] Heure OK ! On peut envoyer.`);

    // Récupérer le template
    const template = await queryOne(
      'SELECT * FROM email_templates WHERE id = $1',
      [campaign.template_id]
    );

    if (!template) {
      console.error(`❌ [EMAIL WORKER] Template non trouvé pour campagne ${campaign.name}`);
      return;
    }

    console.log(`✅ [EMAIL WORKER] Template trouvé: ${template.name}`);

    // Récupérer les emails en attente
    const emailsToSend = await queryAll(
      `SELECT eq.*, l.email, l.company, l.contact_name
       FROM email_queue eq
       JOIN leads l ON eq.lead_id = l.id
       WHERE eq.campaign_id = $1 
       AND eq.status = 'pending'
       ORDER BY eq.created_at ASC
       LIMIT $2`,
      [campaign.id, campaign.emails_per_cycle || 50]
    );

    if (emailsToSend.length === 0) {
      console.log(`✅ [EMAIL WORKER] Campagne "${campaign.name}": Tous les emails envoyés`);
      
      // Marquer la campagne en mode tracking (15 jours) au lieu de completed
      await execute(
        `UPDATE campaigns 
         SET status = 'tracking',
             tracking_end_date = NOW() + INTERVAL '15 days',
             updated_at = NOW()
         WHERE id = $1`,
        [campaign.id]
      );
      
      console.log(`📊 [EMAIL WORKER] Campagne "${campaign.name}" en mode tracking (période: 15 jours)`);
      console.log(`📅 [EMAIL WORKER] Les stats seront synchronisées pendant 15 jours`);
      return;
    }

    console.log(`📧 [EMAIL WORKER] ${emailsToSend.length} emails à envoyer pour "${campaign.name}"...`);

    let successCount = 0;
    let failCount = 0;

    // Envoyer les emails
    for (const emailData of emailsToSend) {
      try {
        // Personnaliser le template avec gestion intelligente des salutations
        let htmlBody = template.html_body;

        // Gérer les patterns de salutation spéciaux
        // "Bonjour {{contact_name}}," -> "Bonjour," si contact_name n'existe pas
        const greetingPattern = /\b(Bonjour|Bonsoir|Cher|Chère|Hello|Hi|Salut)\s+\{\{contact_name\}\}\s*([,!]?)/gi;
        htmlBody = htmlBody.replace(greetingPattern, (match, greeting, punctuation) => {
          if (emailData.contact_name && emailData.contact_name.trim()) {
            return `${greeting} ${emailData.contact_name}${punctuation}`;
          }
          return `${greeting}${punctuation}`;
        });

        // Remplacer les autres occurrences de {{contact_name}} restantes
        htmlBody = htmlBody.replace(/\{\{contact_name\}\}/g, emailData.contact_name || '');

        // Remplacer les autres variables
        htmlBody = htmlBody
          .replace(/\{\{company\}\}/g, emailData.company || 'Entreprise')
          .replace(/\{\{lead_email\}\}/g, emailData.email);

        // Nettoyer les espaces multiples
        htmlBody = htmlBody.replace(/  +/g, ' ');

        // Ajouter pixel de tracking si activé
        if (campaign.track_clicks) {
          const trackingPixel = `<img src="${process.env.APP_URL || 'https://leadsynch.com'}/api/track/open/${emailData.id}" width="1" height="1" style="display:none;" />`;
          htmlBody += trackingPixel;
        }

        console.log(`📤 [EMAIL WORKER] Envoi à ${emailData.recipient_email}...`);

        // Envoyer l'email
        const result = await sendEmail({
          to: emailData.recipient_email,
          subject: campaign.subject || template.subject,
          htmlBody: htmlBody,
          fromName: 'LeadSync'
        });

        // Marquer comme envoyé
        await execute(
          `UPDATE email_queue 
           SET status = 'sent', 
               sent_at = NOW()
           WHERE id = $1`,
          [emailData.id]
        );

        successCount++;
        console.log(`✅ [EMAIL WORKER] Email envoyé à ${emailData.recipient_email}`);

      } catch (error) {
        console.error(`❌ [EMAIL WORKER] Erreur envoi à ${emailData.recipient_email}:`, error.message);
        
        // Marquer comme échec
        await execute(
          `UPDATE email_queue 
           SET status = 'failed', 
               error_message = $1
           WHERE id = $2`,
          [error.message, emailData.id]
        );

        failCount++;
      }

      // Pause entre chaque email (pour éviter le rate limiting)
      await new Promise(resolve => setTimeout(resolve, 200));
    }

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

    console.log(`📊 [EMAIL WORKER] Campagne "${campaign.name}": ${successCount} envoyés, ${failCount} échecs`);
    console.log(`📊 [EMAIL WORKER] Stats totales: ${stats.sent} envoyés, ${stats.failed} échecs, ${stats.pending} en attente`);

  } catch (error) {
    console.error(`❌ [EMAIL WORKER] Erreur traitement campagne ${campaign.name}:`, error);
  }
};

// ==================== START WORKER ====================
const startEmailWorker = () => {
  console.log('🚀 [EMAIL WORKER] Démarrage du worker d\'emails...');
  
  // Traiter immédiatement
  processEmailQueue();
  
  // Puis toutes les 2 minutes
  setInterval(processEmailQueue, 2 * 60 * 1000);
  
  console.log('✅ [EMAIL WORKER] Worker démarré (intervalle: 2 minutes)');
};

export default startEmailWorker;
export { processEmailQueue, processCampaign };