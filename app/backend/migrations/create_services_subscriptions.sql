-- Migration: Système de services et abonnements personnalisables
-- Date: 2025-11-14
-- Description: Gestion des services proposés et des abonnements clients

-- Table des services disponibles (catalogue de services)
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100), -- 'consulting', 'development', 'marketing', 'support', etc.
  price_type VARCHAR(50) DEFAULT 'one_time', -- 'one_time', 'monthly', 'yearly', 'hourly', 'custom'
  base_price DECIMAL(10, 2), -- Prix de base
  currency VARCHAR(3) DEFAULT 'EUR',
  billing_cycle VARCHAR(50), -- 'monthly', 'quarterly', 'yearly', 'once'
  is_active BOOLEAN DEFAULT true,
  features JSONB, -- Liste des fonctionnalités incluses
  metadata JSONB, -- Données personnalisées
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Table des abonnements clients (services souscrits par les leads/clients)
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,

  -- Informations de l'abonnement
  subscription_name VARCHAR(255) NOT NULL, -- Nom personnalisé si différent du service
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'paused', 'cancelled', 'expired', 'pending'

  -- Tarification
  price DECIMAL(10, 2) NOT NULL, -- Prix négocié (peut différer du base_price)
  billing_cycle VARCHAR(50), -- 'monthly', 'quarterly', 'yearly', 'once'
  currency VARCHAR(3) DEFAULT 'EUR',

  -- Dates
  start_date DATE,
  end_date DATE,
  next_billing_date DATE,
  last_billing_date DATE,

  -- Détails
  quantity INTEGER DEFAULT 1, -- Pour les services facturés à l'unité
  discount_percent DECIMAL(5, 2) DEFAULT 0, -- Remise en %
  discount_amount DECIMAL(10, 2) DEFAULT 0, -- Remise en montant fixe

  -- Notes et métadonnées
  notes TEXT,
  custom_fields JSONB, -- Champs personnalisés spécifiques au tenant
  metadata JSONB,

  -- Audit
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

  -- Informations facture
  invoice_number VARCHAR(100) UNIQUE,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'EUR',
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'paid', 'overdue', 'cancelled'

  -- Dates
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  paid_date DATE,

  -- Détails
  description TEXT,
  line_items JSONB, -- Détail des lignes de facturation

  -- Paiement
  payment_method VARCHAR(50), -- 'bank_transfer', 'card', 'check', 'cash'
  payment_reference VARCHAR(255),

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Table de l'historique des changements d'abonnements
CREATE TABLE IF NOT EXISTS subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,

  -- Changement
  change_type VARCHAR(50), -- 'created', 'activated', 'paused', 'cancelled', 'renewed', 'price_changed', etc.
  old_status VARCHAR(50),
  new_status VARCHAR(50),
  old_price DECIMAL(10, 2),
  new_price DECIMAL(10, 2),

  -- Détails
  notes TEXT,
  changed_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes pour performance
CREATE INDEX idx_services_tenant ON services(tenant_id);
CREATE INDEX idx_services_active ON services(tenant_id, is_active);
CREATE INDEX idx_services_category ON services(category);

CREATE INDEX idx_subscriptions_tenant ON subscriptions(tenant_id);
CREATE INDEX idx_subscriptions_lead ON subscriptions(lead_id);
CREATE INDEX idx_subscriptions_service ON subscriptions(service_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_dates ON subscriptions(next_billing_date);

CREATE INDEX idx_invoices_subscription ON subscription_invoices(subscription_id);
CREATE INDEX idx_invoices_lead ON subscription_invoices(lead_id);
CREATE INDEX idx_invoices_status ON subscription_invoices(status);
CREATE INDEX idx_invoices_due_date ON subscription_invoices(due_date);

CREATE INDEX idx_subscription_history_subscription ON subscription_history(subscription_id);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers pour updated_at
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON subscription_invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Données de démonstration - Services types
INSERT INTO services (tenant_id, name, description, category, price_type, base_price, billing_cycle, features)
SELECT
  id as tenant_id,
  'Consulting Stratégique',
  'Accompagnement stratégique personnalisé pour votre entreprise',
  'consulting',
  'monthly',
  1500.00,
  'monthly',
  '["Audit stratégique", "Plan d\'action", "Suivi mensuel", "Support prioritaire"]'::jsonb
FROM tenants
ON CONFLICT DO NOTHING;

INSERT INTO services (tenant_id, name, description, category, price_type, base_price, billing_cycle, features)
SELECT
  id as tenant_id,
  'Développement Web',
  'Création de sites web et applications sur mesure',
  'development',
  'one_time',
  5000.00,
  'once',
  '["Design personnalisé", "Responsive", "SEO optimisé", "Hébergement 1 an"]'::jsonb
FROM tenants
ON CONFLICT DO NOTHING;

INSERT INTO services (tenant_id, name, description, category, price_type, base_price, billing_cycle, features)
SELECT
  id as tenant_id,
  'Marketing Digital',
  'Gestion complète de votre présence digitale',
  'marketing',
  'monthly',
  800.00,
  'monthly',
  '["Social media", "Content marketing", "SEO/SEA", "Analytics"]'::jsonb
FROM tenants
ON CONFLICT DO NOTHING;

INSERT INTO services (tenant_id, name, description, category, price_type, base_price, billing_cycle, features)
SELECT
  id as tenant_id,
  'Support Technique',
  'Assistance technique et maintenance',
  'support',
  'monthly',
  300.00,
  'monthly',
  '["Support 24/7", "Maintenance préventive", "Mises à jour", "Monitoring"]'::jsonb
FROM tenants
ON CONFLICT DO NOTHING;

COMMENT ON TABLE services IS 'Catalogue des services proposés aux clients';
COMMENT ON TABLE subscriptions IS 'Abonnements et services souscrits par les clients';
COMMENT ON TABLE subscription_invoices IS 'Factures liées aux abonnements';
COMMENT ON TABLE subscription_history IS 'Historique des modifications d\'abonnements';
