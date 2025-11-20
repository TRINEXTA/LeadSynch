-- ================================================================
-- MIGRATION : Système Super-Admin TRINEXTA
-- Description : Gestion complète des clients, abonnements, facturation
-- Date : 2025-11-20
-- ================================================================

-- ========================================
-- 1. PLANS D'ABONNEMENT LEADSYNCH
-- ========================================
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL, -- 'trial', 'starter', 'pro', 'enterprise', 'custom'
  description TEXT,

  -- Tarification
  price_monthly DECIMAL(10, 2),
  price_yearly DECIMAL(10, 2),

  -- Features & Quotas (JSONB pour flexibilité)
  features JSONB NOT NULL DEFAULT '{
    "max_leads": 1000,
    "max_users": 3,
    "max_campaigns": 10,
    "max_databases": 5,
    "max_emails_per_month": 5000,
    "ai_generation": true,
    "advanced_analytics": false,
    "priority_support": false,
    "white_label": false,
    "api_access": false
  }'::jsonb,

  -- Visibilité
  is_active BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT true, -- Visible sur la page pricing
  sort_order INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON subscription_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_slug ON subscription_plans(slug);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_subscription_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_subscription_plans_updated_at
  BEFORE UPDATE ON subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_plans_updated_at();

-- ========================================
-- 2. EXTENSION TABLE TENANTS
-- ========================================
-- Ajout colonnes pour gestion abonnement
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'trial';
-- Statuts possibles: 'trial', 'active', 'suspended', 'expired', 'cancelled'

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS current_plan_id UUID REFERENCES subscription_plans(id);

-- Infos facturation
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS billing_email VARCHAR(255);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS company_siret VARCHAR(20);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS company_vat VARCHAR(20);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS company_address TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS company_postal_code VARCHAR(10);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS company_city VARCHAR(100);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS company_country VARCHAR(50) DEFAULT 'France';

-- Métadonnées
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS notes TEXT; -- Notes internes TRINEXTA
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS tags JSONB; -- Tags pour segmentation

-- Index
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_trial_ends_at ON tenants(trial_ends_at);
CREATE INDEX IF NOT EXISTS idx_tenants_current_plan ON tenants(current_plan_id);

-- ========================================
-- 3. ABONNEMENTS DES TENANTS
-- ========================================
CREATE TABLE IF NOT EXISTS tenant_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),

  -- Statut de l'abonnement
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  -- Statuts: 'active', 'suspended', 'expired', 'cancelled', 'pending'

  -- Dates
  start_date DATE NOT NULL,
  end_date DATE,
  trial_ends_at TIMESTAMP,
  cancelled_at TIMESTAMP,

  -- Facturation
  billing_cycle VARCHAR(20) NOT NULL, -- 'monthly', 'yearly'
  price DECIMAL(10, 2) NOT NULL, -- Prix négocié (peut différer du plan)
  currency VARCHAR(3) DEFAULT 'EUR',
  auto_renew BOOLEAN DEFAULT true,

  -- Revenus
  mrr DECIMAL(10, 2), -- Monthly Recurring Revenue
  arr DECIMAL(10, 2), -- Annual Recurring Revenue

  -- Métadonnées
  metadata JSONB, -- Infos custom (remises, etc.)
  notes TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_tenant ON tenant_subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_plan ON tenant_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_status ON tenant_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_end_date ON tenant_subscriptions(end_date);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_tenant_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_tenant_subscriptions_updated_at
  BEFORE UPDATE ON tenant_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_tenant_subscriptions_updated_at();

-- ========================================
-- 4. FACTURES
-- ========================================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES tenant_subscriptions(id),

  -- Numérotation
  invoice_number VARCHAR(50) UNIQUE NOT NULL, -- Format: INV-2025-001

  -- Montants
  subtotal DECIMAL(10, 2) NOT NULL,
  tax_rate DECIMAL(5, 2) DEFAULT 20.00, -- TVA 20%
  tax_amount DECIMAL(10, 2),
  total DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'EUR',

  -- Statut
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  -- Statuts: 'draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled', 'refunded'

  -- Dates
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  paid_at TIMESTAMP,

  -- Lignes de facture (JSONB)
  items JSONB NOT NULL, -- [{description, quantity, unit_price, total}, ...]

  -- Paiement
  payment_method VARCHAR(50), -- 'stripe', 'paypal', 'bank_transfer', 'check', 'cash'
  payment_reference VARCHAR(255),

  -- PDF
  pdf_url TEXT,

  -- Métadonnées
  notes TEXT,
  metadata JSONB,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_subscription ON invoices(subscription_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_invoices_updated_at();

-- ========================================
-- 5. PAIEMENTS
-- ========================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES invoices(id),

  -- Montant
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'EUR',

  -- Méthode
  method VARCHAR(50) NOT NULL, -- 'stripe', 'paypal', 'bank_transfer', 'check', 'cash'

  -- Statut
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  -- Statuts: 'pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'

  -- Références externes
  transaction_id VARCHAR(255), -- ID Stripe/PayPal
  gateway_response JSONB, -- Réponse complète de la gateway

  -- Dates
  paid_at TIMESTAMP,
  refunded_at TIMESTAMP,

  -- Métadonnées
  notes TEXT,
  metadata JSONB,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_payments_tenant ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments(transaction_id);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_payments_updated_at();

-- ========================================
-- 6. EXTENSION TABLE USERS - SUPER ADMIN
-- ========================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS super_admin_permissions JSONB;

-- Index
CREATE INDEX IF NOT EXISTS idx_users_super_admin ON users(is_super_admin);

-- ========================================
-- 7. LOG ACTIVITÉ SUPER-ADMIN
-- ========================================
CREATE TABLE IF NOT EXISTS super_admin_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),

  -- Action
  action VARCHAR(100) NOT NULL, -- 'create_tenant', 'suspend_tenant', 'create_invoice', etc.
  entity_type VARCHAR(50), -- 'tenant', 'subscription', 'invoice', 'payment'
  entity_id UUID,

  -- Détails
  method VARCHAR(10), -- GET, POST, PATCH, DELETE
  endpoint TEXT,
  changes JSONB, -- Avant/après pour les modifications

  -- Contexte
  ip_address VARCHAR(50),
  user_agent TEXT,

  created_at TIMESTAMP DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_super_admin_log_user ON super_admin_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_super_admin_log_action ON super_admin_activity_log(action);
CREATE INDEX IF NOT EXISTS idx_super_admin_log_entity ON super_admin_activity_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_super_admin_log_created ON super_admin_activity_log(created_at DESC);

-- ========================================
-- 8. INSERTION PLANS PAR DÉFAUT
-- ========================================
INSERT INTO subscription_plans (name, slug, description, price_monthly, price_yearly, features, sort_order, is_public) VALUES
(
  'Essai Gratuit 30 jours',
  'trial',
  'Découvrez LeadSynch gratuitement pendant 30 jours',
  0.00,
  0.00,
  '{
    "max_leads": 100,
    "max_users": 2,
    "max_campaigns": 2,
    "max_databases": 1,
    "max_emails_per_month": 500,
    "ai_generation": true,
    "advanced_analytics": false,
    "priority_support": false,
    "white_label": false,
    "api_access": false
  }'::jsonb,
  0,
  false
),
(
  'Starter',
  'starter',
  'Idéal pour les petites équipes',
  49.00,
  490.00,
  '{
    "max_leads": 1000,
    "max_users": 3,
    "max_campaigns": 10,
    "max_databases": 3,
    "max_emails_per_month": 5000,
    "ai_generation": true,
    "advanced_analytics": false,
    "priority_support": false,
    "white_label": false,
    "api_access": false
  }'::jsonb,
  1,
  true
),
(
  'Pro',
  'pro',
  'Pour les équipes en croissance',
  99.00,
  990.00,
  '{
    "max_leads": 10000,
    "max_users": 10,
    "max_campaigns": 50,
    "max_databases": 10,
    "max_emails_per_month": 25000,
    "ai_generation": true,
    "advanced_analytics": true,
    "priority_support": true,
    "white_label": false,
    "api_access": true
  }'::jsonb,
  2,
  true
),
(
  'Enterprise',
  'enterprise',
  'Solution complète pour grandes entreprises',
  299.00,
  2990.00,
  '{
    "max_leads": -1,
    "max_users": -1,
    "max_campaigns": -1,
    "max_databases": -1,
    "max_emails_per_month": -1,
    "ai_generation": true,
    "advanced_analytics": true,
    "priority_support": true,
    "white_label": true,
    "api_access": true,
    "dedicated_support": true,
    "sla_99_9": true
  }'::jsonb,
  3,
  true
),
(
  'Custom',
  'custom',
  'Plan sur-mesure',
  NULL,
  NULL,
  '{}'::jsonb,
  99,
  false
)
ON CONFLICT (slug) DO NOTHING;

-- ========================================
-- 9. FONCTIONS UTILITAIRES
-- ========================================

-- Générer numéro de facture
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS VARCHAR(50) AS $$
DECLARE
  year INT := EXTRACT(YEAR FROM CURRENT_DATE);
  next_number INT;
  invoice_num VARCHAR(50);
BEGIN
  -- Compter les factures de l'année en cours
  SELECT COUNT(*) + 1 INTO next_number
  FROM invoices
  WHERE EXTRACT(YEAR FROM issue_date) = year;

  -- Format: INV-2025-001
  invoice_num := 'INV-' || year || '-' || LPAD(next_number::TEXT, 3, '0');

  RETURN invoice_num;
END;
$$ LANGUAGE plpgsql;

-- Calculer MRR/ARR
CREATE OR REPLACE FUNCTION calculate_subscription_revenue(
  p_price DECIMAL,
  p_billing_cycle VARCHAR
)
RETURNS TABLE (mrr DECIMAL, arr DECIMAL) AS $$
BEGIN
  IF p_billing_cycle = 'monthly' THEN
    RETURN QUERY SELECT p_price, p_price * 12;
  ELSIF p_billing_cycle = 'yearly' THEN
    RETURN QUERY SELECT p_price / 12, p_price;
  ELSE
    RETURN QUERY SELECT 0.00::DECIMAL, 0.00::DECIMAL;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- MIGRATION TERMINÉE
-- ========================================
-- Ce système permet à TRINEXTA de gérer:
-- ✅ Plans d'abonnement flexibles
-- ✅ Trial gratuit 30 jours
-- ✅ Abonnements mensuels/annuels
-- ✅ Facturation automatique
-- ✅ Suivi des paiements
-- ✅ Logs d'activité super-admin
-- ✅ Quotas par tenant
