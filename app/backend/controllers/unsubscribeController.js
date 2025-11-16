/**
 * Unsubscribe Controller - RGPD Compliant
 * Gestion des désabonnements avec tenant_id
 */

import { v4 as uuidv4 } from 'uuid';
import { queryOne, queryAll, execute } from '../lib/db.js';
import { sendEmail } from '../lib/email.js';

// Page de désabonnement (GET)
export const getUnsubscribePage = async (req, res) => {
  try {
    const { lead_id } = req.params;

    // Vérifier si le lead existe
    const lead = await queryOne(
      'SELECT id, email, company_name, contact_name, unsubscribed, tenant_id FROM leads WHERE id = $1',
      [lead_id]
    );

    if (!lead) {
      return res.status(404).json({ message: 'Lead introuvable' });
    }

    res.json({
      lead: {
        id: lead.id,
        email: lead.email,
        name: lead.contact_name || lead.company_name,
        already_unsubscribed: lead.unsubscribed
      }
    });
  } catch (error) {
    console.error('Erreur get unsubscribe:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Traiter le désabonnement (POST)
export const processUnsubscribe = async (req, res) => {
  try {
    const { lead_id } = req.params;
    const { reason } = req.body;
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');

    // Vérifier si le lead existe
    const lead = await queryOne(
      'SELECT id, email, company_name, contact_name, tenant_id FROM leads WHERE id = $1',
      [lead_id]
    );

    if (!lead) {
      return res.status(404).json({ message: 'Lead introuvable' });
    }

    // Vérifier si déjà désabonné pour CE tenant
    const existingUnsubscribe = await queryOne(
      'SELECT id FROM email_unsubscribes WHERE lead_id = $1 AND tenant_id = $2',
      [lead_id, lead.tenant_id]
    );

    if (existingUnsubscribe) {
      return res.json({ message: 'Déjà désabonné', already_unsubscribed: true });
    }

    const unsubId = uuidv4();

    // Enregistrer le désabonnement avec tenant_id
    await execute(
      `INSERT INTO email_unsubscribes
       (id, tenant_id, lead_id, email, reason, ip_address, user_agent, unsubscribed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [unsubId, lead.tenant_id, lead_id, lead.email, reason || null, ip, userAgent]
    );

    // Mettre à jour le lead
    await execute(
      `UPDATE leads
       SET unsubscribed = true,
           unsubscribed_at = NOW()
       WHERE id = $1`,
      [lead_id]
    );

    console.log(`✅ Unsubscribe: ${lead.email} (${lead_id}) pour tenant ${lead.tenant_id}`);

    // Envoyer email de notification au tenant
    await notifyTenantOfUnsubscribe(lead);

    res.json({
      message: 'Désabonnement effectué avec succès',
      success: true
    });
  } catch (error) {
    console.error('Erreur unsubscribe:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Notifier le tenant du désabonnement
 */
async function notifyTenantOfUnsubscribe(lead) {
  try {
    // Récupérer les infos du tenant
    const tenant = await queryOne(
      'SELECT name, email FROM tenants WHERE id = $1',
      [lead.tenant_id]
    );

    if (!tenant || !tenant.email) {
      console.log('⚠️ Pas d\'email tenant pour notification');
      return;
    }

    const subject = '📧 LeadSynch - Nouveau désabonnement';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1976d2; color: white; padding: 20px; text-align: center;">
          <h1>📧 Nouveau désabonnement</h1>
        </div>

        <div style="padding: 30px; background: #f9f9f9;">
          <h2>Bonjour ${tenant.name},</h2>

          <p style="font-size: 16px; line-height: 1.6;">
            Un prospect s'est désabonné de vos communications :
          </p>

          <div style="background: white; border-left: 4px solid #1976d2; padding: 15px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Email :</strong> ${lead.email}</p>
            <p style="margin: 5px 0;"><strong>Entreprise :</strong> ${lead.company_name || 'N/A'}</p>
            <p style="margin: 5px 0;"><strong>Contact :</strong> ${lead.contact_name || 'N/A'}</p>
          </div>

          <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <h3 style="margin-top: 0; color: #856404;">⚠️ IMPORTANT - RGPD</h3>
            <p style="color: #856404; margin: 0;">
              Ce prospect est maintenant <strong>blacklisté</strong> dans votre compte.
              Vous ne pourrez plus lui envoyer d'emails via LeadSynch.
            </p>
            <p style="color: #856404; margin: 10px 0 0 0;">
              <strong>Ne tentez PAS de contacter ce prospect</strong> sous peine de sanctions.
            </p>
          </div>

          <p style="font-size: 14px; color: #999; margin-top: 30px;">
            LeadSynch - Conforme RGPD<br>
            Cet email est automatique.
          </p>
        </div>
      </div>
    `;

    await sendEmail({
      to: tenant.email,
      subject: subject,
      html: html
    });

    console.log(`📧 Email désabonnement envoyé à ${tenant.email}`);

    // Marquer comme notifié
    await execute(
      `UPDATE email_unsubscribes
       SET warning_sent = true, warning_sent_at = NOW()
       WHERE lead_id = $1 AND tenant_id = $2`,
      [lead.id, lead.tenant_id]
    );

  } catch (error) {
    console.error('❌ Erreur notification tenant:', error);
  }
}

// Réabonner un lead (pour admin UNIQUEMENT)
export const resubscribe = async (req, res) => {
  try {
    const { lead_id } = req.params;

    // Vérifier que c'est un admin
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Seul un admin peut réabonner un lead' });
    }

    const lead = await queryOne(
      'SELECT tenant_id, email FROM leads WHERE id = $1',
      [lead_id]
    );

    if (!lead) {
      return res.status(404).json({ error: 'Lead non trouvé' });
    }

    // ===== VÉRIFIER NOMBRE DE RÉABONNEMENTS =====
    // Compter combien de fois ce lead a été désabonné et réabonné
    const unsubscribeHistory = await queryOne(
      `SELECT
        COUNT(*) as total_unsubscribes,
        MAX(unsubscribed_at) as last_unsubscribe
       FROM email_unsubscribes
       WHERE lead_id = $1 AND tenant_id = $2`,
      [lead_id, lead.tenant_id]
    );

    const resubscribeCount = parseInt(unsubscribeHistory.total_unsubscribes) || 0;

    // ===== RÈGLE ANTI-SPAM : BAN APRÈS 3 RÉABONNEMENTS =====
    if (resubscribeCount >= 3) {
      console.error(`🚨 TENTATIVE DE BAN AUTOMATIQUE - Tenant ${lead.tenant_id} a réabonné ${resubscribeCount} fois le lead ${lead.email}`);

      // Bannir le tenant
      await execute(
        `UPDATE tenants
         SET banned = true,
             ban_reason = 'Réabonnement abusif après désabonnement (3+ fois) - Protection anti-spam',
             banned_at = NOW()
         WHERE id = $1`,
        [lead.tenant_id]
      );

      console.error(`🚨 TENANT BANNI: ${lead.tenant_id} - Raison: Réabonnement abusif (${resubscribeCount} réabonnements du même lead)`);

      // Notifier le super admin
      await notifySuperAdminOfBan(lead.tenant_id, resubscribeCount, lead.email);

      return res.status(403).json({
        error: 'COMPTE BANNI AUTOMATIQUEMENT',
        message: `Vous avez réabonné ce lead ${resubscribeCount} fois après désabonnement. Votre compte a été automatiquement banni pour protection anti-spam (RGPD). Contactez support@leadsynch.com pour un déblocage.`
      });
    }

    // Continuer le réabonnement normal
    await execute(
      `UPDATE leads
       SET unsubscribed = false,
           unsubscribed_at = NULL
       WHERE id = $1`,
      [lead_id]
    );

    // NE PAS supprimer l'historique - garder pour tracking
    // await execute(
    //   'DELETE FROM email_unsubscribes WHERE lead_id = $1 AND tenant_id = $2',
    //   [lead_id, lead.tenant_id]
    // );

    console.log(`⚠️ Resubscribe: lead ${lead_id} (${resubscribeCount + 1}ème réabonnement) - Attention: ${3 - resubscribeCount - 1} essais restants avant BAN`);

    res.json({
      message: 'Lead réabonné avec succès',
      warning: resubscribeCount >= 2 ? `⚠️ ATTENTION: C'est votre ${resubscribeCount + 1}ème réabonnement de ce lead. Au 3ème, votre compte sera automatiquement banni.` : null,
      resubscribe_count: resubscribeCount + 1,
      remaining_attempts: Math.max(0, 3 - resubscribeCount - 1)
    });
  } catch (error) {
    console.error('Erreur resubscribe:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Notifier super admin d'un ban automatique
 */
async function notifySuperAdminOfBan(tenantId, resubscribeCount, leadEmail) {
  try {
    const tenant = await queryOne(
      'SELECT name, email FROM tenants WHERE id = $1',
      [tenantId]
    );

    if (!tenant) return;

    const subject = '🚨 BAN AUTOMATIQUE - Réabonnement abusif détecté';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #d32f2f; color: white; padding: 20px; text-align: center;">
          <h1>🚨 BAN AUTOMATIQUE</h1>
        </div>

        <div style="padding: 30px; background: #f9f9f9;">
          <h2>Protection Anti-Spam Activée</h2>

          <p style="font-size: 16px; line-height: 1.6;">
            Un tenant a été automatiquement banni pour réabonnement abusif :
          </p>

          <div style="background: white; border-left: 4px solid #d32f2f; padding: 15px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Tenant ID :</strong> ${tenantId}</p>
            <p style="margin: 5px 0;"><strong>Nom :</strong> ${tenant.name}</p>
            <p style="margin: 5px 0;"><strong>Email :</strong> ${tenant.email}</p>
            <p style="margin: 5px 0;"><strong>Lead réabonné ${resubscribeCount} fois :</strong> ${leadEmail}</p>
          </div>

          <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <h3 style="margin-top: 0; color: #856404;">📋 Règle appliquée</h3>
            <p style="color: #856404; margin: 0;">
              Après 3 réabonnements du même lead désabonné, le compte est automatiquement banni pour protection anti-spam et conformité RGPD.
            </p>
          </div>

          <p style="font-size: 14px; color: #999; margin-top: 30px;">
            LeadSynch - Protection Anti-Spam Automatique<br>
            Cet email est automatique.
          </p>
        </div>
      </div>
    `;

    // Envoyer à support@leadsynch.com
    await sendEmail({
      to: 'support@leadsynch.com',
      subject: subject,
      html: html
    });

    console.log(`📧 Notification de ban envoyée à support@leadsynch.com`);

  } catch (error) {
    console.error('❌ Erreur notification ban:', error);
  }
}

// Stats désabonnements (par tenant)
export const getUnsubscribeStats = async (req, res) => {
  try {
    const tenant_id = req.user?.tenant_id;

    if (!tenant_id) {
      return res.status(400).json({ error: 'tenant_id manquant' });
    }

    const result = await queryOne(`
      SELECT
        COUNT(*) as total_unsubscribes,
        COUNT(*) FILTER (WHERE unsubscribed_at > NOW() - INTERVAL '7 days') as last_7_days,
        COUNT(*) FILTER (WHERE unsubscribed_at > NOW() - INTERVAL '30 days') as last_30_days,
        COUNT(*) FILTER (WHERE warning_sent = true) as warnings_sent
      FROM email_unsubscribes
      WHERE tenant_id = $1
    `, [tenant_id]);

    res.json({ stats: result });
  } catch (error) {
    console.error('Erreur stats:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Liste des emails désabonnés (pour le tenant)
export const getUnsubscribedEmails = async (req, res) => {
  try {
    const tenant_id = req.user?.tenant_id;

    if (!tenant_id) {
      return res.status(400).json({ error: 'tenant_id manquant' });
    }

    const unsubscribed = await queryAll(
      `SELECT
        eu.email,
        eu.reason,
        eu.unsubscribed_at,
        l.company_name,
        l.contact_name
       FROM email_unsubscribes eu
       LEFT JOIN leads l ON eu.lead_id = l.id
       WHERE eu.tenant_id = $1
       ORDER BY eu.unsubscribed_at DESC`,
      [tenant_id]
    );

    res.json({
      success: true,
      unsubscribed: unsubscribed,
      count: unsubscribed.length
    });

  } catch (error) {
    console.error('Erreur getUnsubscribedEmails:', error);
    res.status(500).json({ error: error.message });
  }
};

export default {
  getUnsubscribePage,
  processUnsubscribe,
  resubscribe,
  getUnsubscribeStats,
  getUnsubscribedEmails
};
