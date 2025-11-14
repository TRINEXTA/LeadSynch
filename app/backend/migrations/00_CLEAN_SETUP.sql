-- =========================================
-- MIGRATION PROPRE : Nettoyage et recréation complète
-- Date: 2025-11-14
-- Description: Supprime et recrée toutes les tables nécessaires
-- ATTENTION: Cette migration supprimera les données de ces tables
-- =========================================

-- ========== NETTOYAGE COMPLET ==========

-- Supprimer toutes les tables dans le bon ordre (dépendances)
DROP TABLE IF EXISTS subscription_history CASCADE;
DROP TABLE IF EXISTS subscription_invoices CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS credit_usage CASCADE;
DROP TABLE IF EXISTS credit_purchases CASCADE;
DROP TABLE IF EXISTS lead_credits CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS billing_info CASCADE;
DROP TABLE IF EXISTS mailing_settings CASCADE;

-- ========== 1. SYSTÈME DE CRÉDITS LEADS ==========

CREATE TABLE lead_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  credits_remaining INTEGER DEFAULT 0,
  credits_purchased INTEGER DEFAULT 0,
  credits_used INTEGER DEFAULT 0,
  last_purchase_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id)
);

CREATE TABLE credit_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  amount_credits INTEGER NOT NULL,
  amount_euros DECIMAL(10, 2) NOT NULL,
  price_per_lead DECIMAL(10, 3) NOT NULL,
  payment_method VARCHAR(50),
  payment_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE credit_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  credits_used INTEGER DEFAULT 1,
  source VARCHAR(50),
  cost_euros DECIMAL(10, 3),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ========== 2. SERVICES ET ABONNEMENTS ==========

CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  price_type VARCHAR(50) DEFAULT 'one_time',
  base_price DECIMAL(10, 2),
  currency VARCHAR(3) DEFAULT 'EUR',
  billing_cycle VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  features JSONB,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  subscription_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  price DECIMAL(10, 2) NOT NULL,
  billing_cycle VARCHAR(50),
  currency VARCHAR(3) DEFAULT 'EUR',
  start_date DATE,
  end_date DATE,
  next_billing_date DATE,
  last_billing_date DATE,
  quantity INTEGER DEFAULT 1,
  discount_percent DECIMAL(5, 2) DEFAULT 0,
  discount_amount DECIMAL(10, 2) DEFAULT 0,
  notes TEXT,
  custom_fields JSONB,
  metadata JSONB,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE subscription_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  invoice_number VARCHAR(100) UNIQUE,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'EUR',
  status VARCHAR(50) DEFAULT 'pending',
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  paid_date DATE,
  description TEXT,
  line_items JSONB,
  payment_method VARCHAR(50),
  payment_reference VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
  stripe_subscription_id VARCHAR(255),
  stripe_invoice_id VARCHAR(255),
  plan VARCHAR(50),
  status VARCHAR(50),
  change_type VARCHAR(50),
  old_status VARCHAR(50),
  new_status VARCHAR(50),
  amount DECIMAL(10,2),
  old_price DECIMAL(10, 2),
  new_price DECIMAL(10, 2),
  currency VARCHAR(3) DEFAULT 'EUR',
  billing_cycle VARCHAR(20),
  period_start TIMESTAMP,
  period_end TIMESTAMP,
  notes TEXT,
  changed_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ========== 3. FACTURATION STRIPE ==========

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  stripe_invoice_id VARCHAR(255),
  stripe_invoice_url TEXT,
  stripe_invoice_pdf TEXT,
  amount_ht DECIMAL(10,2) NOT NULL,
  amount_tva DECIMAL(10,2) NOT NULL,
  amount_ttc DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'draft',
  issued_at TIMESTAMP,
  paid_at TIMESTAMP,
  due_at TIMESTAMP,
  billing_address TEXT,
  siret VARCHAR(14),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE billing_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
  company_name VARCHAR(255) NOT NULL,
  siret VARCHAR(14),
  tva_number VARCHAR(20),
  address_line1 TEXT,
  address_line2 TEXT,
  postal_code VARCHAR(10),
  city VARCHAR(100),
  country VARCHAR(2) DEFAULT 'FR',
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE mailing_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
  from_email VARCHAR(255) NOT NULL,
  from_name VARCHAR(255),
  reply_to_email VARCHAR(255),
  elastic_email_api_key VARCHAR(500),
  smtp_host VARCHAR(255),
  smtp_port INTEGER,
  smtp_user VARCHAR(255),
  smtp_password VARCHAR(500),
  provider VARCHAR(50) DEFAULT 'elastic_email',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ========== 4. INDEXES ==========

CREATE INDEX idx_lead_credits_tenant ON lead_credits(tenant_id);
CREATE INDEX idx_credit_purchases_tenant ON credit_purchases(tenant_id);
CREATE INDEX idx_credit_purchases_status ON credit_purchases(status);
CREATE INDEX idx_credit_usage_tenant ON credit_usage(tenant_id);
CREATE INDEX idx_credit_usage_source ON credit_usage(source);
CREATE INDEX idx_credit_usage_lead ON credit_usage(lead_id);

CREATE INDEX idx_services_tenant ON services(tenant_id);
CREATE INDEX idx_services_active ON services(tenant_id, is_active);
CREATE INDEX idx_services_category ON services(category);

CREATE INDEX idx_subscriptions_tenant ON subscriptions(tenant_id);
CREATE INDEX idx_subscriptions_lead ON subscriptions(lead_id);
CREATE INDEX idx_subscriptions_service ON subscriptions(service_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_dates ON subscriptions(next_billing_date);

CREATE INDEX idx_subscription_invoices_subscription ON subscription_invoices(subscription_id);
CREATE INDEX idx_subscription_invoices_lead ON subscription_invoices(lead_id);
CREATE INDEX idx_subscription_invoices_status ON subscription_invoices(status);
CREATE INDEX idx_subscription_invoices_due_date ON subscription_invoices(due_date);

CREATE INDEX idx_subscription_history_tenant ON subscription_history(tenant_id);
CREATE INDEX idx_subscription_history_subscription ON subscription_history(subscription_id);
CREATE INDEX idx_subscription_history_stripe_sub ON subscription_history(stripe_subscription_id);

CREATE INDEX idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX idx_invoices_stripe ON invoices(stripe_invoice_id);
CREATE INDEX idx_invoices_number ON invoices(invoice_number);
CREATE INDEX idx_billing_info_tenant ON billing_info(tenant_id);
CREATE INDEX idx_mailing_settings_tenant ON mailing_settings(tenant_id);

-- ========== 5. TRIGGERS ==========

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_services_updated_at ON services;
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscription_invoices_updated_at ON subscription_invoices;
CREATE TRIGGER update_subscription_invoices_updated_at BEFORE UPDATE ON subscription_invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_mailing_settings_updated_at ON mailing_settings;
CREATE TRIGGER update_mailing_settings_updated_at BEFORE UPDATE ON mailing_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========== 6. INITIALISATION DES DONNÉES ==========

-- Crédits pour chaque tenant
INSERT INTO lead_credits (tenant_id, credits_remaining, credits_purchased, credits_used)
SELECT id, 0, 0, 0 FROM tenants;

-- Services par défaut pour chaque tenant
INSERT INTO services (tenant_id, name, description, category, price_type, base_price, billing_cycle, features)
SELECT
  id,
  'Consulting Stratégique',
  'Accompagnement stratégique personnalisé',
  'consulting',
  'monthly',
  1500.00,
  'monthly',
  '["Audit stratégique", "Plan d''action", "Suivi mensuel"]'::jsonb
FROM tenants;

INSERT INTO services (tenant_id, name, description, category, price_type, base_price, billing_cycle, features)
SELECT
  id,
  'Développement Web',
  'Création de sites web sur mesure',
  'development',
  'one_time',
  5000.00,
  'once',
  '["Design personnalisé", "Responsive", "SEO"]'::jsonb
FROM tenants;

INSERT INTO services (tenant_id, name, description, category, price_type, base_price, billing_cycle, features)
SELECT
  id,
  'Marketing Digital',
  'Gestion complète présence digitale',
  'marketing',
  'monthly',
  800.00,
  'monthly',
  '["Social media", "Content", "SEO/SEA"]'::jsonb
FROM tenants;

INSERT INTO services (tenant_id, name, description, category, price_type, base_price, billing_cycle, features)
SELECT
  id,
  'Support Technique',
  'Assistance et maintenance',
  'support',
  'monthly',
  300.00,
  'monthly',
  '["Support 24/7", "Maintenance", "Monitoring"]'::jsonb
FROM tenants;

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Migration terminée avec succès !';
  RAISE NOTICE '========================================';
  RAISE NOTICE '📋 Tables créées : 10';
  RAISE NOTICE '🔧 Indexes créés : 25';
  RAISE NOTICE '🎯 Triggers créés : 4';
  RAISE NOTICE '📦 Données initialisées';
  RAISE NOTICE '========================================';
END$$;
