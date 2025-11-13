-- Migration : Créer tables facturation et abonnements Stripe

-- 1. Table historique abonnements
CREATE TABLE IF NOT EXISTS subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  stripe_subscription_id VARCHAR(255),
  stripe_invoice_id VARCHAR(255),
  amount DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'EUR',
  billing_cycle VARCHAR(20),
  period_start TIMESTAMP,
  period_end TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_history_tenant ON subscription_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_stripe_sub ON subscription_history(stripe_subscription_id);

-- 2. Table factures
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

CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe ON invoices(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);

-- 3. Table informations facturation
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

CREATE INDEX IF NOT EXISTS idx_billing_info_tenant ON billing_info(tenant_id);

-- 4. Table paramètres email (pour configuration simple)
CREATE TABLE IF NOT EXISTS mailing_settings (
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

CREATE INDEX IF NOT EXISTS idx_mailing_settings_tenant ON mailing_settings(tenant_id);

-- Vérification
SELECT 'Tables créées avec succès !' as message;
