-- =====================================================
-- SYSTÈME D'ABONNEMENTS ET QUOTAS - LeadSynch
-- =====================================================
-- Date: 2025-12-13
-- Description: Tables pour gestion des abonnements,
--              quotas, crédits et leads partagés
-- =====================================================

-- 1. PLANS D'ABONNEMENT
-- =====================================================
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  slug VARCHAR(50) NOT NULL UNIQUE,
  price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,

  -- Quotas Mode "Notre Base" (génération)
  prospects_quota INT NOT NULL DEFAULT 0,
  emails_campaign_quota INT NOT NULL DEFAULT 0,
  emails_followup_quota INT NOT NULL DEFAULT 0,

  -- Quotas Mode "Sa Base" (import)
  own_base_emails_campaign_quota INT NOT NULL DEFAULT 0,
  own_base_emails_followup_quota INT NOT NULL DEFAULT 0,

  -- Fonctionnalités
  features JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  display_order INT DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. ABONNEMENTS DES TENANTS
-- =====================================================
CREATE TABLE IF NOT EXISTS tenant_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),

  -- Mode d'utilisation: 'our_base', 'own_base', 'mixed'
  usage_mode VARCHAR(20) DEFAULT 'our_base',

  -- Quotas utilisés ce mois (reset mensuel)
  prospects_used INT DEFAULT 0,
  emails_campaign_used INT DEFAULT 0,
  emails_followup_used INT DEFAULT 0,

  -- Période de facturation
  period_start DATE NOT NULL DEFAULT CURRENT_DATE,
  period_end DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '1 month'),

  -- Statut
  status VARCHAR(20) DEFAULT 'active', -- active, cancelled, expired, suspended

  -- Paiement
  stripe_subscription_id VARCHAR(255),

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(tenant_id)
);

-- 3. CRÉDITS ACHETÉS (prospects à la carte)
-- =====================================================
CREATE TABLE IF NOT EXISTS tenant_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Solde de crédits (prospects)
  prospects_balance INT DEFAULT 0,

  -- Historique total
  total_purchased INT DEFAULT 0,
  total_used INT DEFAULT 0,

  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(tenant_id)
);

-- 4. HISTORIQUE DES ACHATS DE CRÉDITS
-- =====================================================
CREATE TABLE IF NOT EXISTS credit_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Détails achat
  prospects_quantity INT NOT NULL,
  price_paid DECIMAL(10,2) NOT NULL,
  price_per_prospect DECIMAL(10,4) NOT NULL,

  -- Paiement
  payment_method VARCHAR(50), -- stripe, paypal, manual
  payment_reference VARCHAR(255),

  created_at TIMESTAMP DEFAULT NOW()
);

-- 5. TRANSACTIONS DE CRÉDITS (usage)
-- =====================================================
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Type: 'purchase', 'usage', 'refund', 'bonus'
  transaction_type VARCHAR(20) NOT NULL,

  -- Montant (positif = ajout, négatif = retrait)
  prospects_amount INT NOT NULL,

  -- Contexte
  description TEXT,
  reference_id UUID, -- ID de la campagne, génération, etc.
  reference_type VARCHAR(50), -- 'campaign', 'generation', 'import'

  -- Solde après transaction
  balance_after INT NOT NULL,

  created_at TIMESTAMP DEFAULT NOW()
);

-- 6. ACCÈS DES TENANTS AUX LEADS GLOBAUX
-- =====================================================
CREATE TABLE IF NOT EXISTS tenant_lead_access (
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  global_lead_id UUID NOT NULL REFERENCES global_leads(id) ON DELETE CASCADE,

  -- Tracking
  accessed_at TIMESTAMP DEFAULT NOW(),
  source VARCHAR(50), -- 'search', 'generation', 'enrichment'

  -- Comptage quota
  counted_in_quota BOOLEAN DEFAULT TRUE,

  PRIMARY KEY (tenant_id, global_lead_id)
);

-- 7. CONTRIBUTIONS DES TENANTS (enrichissement bidirectionnel)
-- =====================================================
CREATE TABLE IF NOT EXISTS lead_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  global_lead_id UUID NOT NULL REFERENCES global_leads(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Champ enrichi
  field_name VARCHAR(100) NOT NULL, -- 'email', 'phone', 'siret', etc.
  old_value TEXT,
  new_value TEXT NOT NULL,

  -- Validation
  verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP,
  verified_by UUID REFERENCES users(id),

  -- Scoring de confiance
  confidence_score INT DEFAULT 50, -- 0-100

  created_at TIMESTAMP DEFAULT NOW()
);

-- 8. HISTORIQUE D'UTILISATION MENSUELLE
-- =====================================================
CREATE TABLE IF NOT EXISTS subscription_usage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Période
  period_year INT NOT NULL,
  period_month INT NOT NULL,

  -- Plan utilisé
  plan_id UUID REFERENCES subscription_plans(id),
  plan_name VARCHAR(50),

  -- Utilisation finale du mois
  prospects_used INT DEFAULT 0,
  emails_campaign_used INT DEFAULT 0,
  emails_followup_used INT DEFAULT 0,
  credits_used INT DEFAULT 0,

  -- Mode dominant
  usage_mode VARCHAR(20),

  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(tenant_id, period_year, period_month)
);

-- =====================================================
-- INDEX POUR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_tenant ON tenant_subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_status ON tenant_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_period ON tenant_subscriptions(period_end);

CREATE INDEX IF NOT EXISTS idx_tenant_credits_tenant ON tenant_credits(tenant_id);

CREATE INDEX IF NOT EXISTS idx_credit_purchases_tenant ON credit_purchases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_credit_purchases_date ON credit_purchases(created_at);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_tenant ON credit_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON credit_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_date ON credit_transactions(created_at);

CREATE INDEX IF NOT EXISTS idx_tenant_lead_access_tenant ON tenant_lead_access(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_lead_access_lead ON tenant_lead_access(global_lead_id);
CREATE INDEX IF NOT EXISTS idx_tenant_lead_access_date ON tenant_lead_access(accessed_at);

CREATE INDEX IF NOT EXISTS idx_lead_contributions_lead ON lead_contributions(global_lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_contributions_tenant ON lead_contributions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lead_contributions_field ON lead_contributions(field_name);

CREATE INDEX IF NOT EXISTS idx_usage_history_tenant ON subscription_usage_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_usage_history_period ON subscription_usage_history(period_year, period_month);

-- =====================================================
-- INSERTION DES PLANS PAR DÉFAUT
-- =====================================================
INSERT INTO subscription_plans (name, slug, price_monthly, prospects_quota, emails_campaign_quota, emails_followup_quota, own_base_emails_campaign_quota, own_base_emails_followup_quota, features, display_order)
VALUES
  -- Plan Gratuit
  (
    'Gratuit',
    'free',
    0.00,
    15,      -- 15 prospects
    15,      -- 15 emails campagne
    0,       -- 0 relances
    0,       -- Pas de mode "sa base"
    0,
    '{"api_access": false, "export": false, "support": "community"}',
    1
  ),
  -- Plan Starter
  (
    'Starter',
    'starter',
    49.00,
    10000,   -- 10k prospects
    10000,   -- 10k emails campagne
    10000,   -- 10k relances (×10)
    30000,   -- 30k emails si sa base
    10000,   -- 10k relances si sa base
    '{"api_access": true, "export": true, "support": "email", "max_campaigns": 10}',
    2
  ),
  -- Plan Pro
  (
    'Pro',
    'pro',
    99.00,
    30000,   -- 30k prospects
    30000,   -- 30k emails campagne
    20000,   -- 20k relances (×2)
    60000,   -- 60k emails si sa base
    20000,   -- 20k relances si sa base
    '{"api_access": true, "export": true, "support": "priority", "max_campaigns": 50, "dedicated_ip": false}',
    3
  ),
  -- Plan Enterprise
  (
    'Enterprise',
    'enterprise',
    0.00,    -- Sur mesure
    -1,      -- -1 = illimité
    -1,
    -1,
    -1,
    -1,
    '{"api_access": true, "export": true, "support": "dedicated", "max_campaigns": -1, "dedicated_ip": true, "custom": true}',
    4
  )
ON CONFLICT (slug) DO UPDATE SET
  price_monthly = EXCLUDED.price_monthly,
  prospects_quota = EXCLUDED.prospects_quota,
  emails_campaign_quota = EXCLUDED.emails_campaign_quota,
  emails_followup_quota = EXCLUDED.emails_followup_quota,
  own_base_emails_campaign_quota = EXCLUDED.own_base_emails_campaign_quota,
  own_base_emails_followup_quota = EXCLUDED.own_base_emails_followup_quota,
  features = EXCLUDED.features,
  updated_at = NOW();

-- =====================================================
-- TRIGGERS POUR MISE À JOUR AUTOMATIQUE
-- =====================================================

-- Trigger pour updated_at sur subscription_plans
CREATE OR REPLACE FUNCTION update_subscription_plans_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_subscription_plans ON subscription_plans;
CREATE TRIGGER trigger_update_subscription_plans
  BEFORE UPDATE ON subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_plans_timestamp();

-- Trigger pour updated_at sur tenant_subscriptions
CREATE OR REPLACE FUNCTION update_tenant_subscriptions_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_tenant_subscriptions ON tenant_subscriptions;
CREATE TRIGGER trigger_update_tenant_subscriptions
  BEFORE UPDATE ON tenant_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_tenant_subscriptions_timestamp();

-- =====================================================
-- FONCTION: Créer abonnement gratuit pour nouveau tenant
-- =====================================================
CREATE OR REPLACE FUNCTION create_default_subscription()
RETURNS TRIGGER AS $$
DECLARE
  free_plan_id UUID;
BEGIN
  -- Récupérer l'ID du plan gratuit
  SELECT id INTO free_plan_id FROM subscription_plans WHERE slug = 'free' LIMIT 1;

  IF free_plan_id IS NOT NULL THEN
    -- Créer l'abonnement gratuit
    INSERT INTO tenant_subscriptions (tenant_id, plan_id, status)
    VALUES (NEW.id, free_plan_id, 'active')
    ON CONFLICT (tenant_id) DO NOTHING;

    -- Créer le compte de crédits
    INSERT INTO tenant_credits (tenant_id, prospects_balance)
    VALUES (NEW.id, 0)
    ON CONFLICT (tenant_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_default_subscription ON tenants;
CREATE TRIGGER trigger_create_default_subscription
  AFTER INSERT ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION create_default_subscription();

-- =====================================================
-- FONCTION: Reset mensuel des quotas
-- =====================================================
CREATE OR REPLACE FUNCTION reset_monthly_quotas()
RETURNS void AS $$
BEGIN
  -- Archiver l'utilisation du mois précédent
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
  ON CONFLICT (tenant_id, period_year, period_month) DO NOTHING;

  -- Reset les quotas et avancer la période
  UPDATE tenant_subscriptions
  SET
    prospects_used = 0,
    emails_campaign_used = 0,
    emails_followup_used = 0,
    period_start = CURRENT_DATE,
    period_end = CURRENT_DATE + INTERVAL '1 month',
    updated_at = NOW()
  WHERE period_end <= CURRENT_DATE
    AND status = 'active';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VUE: Quotas restants par tenant
-- =====================================================
CREATE OR REPLACE VIEW tenant_quota_summary AS
SELECT
  t.id AS tenant_id,
  t.company_name,
  sp.name AS plan_name,
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
  ts.prospects_used,
  ts.emails_campaign_used,
  ts.emails_followup_used,

  -- Restants
  CASE
    WHEN sp.prospects_quota = -1 THEN -1
    WHEN ts.usage_mode = 'own_base' THEN 0
    ELSE GREATEST(0, sp.prospects_quota - ts.prospects_used)
  END AS prospects_remaining,

  CASE
    WHEN sp.emails_campaign_quota = -1 THEN -1
    ELSE GREATEST(0,
      CASE
        WHEN ts.usage_mode = 'own_base' THEN sp.own_base_emails_campaign_quota
        ELSE sp.emails_campaign_quota
      END - ts.emails_campaign_used
    )
  END AS emails_campaign_remaining,

  CASE
    WHEN sp.emails_followup_quota = -1 THEN -1
    ELSE GREATEST(0,
      CASE
        WHEN ts.usage_mode = 'own_base' THEN sp.own_base_emails_followup_quota
        ELSE sp.emails_followup_quota
      END - ts.emails_followup_used
    )
  END AS emails_followup_remaining,

  -- Crédits
  COALESCE(tc.prospects_balance, 0) AS credits_balance,

  -- Période
  ts.period_start,
  ts.period_end,
  ts.status

FROM tenants t
LEFT JOIN tenant_subscriptions ts ON t.id = ts.tenant_id
LEFT JOIN subscription_plans sp ON ts.plan_id = sp.id
LEFT JOIN tenant_credits tc ON t.id = tc.tenant_id;

-- =====================================================
-- COMMENTAIRES
-- =====================================================
COMMENT ON TABLE subscription_plans IS 'Plans d''abonnement disponibles (Gratuit, Starter, Pro, Enterprise)';
COMMENT ON TABLE tenant_subscriptions IS 'Abonnement actif de chaque tenant avec utilisation mensuelle';
COMMENT ON TABLE tenant_credits IS 'Solde de crédits (prospects) achetés à la carte';
COMMENT ON TABLE credit_purchases IS 'Historique des achats de crédits';
COMMENT ON TABLE credit_transactions IS 'Toutes les transactions de crédits (achats, usage, refunds)';
COMMENT ON TABLE tenant_lead_access IS 'Tracking des leads globaux accessibles par chaque tenant';
COMMENT ON TABLE lead_contributions IS 'Enrichissements apportés par les tenants (bidirectionnel)';
COMMENT ON VIEW tenant_quota_summary IS 'Vue résumée des quotas et utilisation par tenant';

SELECT 'Migration subscription_system completed successfully!' AS status;
