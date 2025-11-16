/**
 * RGPD Controller
 * Gestion des désabonnements et violations RGPD
 */

import { queryOne, queryAll, execute } from '../lib/db.js';
import { v4 as uuidv4 } from 'uuid';
import { sendEmail } from '../lib/email.js';

/**
 * Vérifier si un email est dans la blacklist d'un tenant
 */
export const checkBlacklist = async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const { emails } = req.body; // Array d'emails à vérifier

    if (!Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ error: 'emails array requis' });
    }

    // Vérifier quels emails sont blacklistés pour ce tenant
    const blacklisted = await queryAll(
      `SELECT DISTINCT email, unsubscribed_at, reason
       FROM email_unsubscribes
       WHERE tenant_id = $1 AND email = ANY($2)`,
      [tenant_id, emails]
    );

    return res.json({
      success: true,
      blacklisted: blacklisted,
      count: blacklisted.length
    });
  } catch (error) {
    console.error('❌ Erreur checkBlacklist:', error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Enregistrer une violation RGPD
 */
export const recordViolation = async (tenantId, violationType, leadEmail, leadId = null, campaignId = null, description = '') => {
  try {
    // Créer la violation
    const violationId = uuidv4();
    await execute(
      `INSERT INTO tenant_violations
       (id, tenant_id, violation_type, lead_email, lead_id, campaign_id, description, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [violationId, tenantId, violationType, leadEmail, leadId, campaignId, description]
    );

    // Incrémenter le compteur de violations du tenant
    await execute(
      `UPDATE tenants
       SET violation_count = violation_count + 1,
           last_violation_at = NOW()
       WHERE id = $1`,
      [tenantId]
    );

    // Récupérer le nombre total de violations
    const tenant = await queryOne(
      'SELECT violation_count, email as tenant_email, name FROM tenants WHERE id = $1',
      [tenantId]
    );

    const violationCount = tenant.violation_count;

    console.log(`⚠️ Violation RGPD enregistrée pour tenant ${tenantId}: ${violationType} (${violationCount}/3)`);

    // Système 3 strikes
    if (violationCount === 1) {
      // 1er avertissement - Email warning
      await sendViolationWarning(tenant, violationCount, leadEmail);
    } else if (violationCount === 2) {
      // 2ème avertissement - Email serious warning
      await sendViolationWarning(tenant, violationCount, leadEmail);
    } else if (violationCount >= 3) {
      // 3ème violation - BLOCAGE DU COMPTE
      await execute(
        `UPDATE tenants
         SET blocked_for_violations = true,
             blocked_at = NOW()
         WHERE id = $1`,
        [tenantId]
      );

      await sendAccountBlockedEmail(tenant, leadEmail);

      console.log(`🔴 COMPTE BLOQUÉ pour violations RGPD: ${tenant.name} (${tenantId})`);
    }

    return {
      success: true,
      violation_count: violationCount,
      blocked: violationCount >= 3
    };

  } catch (error) {
    console.error('❌ Erreur recordViolation:', error);
    throw error;
  }
};

/**
 * Envoyer email d'avertissement au tenant
 */
async function sendViolationWarning(tenant, strikeNumber, leadEmail) {
  try {
    const subject = strikeNumber === 1
      ? '⚠️ LeadSynch - 1er Avertissement RGPD'
      : '🚨 LeadSynch - 2ème Avertissement RGPD - DERNIÈRE CHANCE';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: ${strikeNumber === 1 ? '#FFA500' : '#FF4500'}; color: white; padding: 20px; text-align: center;">
          <h1>${strikeNumber === 1 ? '⚠️ Avertissement RGPD' : '🚨 AVERTISSEMENT SÉRIEUX'}</h1>
        </div>

        <div style="padding: 30px; background: #f9f9f9;">
          <h2>Bonjour ${tenant.name},</h2>

          <p style="font-size: 16px; line-height: 1.6;">
            Nous avons détecté que vous avez tenté de contacter un prospect qui s'est <strong>désabonné</strong>
            de vos communications :
          </p>

          <div style="background: white; border-left: 4px solid ${strikeNumber === 1 ? '#FFA500' : '#FF4500'}; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; font-weight: bold;">Email concerné : ${leadEmail}</p>
          </div>

          <p style="font-size: 16px; color: ${strikeNumber === 1 ? '#666' : '#d32f2f'};">
            <strong>⚠️ Ceci est votre ${strikeNumber === 1 ? 'PREMIER' : 'DEUXIÈME'} avertissement.</strong>
          </p>

          ${strikeNumber === 1 ? `
            <p>
              Conformément au RGPD et aux lois anti-spam, vous ne devez <strong>JAMAIS</strong> contacter
              un prospect qui s'est désabonné de vos communications.
            </p>
            <p>
              Si vous tentez de contacter à nouveau un prospect désabonné, vous recevrez un
              <strong>deuxième avertissement</strong>.
            </p>
          ` : `
            <p style="color: #d32f2f; font-weight: bold;">
              C'est votre DERNIÈRE CHANCE !
            </p>
            <p>
              Si vous tentez à nouveau de contacter un prospect désabonné, votre compte LeadSynch
              sera <strong>IMMÉDIATEMENT BLOQUÉ</strong> pour violation grave du RGPD.
            </p>
          `}

          <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <h3 style="margin-top: 0; color: #856404;">📋 Que faire ?</h3>
            <ul style="color: #856404;">
              <li>Vérifiez vos imports de données avant de lancer une campagne</li>
              <li>LeadSynch vous avertit si des prospects sont blacklistés</li>
              <li>Ne forcez JAMAIS le contact avec un prospect désabonné</li>
              <li>Respectez le choix des prospects</li>
            </ul>
          </div>

          <p style="font-size: 14px; color: #999; margin-top: 30px;">
            Cet email est automatique. Pour toute question, contactez support@leadsynch.com
          </p>
        </div>
      </div>
    `;

    await sendEmail({
      to: tenant.tenant_email,
      subject: subject,
      html: html
    });

    console.log(`📧 Email avertissement ${strikeNumber}/3 envoyé à ${tenant.tenant_email}`);

  } catch (error) {
    console.error('❌ Erreur envoi email avertissement:', error);
  }
}

/**
 * Envoyer email de blocage de compte
 */
async function sendAccountBlockedEmail(tenant, leadEmail) {
  try {
    const subject = '🔴 LeadSynch - COMPTE BLOQUÉ pour violations RGPD';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #d32f2f; color: white; padding: 20px; text-align: center;">
          <h1>🔴 COMPTE BLOQUÉ</h1>
        </div>

        <div style="padding: 30px; background: #f9f9f9;">
          <h2>Bonjour ${tenant.name},</h2>

          <p style="font-size: 16px; line-height: 1.6; color: #d32f2f; font-weight: bold;">
            Votre compte LeadSynch a été <strong>BLOQUÉ</strong> suite à de multiples violations du RGPD.
          </p>

          <p style="font-size: 16px; line-height: 1.6;">
            Vous avez ignoré <strong>3 avertissements</strong> et avez continué à contacter des prospects
            qui se sont désabonnés de vos communications.
          </p>

          <div style="background: #ffebee; border-left: 4px solid #d32f2f; padding: 15px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Dernier email concerné :</strong> ${leadEmail}</p>
          </div>

          <h3>⚖️ Conséquences</h3>
          <ul>
            <li>Accès à votre compte LeadSynch <strong>suspendu</strong></li>
            <li>Impossibilité de lancer de nouvelles campagnes</li>
            <li>Risque de sanctions légales pour non-respect du RGPD</li>
          </ul>

          <h3>📞 Que faire ?</h3>
          <p>
            Si vous pensez qu'il s'agit d'une erreur, contactez immédiatement notre support :
          </p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="mailto:support@leadsynch.com"
               style="background: #1976d2; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Contacter le Support
            </a>
          </p>

          <p style="font-size: 14px; color: #999; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px;">
            LeadSynch - Conforme RGPD<br>
            Cet email est automatique. Ne pas répondre.
          </p>
        </div>
      </div>
    `;

    await sendEmail({
      to: tenant.tenant_email,
      subject: subject,
      html: html
    });

    // Notifier aussi les super-admins
    await sendEmail({
      to: process.env.ADMIN_EMAIL || 'admin@leadsynch.com',
      subject: `🚨 BLOCAGE COMPTE - ${tenant.name}`,
      html: `
        <h2>Compte bloqué pour violations RGPD</h2>
        <p><strong>Tenant:</strong> ${tenant.name}</p>
        <p><strong>ID:</strong> ${tenant.id}</p>
        <p><strong>Email:</strong> ${tenant.tenant_email}</p>
        <p><strong>Dernier prospect concerné:</strong> ${leadEmail}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleString('fr-FR')}</p>
      `
    });

    console.log(`📧 Email blocage compte envoyé à ${tenant.tenant_email}`);

  } catch (error) {
    console.error('❌ Erreur envoi email blocage:', error);
  }
}

/**
 * Obtenir les statistiques de violations d'un tenant
 */
export const getViolationStats = async (req, res) => {
  try {
    const { tenant_id } = req.user;

    const stats = await queryOne(
      `SELECT
        violation_count,
        last_violation_at,
        blocked_for_violations
       FROM tenants
       WHERE id = $1`,
      [tenant_id]
    );

    const violations = await queryAll(
      `SELECT *
       FROM tenant_violations
       WHERE tenant_id = $1
       ORDER BY created_at DESC
       LIMIT 10`,
      [tenant_id]
    );

    return res.json({
      success: true,
      stats: stats,
      recent_violations: violations
    });

  } catch (error) {
    console.error('❌ Erreur getViolationStats:', error);
    return res.status(500).json({ error: error.message });
  }
};

export default {
  checkBlacklist,
  recordViolation,
  getViolationStats
};
