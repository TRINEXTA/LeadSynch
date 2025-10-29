import { authMiddleware } from '../middleware/auth.js';
import { queryAll } from '../lib/db.js';

async function handler(req, res) {
  const tenant_id = req.user.tenant_id;

  try {
    // GET /api/quotas - Vérifier les quotas disponibles
    if (req.method === 'GET') {
      const quotas = await queryAll(
        `SELECT 
          s.plan,
          s.google_leads_quota,
          s.google_leads_used,
          (s.google_leads_quota - s.google_leads_used + 
           COALESCE(SUM(p.google_leads_remaining), 0)) AS google_leads_available,
          
          s.emails_quota,
          s.emails_used,
          (s.emails_quota - s.emails_used + 
           COALESCE(SUM(p.emails_remaining), 0)) AS emails_available,
          
          s.local_leads_quota,
          s.local_leads_used,
          CASE 
            WHEN s.local_leads_quota = -1 THEN -1
            ELSE (s.local_leads_quota - s.local_leads_used)
          END AS local_leads_available,
          
          s.campaigns_quota,
          s.active_campaigns,
          (s.campaigns_quota - s.active_campaigns) AS campaigns_available,
          
          s.current_period_end
        FROM subscriptions s
        LEFT JOIN one_shot_packs p ON s.tenant_id = p.tenant_id 
          AND p.status = 'active' 
          AND p.expires_at >= CURRENT_DATE
        WHERE s.tenant_id = $1
        GROUP BY s.tenant_id, s.plan, s.google_leads_quota, s.google_leads_used,
                 s.emails_quota, s.emails_used, s.local_leads_quota, 
                 s.local_leads_used, s.campaigns_quota, s.active_campaigns,
                 s.current_period_end`,
        [tenant_id]
      );

      if (quotas.length === 0) {
        return res.status(404).json({ 
          error: 'Aucun abonnement trouvé',
          suggestion: 'Contactez le support'
        });
      }

      const quota = quotas[0];

      // Calculer les pourcentages
      const googlePercentage = quota.google_leads_quota > 0 
        ? Math.round((quota.google_leads_used / quota.google_leads_quota) * 100)
        : 0;
      
      const emailsPercentage = quota.emails_quota > 0
        ? Math.round((quota.emails_used / quota.emails_quota) * 100)
        : 0;

      return res.json({
        success: true,
        plan: quota.plan,
        quotas: {
          google_leads: {
            quota: quota.google_leads_quota,
            used: quota.google_leads_used,
            available: quota.google_leads_available,
            percentage: googlePercentage
          },
          emails: {
            quota: quota.emails_quota,
            used: quota.emails_used,
            available: quota.emails_available,
            percentage: emailsPercentage
          },
          local_leads: {
            quota: quota.local_leads_quota,
            used: quota.local_leads_used,
            available: quota.local_leads_available,
            unlimited: quota.local_leads_quota === -1
          },
          campaigns: {
            quota: quota.campaigns_quota,
            active: quota.active_campaigns,
            available: quota.campaigns_available
          }
        },
        period_end: quota.current_period_end,
        alerts: generateAlerts(quota)
      });
    }

    // POST /api/quotas/check - Vérifier si une action est possible
    if (req.method === 'POST' && req.url.includes('/check')) {
      const { action, quantity } = req.body;

      if (!action || !quantity) {
        return res.status(400).json({ error: 'action et quantity requis' });
      }

      const quotas = await queryAll(
        `SELECT 
          s.*,
          COALESCE(SUM(p.google_leads_remaining), 0) AS pack_google_leads,
          COALESCE(SUM(p.emails_remaining), 0) AS pack_emails
        FROM subscriptions s
        LEFT JOIN one_shot_packs p ON s.tenant_id = p.tenant_id 
          AND p.status = 'active' 
          AND p.expires_at >= CURRENT_DATE
        WHERE s.tenant_id = $1
        GROUP BY s.id`,
        [tenant_id]
      );

      if (quotas.length === 0) {
        return res.status(404).json({ 
          error: 'Aucun abonnement trouvé' 
        });
      }

      const quota = quotas[0];
      let allowed = false;
      let message = '';
      let remaining = 0;

      switch (action) {
        case 'google_leads':
          remaining = (quota.google_leads_quota - quota.google_leads_used) + quota.pack_google_leads;
          allowed = remaining >= quantity;
          message = allowed 
            ? `✅ Vous pouvez générer ${quantity} leads Google Maps`
            : `❌ Quota insuffisant. Reste: ${remaining} / Demandé: ${quantity}`;
          break;

        case 'emails':
          remaining = (quota.emails_quota - quota.emails_used) + quota.pack_emails;
          allowed = remaining >= quantity;
          message = allowed
            ? `✅ Vous pouvez envoyer ${quantity} emails`
            : `❌ Quota insuffisant. Reste: ${remaining} / Demandé: ${quantity}`;
          break;

        case 'local_leads':
          if (quota.local_leads_quota === -1) {
            allowed = true;
            message = '✅ Leads locaux illimités';
          } else {
            remaining = quota.local_leads_quota - quota.local_leads_used;
            allowed = remaining >= quantity;
            message = allowed
              ? `✅ Vous pouvez utiliser ${quantity} leads locaux`
              : `❌ Quota insuffisant. Reste: ${remaining} / Demandé: ${quantity}`;
          }
          break;

        case 'campaign':
          remaining = quota.campaigns_quota - quota.active_campaigns;
          allowed = remaining > 0;
          message = allowed
            ? `✅ Vous pouvez créer ${remaining} campagne(s) supplémentaire(s)`
            : `❌ Limite atteinte (${quota.active_campaigns}/${quota.campaigns_quota})`;
          break;

        default:
          return res.status(400).json({ error: 'Action non reconnue' });
      }

      return res.json({
        success: true,
        allowed,
        message,
        remaining,
        plan: quota.plan,
        upgrade_suggestion: !allowed ? getUpgradeSuggestion(quota.plan, action) : null
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Quotas error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}

function generateAlerts(quota) {
  const alerts = [];

  // Alerte Google Leads
  const googlePercentage = (quota.google_leads_used / quota.google_leads_quota) * 100;
  if (googlePercentage >= 80) {
    alerts.push({
      type: 'warning',
      category: 'google_leads',
      message: `⚠️ ${quota.google_leads_used}/${quota.google_leads_quota} leads Google utilisés (${Math.round(googlePercentage)}%)`
    });
  }

  // Alerte Emails
  const emailsPercentage = (quota.emails_used / quota.emails_quota) * 100;
  if (emailsPercentage >= 80) {
    alerts.push({
      type: 'warning',
      category: 'emails',
      message: `⚠️ ${quota.emails_used}/${quota.emails_quota} emails utilisés (${Math.round(emailsPercentage)}%)`
    });
  }

  // Alerte Campagnes
  if (quota.active_campaigns >= quota.campaigns_quota) {
    alerts.push({
      type: 'error',
      category: 'campaigns',
      message: `🛑 Limite campagnes atteinte (${quota.active_campaigns}/${quota.campaigns_quota})`
    });
  }

  return alerts;
}

function getUpgradeSuggestion(currentPlan, action) {
  const suggestions = {
    'free': 'Upgrade vers Starter (29€/mois) pour débloquer plus de ressources',
    'starter': 'Upgrade vers Pro (79€/mois) pour 1000 leads + 20k emails',
    'pro': 'Upgrade vers Business (199€/mois) pour des quotas illimités'
  };

  return suggestions[currentPlan] || 'Contactez-nous pour un plan personnalisé';
}

export default authMiddleware(handler);
