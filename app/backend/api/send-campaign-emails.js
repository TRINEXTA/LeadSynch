import { log, error, warn } from "../lib/logger.js";
import { authMiddleware } from '../middleware/auth.js';
import { queryAll, queryOne, execute } from '../lib/db.js';
import { sendEmail } from '../services/elasticEmail.js';
import { checkQuota, incrementQuota } from '../lib/quotaService.js';

async function handler(req, res) {
  const tenant_id = req.user.tenant_id;
  const { campaign_id } = req.body;

  // Utiliser le flag is_super_admin du token JWT (sécurisé)
  const isSuperAdmin = req.user.is_super_admin === true;
  
  try {
    if (!campaign_id) {
      return res.status(400).json({ error: 'campaign_id requis' });
    }
    
    const campaign = await queryOne(
      'SELECT * FROM campaigns WHERE id = $1 AND tenant_id = $2',  
      [campaign_id, tenant_id]
    );
    
    if (!campaign) {
      return res.status(404).json({ error: 'Campagne introuvable' });
    }
    
    // IMPORTANT: Exclure les leads désinscrits pour conformité RGPD
    const leads = await queryAll(
      `SELECT cl.*, l.email, l.company_name, l.contact_name
       FROM campaign_leads cl
       JOIN leads l ON cl.lead_id = l.id
       WHERE cl.campaign_id = $1
       AND cl.status = 'pending'
       AND (l.unsubscribed = false OR l.unsubscribed IS NULL)
       AND NOT EXISTS (
         SELECT 1 FROM email_unsubscribes eu
         WHERE eu.email = l.email AND eu.tenant_id = $2
       )`,
      [campaign_id, tenant_id]
    );
    
    if (leads.length === 0) {
      return res.json({
        success: true,
        message: 'Aucun lead à envoyer',
        results: { sent: 0, failed: 0, total: 0 }
      });
    }
    
    const template = await queryOne(
      'SELECT * FROM email_templates WHERE id = $1',
      [campaign.template_id]
    );
    
    if (!template) {
      return res.status(404).json({ error: 'Template introuvable' });
    }
    
    if (!isSuperAdmin) {
      const quotaCheck = await checkQuota(tenant_id, 'email');     
      if (!quotaCheck.allowed && !quotaCheck.unlimited) {
        return res.status(403).json({
          error: 'Quota d\'emails atteint',
          quota: quotaCheck
        });
      }
    }

    // Configuration email expéditeur
    const fromEmail = process.env.EMAIL_FROM || 'contact@leadsynch.com';
    const replyToEmail = process.env.EMAIL_REPLY_TO || fromEmail;
    
    log('📧 Email expéditeur:', fromEmail);
    
    let sent = 0;
    let failed = 0;
    
    for (const lead of leads) {
      if (!lead.email) {
        failed++;
        continue;
      }
      
      try {
        // Fonction pour personnaliser le contenu avec gestion intelligente des salutations
        const personalizeContent = (content) => {
          let result = content;

          // Liste des synonymes pour les variables de prénom/nom
          // Supporte {{PRENOM}}, {{prenom}}, {contact_name}, {{contact_first_name}}, etc.
          const nameVariablePattern = /\{\{?(PRENOM|prenom|Prenom|firstname|first_name|firstName|contact_name|contact_first_name|contactName|name|nom|NOM)\}?\}/gi;

          // Gérer les patterns de salutation spéciaux (simple et double accolades)
          // "Bonjour {{PRENOM}}," -> "Bonjour," si prenom n'existe pas
          const greetingPattern = /\b(Bonjour|Bonsoir|Cher|Chère|Hello|Hi|Salut)\s+\{\{?(PRENOM|prenom|Prenom|firstname|first_name|firstName|contact_name|contact_first_name|contactName|name|nom|NOM)\}?\}\s*([,!]?)/gi;
          result = result.replace(greetingPattern, (match, greeting, variable, punctuation) => {
            if (lead.contact_name && lead.contact_name.trim()) {
              return `${greeting} ${lead.contact_name}${punctuation}`;
            }
            return `${greeting}${punctuation}`;
          });

          // Remplacer les autres occurrences de variables de nom restantes
          result = result.replace(nameVariablePattern, lead.contact_name || '');

          // Remplacer les autres variables (simple et double accolades)
          result = result.replace(/\{\{?(company_name|COMPANY_NAME|company|COMPANY|entreprise|ENTREPRISE)\}?\}/gi, lead.company_name || 'votre entreprise');
          result = result.replace(/\{\{?(email|EMAIL|mail|MAIL)\}?\}/gi, lead.email);

          // Nettoyer les espaces multiples
          result = result.replace(/  +/g, ' ');

          return result;
        };

        const personalizedSubject = personalizeContent(campaign.subject || template.subject || 'Sans objet');
        const personalizedBody = personalizeContent(template.html_body || template.html_content || '');
        
        // Envoi de l'email via Elastic Email
        const emailResult = await sendEmail({
          from: fromEmail,
          to: lead.email,
          subject: personalizedSubject,
          htmlBody: personalizedBody,
          replyTo: replyToEmail,
          leadId: lead.lead_id,
          campaignId: campaign_id
        });
        
        // Vérifier si l'envoi a réussi
        if (!emailResult.success) {
          error('❌ Elastic Email a rejeté:', lead.email, '-', emailResult.error);
          await execute(
            'UPDATE campaign_leads SET status = $1 WHERE id = $2',   
            ['failed', lead.id]
          );
          failed++;
          continue;
        }
        
        await execute(
          'UPDATE campaign_leads SET status = $1, sent_at = NOW() WHERE id = $2',
          ['sent', lead.id]
        );
        
        await execute(
          'INSERT INTO email_tracking (campaign_id, lead_id, tenant_id, event_type, created_at) VALUES ($1, $2, $3, $4, NOW())',
          [campaign_id, lead.lead_id, tenant_id, 'sent']
        );
        
        if (!isSuperAdmin) {
          await incrementQuota(tenant_id, 'email', 1);
        }
        
        sent++;
        log(`✅ Email envoyé à ${lead.email} - MessageID: ${emailResult.messageId}`);

      } catch (error) {
        error('❌ Erreur envoi email à', lead.email, ':', error.message);
        await execute(
          'UPDATE campaign_leads SET status = $1 WHERE id = $2',   
          ['failed', lead.id]
        );
        failed++;
      }
    }
    
    await execute(
      'UPDATE campaigns SET status = $1, emails_sent = COALESCE(emails_sent, 0) + $2, updated_at = NOW() WHERE id = $3',
      ['active', sent, campaign_id]
    );
    
    log(`📊 Résultat: ${sent} envoyés, ${failed} échoués sur ${leads.length} total`);

    return res.json({
      success: true,
      results: {
        sent,
        failed,
        total: leads.length
      },
      message: `${sent} emails envoyés${isSuperAdmin ? ' (Super Admin)' : ''}${failed > 0 ? `, ${failed} échoués` : ''}`
    });
    
  } catch (error) {
    error('❌ Erreur envoi emails:', error);
    return res.status(500).json({ error: error.message });
  }
}

export default authMiddleware(handler);
