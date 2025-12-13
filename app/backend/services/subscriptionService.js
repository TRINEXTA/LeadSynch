/**
 * Service de gestion des abonnements et quotas
 * Gère les quotas prospects, emails, crédits
 */

import { queryOne, queryAll, execute } from '../lib/db.js';

/**
 * Récupérer le résumé des quotas d'un tenant
 */
export async function getQuotaSummary(tenantId) {
  const result = await queryOne(`
    SELECT
      t.id AS tenant_id,
      t.company_name,
      sp.name AS plan_name,
      sp.slug AS plan_slug,
      sp.price_monthly,
      ts.usage_mode,

      -- Quotas selon le mode
      CASE
        WHEN ts.usage_mode = 'own_base' THEN 0
        ELSE sp.prospects_quota
      END AS prospects_quota,

      CASE
        WHEN ts.usage_mode = 'own_base' THEN sp.own_base_emails_campaign_quota
        ELSE sp.emails_campaign_quota
      END AS emails_campaign_quota,

      CASE
        WHEN ts.usage_mode = 'own_base' THEN sp.own_base_emails_followup_quota
        ELSE sp.emails_followup_quota
      END AS emails_followup_quota,

      -- Utilisés
      COALESCE(ts.prospects_used, 0) AS prospects_used,
      COALESCE(ts.emails_campaign_used, 0) AS emails_campaign_used,
      COALESCE(ts.emails_followup_used, 0) AS emails_followup_used,

      -- Crédits
      COALESCE(tc.prospects_balance, 0) AS credits_balance,

      -- Période
      ts.period_start,
      ts.period_end,
      ts.status AS subscription_status

    FROM tenants t
    LEFT JOIN tenant_subscriptions ts ON t.id = ts.tenant_id
    LEFT JOIN subscription_plans sp ON ts.plan_id = sp.id
    LEFT JOIN tenant_credits tc ON t.id = tc.tenant_id
    WHERE t.id = $1
  `, [tenantId]);

  if (!result) {
    return null;
  }

  // Calculer les quotas restants
  const prospectsQuota = result.prospects_quota === -1 ? Infinity : result.prospects_quota;
  const emailsCampaignQuota = result.emails_campaign_quota === -1 ? Infinity : result.emails_campaign_quota;
  const emailsFollowupQuota = result.emails_followup_quota === -1 ? Infinity : result.emails_followup_quota;

  return {
    ...result,
    prospects_remaining: prospectsQuota === Infinity ? -1 : Math.max(0, prospectsQuota - result.prospects_used),
    emails_campaign_remaining: emailsCampaignQuota === Infinity ? -1 : Math.max(0, emailsCampaignQuota - result.emails_campaign_used),
    emails_followup_remaining: emailsFollowupQuota === Infinity ? -1 : Math.max(0, emailsFollowupQuota - result.emails_followup_used),
    is_unlimited: result.plan_slug === 'enterprise'
  };
}

/**
 * Vérifier si un tenant peut générer X prospects
 */
export async function canGenerateProspects(tenantId, quantity) {
  const quota = await getQuotaSummary(tenantId);

  if (!quota) {
    return { allowed: false, reason: 'Aucun abonnement actif' };
  }

  if (quota.subscription_status !== 'active') {
    return { allowed: false, reason: 'Abonnement inactif' };
  }

  if (quota.usage_mode === 'own_base') {
    // Mode "Sa Base" - vérifier les crédits
    if (quota.credits_balance >= quantity) {
      return { allowed: true, source: 'credits', available: quota.credits_balance };
    }
    return {
      allowed: false,
      reason: 'Mode "Sa Base" actif. Achetez des crédits pour générer des prospects.',
      credits_needed: quantity - quota.credits_balance
    };
  }

  // Mode "Notre Base" ou "Mixte"
  if (quota.prospects_remaining === -1) {
    return { allowed: true, source: 'unlimited', available: Infinity };
  }

  if (quota.prospects_remaining >= quantity) {
    return { allowed: true, source: 'quota', available: quota.prospects_remaining };
  }

  // Pas assez de quota - vérifier les crédits
  const fromQuota = quota.prospects_remaining;
  const fromCredits = Math.min(quota.credits_balance, quantity - fromQuota);

  if (fromQuota + fromCredits >= quantity) {
    return {
      allowed: true,
      source: 'mixed',
      from_quota: fromQuota,
      from_credits: fromCredits
    };
  }

  return {
    allowed: false,
    reason: `Quota insuffisant. Disponible: ${quota.prospects_remaining} + ${quota.credits_balance} crédits`,
    available: quota.prospects_remaining + quota.credits_balance,
    needed: quantity
  };
}

/**
 * Vérifier si un tenant peut envoyer X emails de campagne
 */
export async function canSendCampaignEmails(tenantId, quantity) {
  const quota = await getQuotaSummary(tenantId);

  if (!quota) {
    return { allowed: false, reason: 'Aucun abonnement actif' };
  }

  if (quota.subscription_status !== 'active') {
    return { allowed: false, reason: 'Abonnement inactif' };
  }

  if (quota.emails_campaign_remaining === -1) {
    return { allowed: true, available: Infinity };
  }

  if (quota.emails_campaign_remaining >= quantity) {
    return { allowed: true, available: quota.emails_campaign_remaining };
  }

  return {
    allowed: false,
    reason: `Quota emails campagne insuffisant`,
    available: quota.emails_campaign_remaining,
    needed: quantity
  };
}

/**
 * Vérifier si un tenant peut envoyer X emails de relance
 */
export async function canSendFollowupEmails(tenantId, quantity) {
  const quota = await getQuotaSummary(tenantId);

  if (!quota) {
    return { allowed: false, reason: 'Aucun abonnement actif' };
  }

  if (quota.emails_followup_remaining === -1) {
    return { allowed: true, available: Infinity };
  }

  if (quota.emails_followup_remaining >= quantity) {
    return { allowed: true, available: quota.emails_followup_remaining };
  }

  return {
    allowed: false,
    reason: `Quota emails relance insuffisant`,
    available: quota.emails_followup_remaining,
    needed: quantity
  };
}

/**
 * Consommer des prospects du quota
 */
export async function consumeProspects(tenantId, quantity, source = 'generation') {
  const check = await canGenerateProspects(tenantId, quantity);

  if (!check.allowed) {
    throw new Error(check.reason);
  }

  if (check.source === 'credits') {
    // Déduire des crédits uniquement
    await deductCredits(tenantId, quantity, source);
  } else if (check.source === 'mixed') {
    // Déduire du quota + crédits
    await execute(`
      UPDATE tenant_subscriptions
      SET prospects_used = prospects_used + $2, updated_at = NOW()
      WHERE tenant_id = $1
    `, [tenantId, check.from_quota]);

    if (check.from_credits > 0) {
      await deductCredits(tenantId, check.from_credits, source);
    }
  } else if (check.source === 'quota') {
    // Déduire du quota uniquement
    await execute(`
      UPDATE tenant_subscriptions
      SET prospects_used = prospects_used + $2, updated_at = NOW()
      WHERE tenant_id = $1
    `, [tenantId, quantity]);
  }
  // Si unlimited, ne rien déduire

  return { consumed: quantity, source: check.source };
}

/**
 * Consommer des emails de campagne
 */
export async function consumeCampaignEmails(tenantId, quantity) {
  const check = await canSendCampaignEmails(tenantId, quantity);

  if (!check.allowed) {
    throw new Error(check.reason);
  }

  if (check.available !== Infinity) {
    await execute(`
      UPDATE tenant_subscriptions
      SET emails_campaign_used = emails_campaign_used + $2, updated_at = NOW()
      WHERE tenant_id = $1
    `, [tenantId, quantity]);
  }

  return { consumed: quantity };
}

/**
 * Consommer des emails de relance
 */
export async function consumeFollowupEmails(tenantId, quantity) {
  const check = await canSendFollowupEmails(tenantId, quantity);

  if (!check.allowed) {
    throw new Error(check.reason);
  }

  if (check.available !== Infinity) {
    await execute(`
      UPDATE tenant_subscriptions
      SET emails_followup_used = emails_followup_used + $2, updated_at = NOW()
      WHERE tenant_id = $1
    `, [tenantId, quantity]);
  }

  return { consumed: quantity };
}

/**
 * Changer le mode d'utilisation (our_base, own_base, mixed)
 */
export async function setUsageMode(tenantId, mode) {
  const validModes = ['our_base', 'own_base', 'mixed'];
  if (!validModes.includes(mode)) {
    throw new Error(`Mode invalide. Valeurs acceptées: ${validModes.join(', ')}`);
  }

  await execute(`
    UPDATE tenant_subscriptions
    SET usage_mode = $2, updated_at = NOW()
    WHERE tenant_id = $1
  `, [tenantId, mode]);

  return { mode };
}

/**
 * Ajouter des crédits (achat)
 */
export async function addCredits(tenantId, quantity, priceTotal, paymentRef = null) {
  const pricePerProspect = priceTotal / quantity;

  // Mettre à jour le solde
  await execute(`
    INSERT INTO tenant_credits (tenant_id, prospects_balance, total_purchased)
    VALUES ($1, $2, $2)
    ON CONFLICT (tenant_id) DO UPDATE SET
      prospects_balance = tenant_credits.prospects_balance + $2,
      total_purchased = tenant_credits.total_purchased + $2,
      updated_at = NOW()
  `, [tenantId, quantity]);

  // Enregistrer l'achat
  const purchase = await execute(`
    INSERT INTO credit_purchases (tenant_id, prospects_quantity, price_paid, price_per_prospect, payment_method, payment_reference)
    VALUES ($1, $2, $3, $4, 'stripe', $5)
    RETURNING *
  `, [tenantId, quantity, priceTotal, pricePerProspect, paymentRef]);

  // Enregistrer la transaction
  const balance = await getCreditsBalance(tenantId);
  await execute(`
    INSERT INTO credit_transactions (tenant_id, transaction_type, prospects_amount, description, balance_after)
    VALUES ($1, 'purchase', $2, $3, $4)
  `, [tenantId, quantity, `Achat de ${quantity} crédits`, balance]);

  return { quantity, balance, purchase };
}

/**
 * Déduire des crédits (utilisation)
 */
export async function deductCredits(tenantId, quantity, reason = 'generation') {
  const currentBalance = await getCreditsBalance(tenantId);

  if (currentBalance < quantity) {
    throw new Error(`Crédits insuffisants. Solde: ${currentBalance}, Requis: ${quantity}`);
  }

  await execute(`
    UPDATE tenant_credits
    SET
      prospects_balance = prospects_balance - $2,
      total_used = total_used + $2,
      updated_at = NOW()
    WHERE tenant_id = $1
  `, [tenantId, quantity]);

  const newBalance = currentBalance - quantity;

  await execute(`
    INSERT INTO credit_transactions (tenant_id, transaction_type, prospects_amount, description, balance_after)
    VALUES ($1, 'usage', $2, $3, $4)
  `, [tenantId, -quantity, `Utilisation: ${reason}`, newBalance]);

  return { deducted: quantity, balance: newBalance };
}

/**
 * Obtenir le solde de crédits
 */
export async function getCreditsBalance(tenantId) {
  const result = await queryOne(`
    SELECT COALESCE(prospects_balance, 0) AS balance
    FROM tenant_credits
    WHERE tenant_id = $1
  `, [tenantId]);

  return result?.balance || 0;
}

/**
 * Obtenir l'historique des transactions de crédits
 */
export async function getCreditTransactions(tenantId, limit = 50) {
  return await queryAll(`
    SELECT *
    FROM credit_transactions
    WHERE tenant_id = $1
    ORDER BY created_at DESC
    LIMIT $2
  `, [tenantId, limit]);
}

/**
 * Obtenir tous les plans disponibles
 */
export async function getAvailablePlans() {
  return await queryAll(`
    SELECT
      id, name, slug, price_monthly,
      prospects_quota, emails_campaign_quota, emails_followup_quota,
      own_base_emails_campaign_quota, own_base_emails_followup_quota,
      features, display_order
    FROM subscription_plans
    WHERE is_active = true
    ORDER BY display_order
  `);
}

/**
 * Changer de plan
 */
export async function changePlan(tenantId, planSlug) {
  const plan = await queryOne(`
    SELECT id FROM subscription_plans WHERE slug = $1 AND is_active = true
  `, [planSlug]);

  if (!plan) {
    throw new Error('Plan non trouvé');
  }

  await execute(`
    UPDATE tenant_subscriptions
    SET
      plan_id = $2,
      updated_at = NOW()
    WHERE tenant_id = $1
  `, [tenantId, plan.id]);

  return await getQuotaSummary(tenantId);
}

/**
 * Reset mensuel des quotas (à appeler via cron job)
 */
export async function resetMonthlyQuotas() {
  // Archiver l'utilisation
  await execute(`
    INSERT INTO subscription_usage_history (
      tenant_id, period_year, period_month, plan_id, plan_name,
      prospects_used, emails_campaign_used, emails_followup_used, usage_mode
    )
    SELECT
      ts.tenant_id,
      EXTRACT(YEAR FROM ts.period_start)::INT,
      EXTRACT(MONTH FROM ts.period_start)::INT,
      ts.plan_id,
      sp.name,
      ts.prospects_used,
      ts.emails_campaign_used,
      ts.emails_followup_used,
      ts.usage_mode
    FROM tenant_subscriptions ts
    JOIN subscription_plans sp ON ts.plan_id = sp.id
    WHERE ts.period_end <= CURRENT_DATE
    ON CONFLICT (tenant_id, period_year, period_month) DO NOTHING
  `);

  // Reset les quotas
  const result = await execute(`
    UPDATE tenant_subscriptions
    SET
      prospects_used = 0,
      emails_campaign_used = 0,
      emails_followup_used = 0,
      period_start = CURRENT_DATE,
      period_end = CURRENT_DATE + INTERVAL '1 month',
      updated_at = NOW()
    WHERE period_end <= CURRENT_DATE
      AND status = 'active'
  `);

  return { reset: true, affected: result?.rowCount || 0 };
}

export default {
  getQuotaSummary,
  canGenerateProspects,
  canSendCampaignEmails,
  canSendFollowupEmails,
  consumeProspects,
  consumeCampaignEmails,
  consumeFollowupEmails,
  setUsageMode,
  addCredits,
  deductCredits,
  getCreditsBalance,
  getCreditTransactions,
  getAvailablePlans,
  changePlan,
  resetMonthlyQuotas
};
