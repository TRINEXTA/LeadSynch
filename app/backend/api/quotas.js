import { authMiddleware } from '../middleware/auth.js';
import { queryAll, queryOne } from '../lib/db.js';

// Définition des quotas par plan
const PLAN_QUOTAS = {
  'FREE': {
    google_leads_quota: 10,
    emails_quota: 100,
    local_leads_quota: 50,
    campaigns_quota: 1
  },
  'STARTER': {
    google_leads_quota: 100,
    emails_quota: 1000,
    local_leads_quota: 500,
    campaigns_quota: 5
  },
  'PRO': {
    google_leads_quota: 500,
    emails_quota: 5000,
    local_leads_quota: 2000,
    campaigns_quota: 20
  },
  'BUSINESS': {
    google_leads_quota: -1,  // illimité
    emails_quota: -1,         // illimité
    local_leads_quota: -1,    // illimité
    campaigns_quota: -1       // illimité
  }
};

async function handler(req, res) {
  const tenant_id = req.user.tenant_id;

  try {
    // GET /api/quotas - Vérifier les quotas disponibles
    if (req.method === 'GET') {
      // Récupérer le plan du tenant
      const tenant = await queryOne(
        `SELECT plan, subscription_status FROM tenants WHERE id = $1`,
        [tenant_id]
      );

      if (!tenant) {
        return res.status(404).json({
          error: 'Tenant non trouvé'
        });
      }

      const plan = tenant.plan || 'FREE';
      const quotas = PLAN_QUOTAS[plan] || PLAN_QUOTAS['FREE'];

      // Calculer l'utilisation réelle depuis les différentes tables

      // 1. Google Leads utilisés (depuis credit_usage avec source = 'google_maps')
      const googleLeadsUsed = await queryOne(
        `SELECT COALESCE(SUM(credits_used), 0) as total
         FROM credit_usage
         WHERE tenant_id = $1 AND source = 'google_maps'
         AND created_at >= DATE_TRUNC('month', CURRENT_DATE)`,
        [tenant_id]
      );

      // 2. Emails utilisés (estimation depuis leads avec status = 'contacted')
      const emailsUsed = await queryOne(
        `SELECT COUNT(*) as total
         FROM leads
         WHERE tenant_id = $1 AND status = 'contacted'
         AND updated_at >= DATE_TRUNC('month', CURRENT_DATE)`,
        [tenant_id]
      );

      // 3. Leads locaux utilisés (leads créés ce mois)
      const localLeadsUsed = await queryOne(
        `SELECT COUNT(*) as total
         FROM leads
         WHERE tenant_id = $1
         AND created_at >= DATE_TRUNC('month', CURRENT_DATE)`,
        [tenant_id]
      );

      // 4. Campagnes actives
      const activeCampaigns = await queryOne(
        `SELECT COUNT(*) as total
         FROM campaigns
         WHERE tenant_id = $1 AND status = 'active'`,
        [tenant_id]
      );

      // Récupérer les crédits achetés disponibles
      const leadCredits = await queryOne(
        `SELECT credits_remaining FROM lead_credits WHERE tenant_id = $1`,
        [tenant_id]
      );

      const bonusCredits = leadCredits?.credits_remaining || 0;

      // Calculer les disponibilités
      const google_used = parseInt(googleLeadsUsed?.total || 0);
      const emails_used = parseInt(emailsUsed?.total || 0);
      const local_used = parseInt(localLeadsUsed?.total || 0);
      const campaigns_active = parseInt(activeCampaigns?.total || 0);

      const google_available = quotas.google_leads_quota === -1
        ? -1
        : Math.max(0, quotas.google_leads_quota - google_used + bonusCredits);

      const emails_available = quotas.emails_quota === -1
        ? -1
        : Math.max(0, quotas.emails_quota - emails_used);

      const local_available = quotas.local_leads_quota === -1
        ? -1
        : Math.max(0, quotas.local_leads_quota - local_used);

      const campaigns_available = quotas.campaigns_quota === -1
        ? -1
        : Math.max(0, quotas.campaigns_quota - campaigns_active);

      // Calculer les pourcentages
      const googlePercentage = quotas.google_leads_quota > 0
        ? Math.round((google_used / quotas.google_leads_quota) * 100)
        : 0;

      const emailsPercentage = quotas.emails_quota > 0
        ? Math.round((emails_used / quotas.emails_quota) * 100)
        : 0;

      // Calculer la date de fin de période
      const period_end = new Date();
      period_end.setMonth(period_end.getMonth() + 1);
      period_end.setDate(1);
      period_end.setDate(period_end.getDate() - 1);

      return res.json({
        success: true,
        plan: plan,
        quotas: {
          google_leads: {
            quota: quotas.google_leads_quota,
            used: google_used,
            available: google_available,
            bonus_credits: bonusCredits,
            percentage: googlePercentage,
            unlimited: quotas.google_leads_quota === -1
          },
          emails: {
            quota: quotas.emails_quota,
            used: emails_used,
            available: emails_available,
            percentage: emailsPercentage,
            unlimited: quotas.emails_quota === -1
          },
          local_leads: {
            quota: quotas.local_leads_quota,
            used: local_used,
            available: local_available,
            unlimited: quotas.local_leads_quota === -1
          },
          campaigns: {
            quota: quotas.campaigns_quota,
            active: campaigns_active,
            available: campaigns_available,
            unlimited: quotas.campaigns_quota === -1
          }
        },
        period_end: period_end.toISOString(),
        alerts: generateAlerts({
          plan,
          google_used,
          google_quota: quotas.google_leads_quota,
          emails_used,
          emails_quota: quotas.emails_quota,
          campaigns_active,
          campaigns_quota: quotas.campaigns_quota
        })
      });
    }

    // POST /api/quotas/check - Vérifier si une action est possible
    if (req.method === 'POST' && req.url.includes('/check')) {
      const { action, quantity } = req.body;

      if (!action || !quantity) {
        return res.status(400).json({ error: 'action et quantity requis' });
      }

      // Récupérer le plan actuel
      const tenant = await queryOne(
        `SELECT plan FROM tenants WHERE id = $1`,
        [tenant_id]
      );

      const plan = tenant?.plan || 'FREE';
      const quotas = PLAN_QUOTAS[plan] || PLAN_QUOTAS['FREE'];

      let allowed = false;
      let message = '';
      let remaining = 0;

      // Récupérer l'utilisation actuelle selon l'action
      switch (action) {
        case 'google_leads': {
          const used = await queryOne(
            `SELECT COALESCE(SUM(credits_used), 0) as total
             FROM credit_usage
             WHERE tenant_id = $1 AND source = 'google_maps'
             AND created_at >= DATE_TRUNC('month', CURRENT_DATE)`,
            [tenant_id]
          );

          const leadCredits = await queryOne(
            `SELECT credits_remaining FROM lead_credits WHERE tenant_id = $1`,
            [tenant_id]
          );

          const bonusCredits = leadCredits?.credits_remaining || 0;

          if (quotas.google_leads_quota === -1) {
            allowed = true;
            message = '✅ Leads Google Maps illimités';
          } else {
            remaining = quotas.google_leads_quota - parseInt(used?.total || 0) + bonusCredits;
            allowed = remaining >= quantity;
            message = allowed
              ? `✅ Vous pouvez générer ${quantity} leads Google Maps`
              : `❌ Quota insuffisant. Reste: ${remaining} / Demandé: ${quantity}`;
          }
          break;
        }

        case 'emails': {
          const used = await queryOne(
            `SELECT COUNT(*) as total
             FROM leads
             WHERE tenant_id = $1 AND status = 'contacted'
             AND updated_at >= DATE_TRUNC('month', CURRENT_DATE)`,
            [tenant_id]
          );

          if (quotas.emails_quota === -1) {
            allowed = true;
            message = '✅ Emails illimités';
          } else {
            remaining = quotas.emails_quota - parseInt(used?.total || 0);
            allowed = remaining >= quantity;
            message = allowed
              ? `✅ Vous pouvez envoyer ${quantity} emails`
              : `❌ Quota insuffisant. Reste: ${remaining} / Demandé: ${quantity}`;
          }
          break;
        }

        case 'local_leads': {
          const used = await queryOne(
            `SELECT COUNT(*) as total
             FROM leads
             WHERE tenant_id = $1
             AND created_at >= DATE_TRUNC('month', CURRENT_DATE)`,
            [tenant_id]
          );

          if (quotas.local_leads_quota === -1) {
            allowed = true;
            message = '✅ Leads locaux illimités';
          } else {
            remaining = quotas.local_leads_quota - parseInt(used?.total || 0);
            allowed = remaining >= quantity;
            message = allowed
              ? `✅ Vous pouvez utiliser ${quantity} leads locaux`
              : `❌ Quota insuffisant. Reste: ${remaining} / Demandé: ${quantity}`;
          }
          break;
        }

        case 'campaign': {
          const active = await queryOne(
            `SELECT COUNT(*) as total
             FROM campaigns
             WHERE tenant_id = $1 AND status = 'active'`,
            [tenant_id]
          );

          if (quotas.campaigns_quota === -1) {
            allowed = true;
            message = '✅ Campagnes illimitées';
          } else {
            remaining = quotas.campaigns_quota - parseInt(active?.total || 0);
            allowed = remaining > 0;
            message = allowed
              ? `✅ Vous pouvez créer ${remaining} campagne(s) supplémentaire(s)`
              : `❌ Limite atteinte (${active?.total}/${quotas.campaigns_quota})`;
          }
          break;
        }

        default:
          return res.status(400).json({ error: 'Action non reconnue' });
      }

      return res.json({
        success: true,
        allowed,
        message,
        remaining,
        plan: plan,
        upgrade_suggestion: !allowed ? getUpgradeSuggestion(plan, action) : null
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Quotas error:', error);
    return res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
}

function generateAlerts(data) {
  const alerts = [];

  // Alerte Google Leads (seulement si pas illimité)
  if (data.google_quota > 0) {
    const googlePercentage = (data.google_used / data.google_quota) * 100;
    if (googlePercentage >= 80) {
      alerts.push({
        type: googlePercentage >= 95 ? 'error' : 'warning',
        category: 'google_leads',
        message: `⚠️ ${data.google_used}/${data.google_quota} leads Google utilisés (${Math.round(googlePercentage)}%)`
      });
    }
  }

  // Alerte Emails (seulement si pas illimité)
  if (data.emails_quota > 0) {
    const emailsPercentage = (data.emails_used / data.emails_quota) * 100;
    if (emailsPercentage >= 80) {
      alerts.push({
        type: emailsPercentage >= 95 ? 'error' : 'warning',
        category: 'emails',
        message: `⚠️ ${data.emails_used}/${data.emails_quota} emails utilisés (${Math.round(emailsPercentage)}%)`
      });
    }
  }

  // Alerte Campagnes (seulement si pas illimité)
  if (data.campaigns_quota > 0 && data.campaigns_active >= data.campaigns_quota) {
    alerts.push({
      type: 'error',
      category: 'campaigns',
      message: `🛑 Limite campagnes atteinte (${data.campaigns_active}/${data.campaigns_quota})`
    });
  }

  return alerts;
}

function getUpgradeSuggestion(currentPlan, action) {
  const suggestions = {
    'FREE': 'Upgrade vers Starter (29€/mois) pour débloquer plus de ressources',
    'STARTER': 'Upgrade vers Pro (79€/mois) pour 500 leads + 5000 emails',
    'PRO': 'Upgrade vers Business (199€/mois) pour des quotas illimités'
  };

  return suggestions[currentPlan] || 'Contactez-nous pour un plan personnalisé';
}

export default authMiddleware(handler);
