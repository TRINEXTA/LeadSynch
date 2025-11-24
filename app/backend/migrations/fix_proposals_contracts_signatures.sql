-- =========================================
-- MIGRATION: Fix proposals, contracts et signatures
-- Date: 2025-11-24
-- Description: Ajoute toutes les colonnes et tables manquantes
-- pour le système de devis, contrats et signatures
-- =========================================

-- ========== 1. TABLE PROPOSALS ==========
-- Créer la table si elle n'existe pas
CREATE TABLE IF NOT EXISTS proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  pipeline_lead_id UUID,
  reference VARCHAR(50),
  status VARCHAR(50) DEFAULT 'draft',
  services JSONB DEFAULT '[]'::jsonb,
  total_ht DECIMAL(10, 2) DEFAULT 0,
  tax_rate DECIMAL(5, 2) DEFAULT 20.00,
  total_ttc DECIMAL(10, 2) DEFAULT 0,
  valid_until DATE,
  notes TEXT,
  internal_notes TEXT,
  converted_to_contract_id UUID,
  sent_at TIMESTAMP,
  viewed_at TIMESTAMP,
  accepted_at TIMESTAMP,
  rejected_at TIMESTAMP,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Ajouter les colonnes manquantes si la table existe déjà
DO $$
BEGIN
  -- notes
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposals' AND column_name = 'notes') THEN
    ALTER TABLE proposals ADD COLUMN notes TEXT;
    RAISE NOTICE 'Colonne notes ajoutée à proposals';
  END IF;

  -- internal_notes
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposals' AND column_name = 'internal_notes') THEN
    ALTER TABLE proposals ADD COLUMN internal_notes TEXT;
  END IF;

  -- pipeline_lead_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposals' AND column_name = 'pipeline_lead_id') THEN
    ALTER TABLE proposals ADD COLUMN pipeline_lead_id UUID;
  END IF;

  -- tax_rate
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposals' AND column_name = 'tax_rate') THEN
    ALTER TABLE proposals ADD COLUMN tax_rate DECIMAL(5, 2) DEFAULT 20.00;
  END IF;

  -- total_ttc
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposals' AND column_name = 'total_ttc') THEN
    ALTER TABLE proposals ADD COLUMN total_ttc DECIMAL(10, 2) DEFAULT 0;
  END IF;

  -- valid_until
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposals' AND column_name = 'valid_until') THEN
    ALTER TABLE proposals ADD COLUMN valid_until DATE;
  END IF;

  -- converted_to_contract_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposals' AND column_name = 'converted_to_contract_id') THEN
    ALTER TABLE proposals ADD COLUMN converted_to_contract_id UUID;
  END IF;

  -- sent_at, viewed_at, accepted_at, rejected_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposals' AND column_name = 'sent_at') THEN
    ALTER TABLE proposals ADD COLUMN sent_at TIMESTAMP;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposals' AND column_name = 'viewed_at') THEN
    ALTER TABLE proposals ADD COLUMN viewed_at TIMESTAMP;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposals' AND column_name = 'accepted_at') THEN
    ALTER TABLE proposals ADD COLUMN accepted_at TIMESTAMP;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposals' AND column_name = 'rejected_at') THEN
    ALTER TABLE proposals ADD COLUMN rejected_at TIMESTAMP;
  END IF;
END $$;

-- Index pour proposals
CREATE INDEX IF NOT EXISTS idx_proposals_tenant ON proposals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_proposals_lead ON proposals(lead_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_reference ON proposals(reference);

-- ========== 2. TABLE CONTRACTS - Colonnes manquantes ==========
DO $$
BEGIN
  -- pipeline_lead_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'pipeline_lead_id') THEN
    ALTER TABLE contracts ADD COLUMN pipeline_lead_id UUID;
    RAISE NOTICE 'Colonne pipeline_lead_id ajoutée à contracts';
  END IF;

  -- proposal_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'proposal_id') THEN
    ALTER TABLE contracts ADD COLUMN proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL;
  END IF;

  -- reference
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'reference') THEN
    ALTER TABLE contracts ADD COLUMN reference VARCHAR(50);
  END IF;

  -- offer_type
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'offer_type') THEN
    ALTER TABLE contracts ADD COLUMN offer_type VARCHAR(100);
  END IF;

  -- offer_name
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'offer_name') THEN
    ALTER TABLE contracts ADD COLUMN offer_name VARCHAR(255);
  END IF;

  -- services (JSONB)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'services') THEN
    ALTER TABLE contracts ADD COLUMN services JSONB DEFAULT '[]'::jsonb;
  END IF;

  -- contract_type
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'contract_type') THEN
    ALTER TABLE contracts ADD COLUMN contract_type VARCHAR(50) DEFAULT 'avec_engagement_12';
  END IF;

  -- payment_frequency
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'payment_frequency') THEN
    ALTER TABLE contracts ADD COLUMN payment_frequency VARCHAR(50) DEFAULT 'mensuel';
  END IF;

  -- user_count
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'user_count') THEN
    ALTER TABLE contracts ADD COLUMN user_count INTEGER DEFAULT 1;
  END IF;

  -- monthly_price
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'monthly_price') THEN
    ALTER TABLE contracts ADD COLUMN monthly_price DECIMAL(10, 2);
  END IF;

  -- total_amount
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'total_amount') THEN
    ALTER TABLE contracts ADD COLUMN total_amount DECIMAL(10, 2);
  END IF;

  -- start_date
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'start_date') THEN
    ALTER TABLE contracts ADD COLUMN start_date DATE;
  END IF;

  -- end_date
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'end_date') THEN
    ALTER TABLE contracts ADD COLUMN end_date DATE;
  END IF;

  -- notes
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'notes') THEN
    ALTER TABLE contracts ADD COLUMN notes TEXT;
  END IF;

  -- sent_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'sent_at') THEN
    ALTER TABLE contracts ADD COLUMN sent_at TIMESTAMP;
  END IF;

  -- contract_number (alias pour compatibilité)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'contract_number') THEN
    ALTER TABLE contracts ADD COLUMN contract_number VARCHAR(50);
  END IF;

  -- signed_by_name
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'signed_by_name') THEN
    ALTER TABLE contracts ADD COLUMN signed_by_name VARCHAR(255);
  END IF;

  -- pdf_url
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'pdf_url') THEN
    ALTER TABLE contracts ADD COLUMN pdf_url TEXT;
  END IF;
END $$;

-- Index pour contracts
CREATE INDEX IF NOT EXISTS idx_contracts_reference ON contracts(reference);
CREATE INDEX IF NOT EXISTS idx_contracts_contract_number ON contracts(contract_number);

-- ========== 3. TABLES DE SIGNATURES ==========

-- Table contract_signatures
CREATE TABLE IF NOT EXISTS contract_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Informations signataire
  signer_email VARCHAR(255),
  signer_company VARCHAR(255),
  signer_name VARCHAR(255),
  signer_firstname VARCHAR(100),
  signer_lastname VARCHAR(100),
  signer_position VARCHAR(100),

  -- Token et sécurité
  signature_token VARCHAR(255) UNIQUE,
  signature_otp VARCHAR(6),
  otp_expires_at TIMESTAMP,
  otp_attempts INTEGER DEFAULT 0,

  -- CGV
  cgv_accepted BOOLEAN DEFAULT FALSE,
  cgv_accepted_at TIMESTAMP,

  -- Signature
  status VARCHAR(50) DEFAULT 'pending', -- pending, otp_sent, signed, expired, cancelled
  signed_at TIMESTAMP,
  signature_ip VARCHAR(45),
  signature_user_agent TEXT,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index pour contract_signatures
CREATE INDEX IF NOT EXISTS idx_contract_signatures_contract ON contract_signatures(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_signatures_tenant ON contract_signatures(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contract_signatures_token ON contract_signatures(signature_token);
CREATE INDEX IF NOT EXISTS idx_contract_signatures_status ON contract_signatures(status);

-- Table signature_tokens
CREATE TABLE IF NOT EXISTS signature_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  is_used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index pour signature_tokens
CREATE INDEX IF NOT EXISTS idx_signature_tokens_contract ON signature_tokens(contract_id);
CREATE INDEX IF NOT EXISTS idx_signature_tokens_token ON signature_tokens(token);
CREATE INDEX IF NOT EXISTS idx_signature_tokens_expires ON signature_tokens(expires_at);

-- Table signature_audit_log
CREATE TABLE IF NOT EXISTS signature_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signature_id UUID REFERENCES contract_signatures(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL, -- link_clicked, otp_requested, otp_verified, signed, failed
  ip_address VARCHAR(45),
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index pour signature_audit_log
CREATE INDEX IF NOT EXISTS idx_signature_audit_signature ON signature_audit_log(signature_id);
CREATE INDEX IF NOT EXISTS idx_signature_audit_action ON signature_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_signature_audit_created ON signature_audit_log(created_at);

-- ========== 4. TRIGGER UPDATED_AT ==========
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger pour proposals
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_proposals_updated_at') THEN
    CREATE TRIGGER update_proposals_updated_at BEFORE UPDATE ON proposals
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Trigger pour contract_signatures
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_contract_signatures_updated_at') THEN
    CREATE TRIGGER update_contract_signatures_updated_at BEFORE UPDATE ON contract_signatures
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ========== 5. VÉRIFICATION ==========
DO $$
BEGIN
  RAISE NOTICE '✅ Migration proposals/contracts/signatures terminée';
  RAISE NOTICE '📋 Tables créées/mises à jour: proposals, contracts, contract_signatures, signature_tokens, signature_audit_log';
END $$;
