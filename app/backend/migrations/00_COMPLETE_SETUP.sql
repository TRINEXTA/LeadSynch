-- =========================================
-- MIGRATION COMPLÈTE : Toutes les tables nécessaires pour LeadSynch
-- Date: 2025-11-14
-- Description: Script consolidé créant TOUTES les tables manquantes
-- =========================================

-- ========== 1. SYSTÈME DE CRÉDITS LEADS ==========

-- Table des crédits de leads par tenant
CREATE TABLE IF NOT EXISTS lead_credits (
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

-- Table historique des achats de crédits
CREATE TABLE IF NOT EXISTS credit_purchases (
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

-- Table historique de consommation des crédits
CREATE TABLE IF NOT EXISTS credit_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  credits_used INTEGER DEFAULT 1,
  source VARCHAR(50),
  cost_euros DECIMAL(10, 3),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Supprimer les index existants sur credit_usage qui pourraient causer des problèmes
DROP INDEX IF EXISTS idx_credit_usage_tenant;
DROP INDEX IF EXISTS idx_credit_usage_source;
DROP INDEX IF EXISTS idx_credit_usage_lead;

-- Ajouter les colonnes manquantes si la table existait déjà
ALTER TABLE credit_usage ADD COLUMN IF NOT EXISTS lead_id UUID;
ALTER TABLE credit_usage ADD COLUMN IF NOT EXISTS credits_used INTEGER DEFAULT 1;
ALTER TABLE credit_usage ADD COLUMN IF NOT EXISTS source VARCHAR(50);
ALTER TABLE credit_usage ADD COLUMN IF NOT EXISTS cost_euros DECIMAL(10, 3);

-- Ajouter la contrainte de clé étrangère après coup (si la colonne vient d'être ajoutée)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'credit_usage_lead_id_fkey'
  ) THEN
    ALTER TABLE credit_usage ADD CONSTRAINT credit_usage_lead_id_fkey
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL;
  END IF;
END$$;

-- ========== 2. SERVICES ET ABONNEMENTS ==========

-- Table des services disponibles
CREATE TABLE IF NOT EXISTS services (
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

-- Supprimer les index existants sur services qui pourraient causer des problèmes
DROP INDEX IF EXISTS idx_services_tenant;
DROP INDEX IF EXISTS idx_services_active;
DROP INDEX IF EXISTS idx_services_category;

-- Ajouter les colonnes manquantes si la table existait déjà
ALTER TABLE services ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(50);
ALTER TABLE services ADD COLUMN IF NOT EXISTS features JSONB;
ALTER TABLE services ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Table des abonnements clients
CREATE TABLE IF NOT EXISTS subscriptions (
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

-- Table des factures liées aux abonnements
CREATE TABLE IF NOT EXISTS subscription_invoices (
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

-- ========== 3. HISTORIQUE ABONNEMENTS (VERSION CONSOLIDÉE) ==========

-- Supprimer l'ancienne table si elle existe avec une structure différente
-- Note: Cette table peut avoir différentes structures selon les migrations précédentes
DROP TABLE IF EXISTS subscription_history CASCADE;

-- Créer la nouvelle version consolidée
CREATE TABLE IF NOT EXISTS subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Support à la fois pour les abonnements Stripe et les abonnements services
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
  stripe_subscription_id VARCHAR(255),
  stripe_invoice_id VARCHAR(255),

  -- Informations plan et status
  plan VARCHAR(50),
  status VARCHAR(50),
  change_type VARCHAR(50),
  old_status VARCHAR(50),
  new_status VARCHAR(50),

  -- Pricing
  amount DECIMAL(10,2),
  old_price DECIMAL(10, 2),
  new_price DECIMAL(10, 2),
  currency VARCHAR(3) DEFAULT 'EUR',
  billing_cycle VARCHAR(20),

  -- Périodes
  period_start TIMESTAMP,
  period_end TIMESTAMP,

  -- Audit
  notes TEXT,
  changed_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ========== 4. FACTURATION STRIPE ==========

-- Table factures
CREATE TABLE IF NOT EXISTS invoices (
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

-- Table informations facturation
CREATE TABLE IF NOT EXISTS billing_info (
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

-- ========== 5. INDEXES POUR PERFORMANCE ==========

-- Lead credits indexes
CREATE INDEX IF NOT EXISTS idx_lead_credits_tenant ON lead_credits(tenant_id);
CREATE INDEX IF NOT EXISTS idx_credit_purchases_tenant ON credit_purchases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_credit_purchases_status ON credit_purchases(status);
CREATE INDEX IF NOT EXISTS idx_credit_usage_tenant ON credit_usage(tenant_id);
CREATE INDEX IF NOT EXISTS idx_credit_usage_source ON credit_usage(source);

-- Services indexes
CREATE INDEX IF NOT EXISTS idx_services_tenant ON services(tenant_id);
CREATE INDEX IF NOT EXISTS idx_services_active ON services(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);

-- Subscriptions indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant ON subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_lead ON subscriptions(lead_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_service ON subscriptions(service_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_dates ON subscriptions(next_billing_date);

-- Invoices indexes
CREATE INDEX IF NOT EXISTS idx_subscription_invoices_subscription ON subscription_invoices(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_invoices_lead ON subscription_invoices(lead_id);
CREATE INDEX IF NOT EXISTS idx_subscription_invoices_status ON subscription_invoices(status);
CREATE INDEX IF NOT EXISTS idx_subscription_invoices_due_date ON subscription_invoices(due_date);

-- Subscription history indexes
CREATE INDEX IF NOT EXISTS idx_subscription_history_tenant ON subscription_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_subscription ON subscription_history(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_stripe_sub ON subscription_history(stripe_subscription_id);

-- Billing indexes
CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe ON invoices(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_billing_info_tenant ON billing_info(tenant_id);

-- ========== 6. TRIGGERS POUR updated_at ==========

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Créer les triggers seulement s'ils n'existent pas
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_services_updated_at') THEN
    CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_subscriptions_updated_at') THEN
    CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_subscription_invoices_updated_at') THEN
    CREATE TRIGGER update_subscription_invoices_updated_at BEFORE UPDATE ON subscription_invoices
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END$$;

-- ========== 7. INITIALISATION DES DONNÉES ==========

-- Initialiser les crédits pour les tenants existants
INSERT INTO lead_credits (tenant_id, credits_remaining, credits_purchased, credits_used)
SELECT id, 0, 0, 0 FROM tenants
ON CONFLICT (tenant_id) DO NOTHING;

-- Insérer services par défaut pour chaque tenant
DO $$
DECLARE
  tenant_record RECORD;
BEGIN
  FOR tenant_record IN SELECT id FROM tenants LOOP
    -- Consulting Stratégique
    INSERT INTO services (tenant_id, name, description, category, price_type, base_price, billing_cycle, features)
    VALUES (
      tenant_record.id,
      'Consulting Stratégique',
      'Accompagnement stratégique personnalisé pour votre entreprise',
      'consulting',
      'monthly',
      1500.00,
      'monthly',
      '["Audit stratégique", "Plan d''action", "Suivi mensuel", "Support prioritaire"]'::jsonb
    )
    ON CONFLICT DO NOTHING;

    -- Développement Web
    INSERT INTO services (tenant_id, name, description, category, price_type, base_price, billing_cycle, features)
    VALUES (
      tenant_record.id,
      'Développement Web',
      'Création de sites web et applications sur mesure',
      'development',
      'one_time',
      5000.00,
      'once',
      '["Design personnalisé", "Responsive", "SEO optimisé", "Hébergement 1 an"]'::jsonb
    )
    ON CONFLICT DO NOTHING;

    -- Marketing Digital
    INSERT INTO services (tenant_id, name, description, category, price_type, base_price, billing_cycle, features)
    VALUES (
      tenant_record.id,
      'Marketing Digital',
      'Gestion complète de votre présence digitale',
      'marketing',
      'monthly',
      800.00,
      'monthly',
      '["Social media", "Content marketing", "SEO/SEA", "Analytics"]'::jsonb
    )
    ON CONFLICT DO NOTHING;

    -- Support Technique
    INSERT INTO services (tenant_id, name, description, category, price_type, base_price, billing_cycle, features)
    VALUES (
      tenant_record.id,
      'Support Technique',
      'Assistance technique et maintenance',
      'support',
      'monthly',
      300.00,
      'monthly',
      '["Support 24/7", "Maintenance préventive", "Mises à jour", "Monitoring"]'::jsonb
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
END$$;

-- ========== 8. VÉRIFICATION FINALE ==========

-- Afficher un résumé simple
DO $$
BEGIN
  RAISE NOTICE '✅ Migration terminée avec succès !';
  RAISE NOTICE '📋 Tables créées : lead_credits, credit_purchases, credit_usage, services, subscriptions, subscription_invoices, subscription_history, invoices, billing_info';
END$$;
