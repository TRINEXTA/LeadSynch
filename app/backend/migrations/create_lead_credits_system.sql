-- Migration: Système de crédits leads et tarification
-- Date: 2025-11-14
-- Description: Gestion achats leads supplémentaires (0.03€ BDD / 0.06€ API)

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
  amount_credits INTEGER NOT NULL, -- Nombre de crédits achetés
  amount_euros DECIMAL(10, 2) NOT NULL, -- Montant payé en euros
  price_per_lead DECIMAL(10, 3) NOT NULL, -- Prix unitaire (0.03 ou 0.06)
  payment_method VARCHAR(50), -- stripe, paypal, etc.
  payment_id VARCHAR(255), -- ID transaction Stripe/PayPal
  status VARCHAR(50) DEFAULT 'pending', -- pending, completed, failed
  created_at TIMESTAMP DEFAULT NOW()
);

-- Table historique de consommation des crédits
CREATE TABLE IF NOT EXISTS credit_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  credits_used INTEGER DEFAULT 1,
  source VARCHAR(50), -- 'database' (0.03€) ou 'google_maps' (0.06€)
  cost_euros DECIMAL(10, 3), -- Coût de ce lead
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_lead_credits_tenant ON lead_credits(tenant_id);
CREATE INDEX idx_credit_purchases_tenant ON credit_purchases(tenant_id);
CREATE INDEX idx_credit_purchases_status ON credit_purchases(status);
CREATE INDEX idx_credit_usage_tenant ON credit_usage(tenant_id);
CREATE INDEX idx_credit_usage_source ON credit_usage(source);

-- Initialiser les crédits pour les tenants existants
INSERT INTO lead_credits (tenant_id, credits_remaining, credits_purchased, credits_used)
SELECT id, 0, 0, 0 FROM tenants
ON CONFLICT (tenant_id) DO NOTHING;

COMMENT ON TABLE lead_credits IS 'Crédits de leads disponibles par tenant';
COMMENT ON TABLE credit_purchases IS 'Historique des achats de crédits';
COMMENT ON TABLE credit_usage IS 'Historique de consommation des crédits par lead';
