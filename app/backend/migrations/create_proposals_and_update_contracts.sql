-- Migration: Create proposals table and update contracts table
-- Date: 2025-11-22
-- Description: Add proposals table for quotes and extend contracts table with additional fields

-- ========================================
-- PROPOSALS TABLE (Devis)
-- ========================================
CREATE TABLE IF NOT EXISTS proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  pipeline_lead_id UUID,

  -- Proposal details
  reference VARCHAR(50), -- e.g., DEV-2025-001
  status VARCHAR(50) DEFAULT 'draft', -- draft, sent, accepted, rejected, expired

  -- Services/Items as JSON array
  services JSONB DEFAULT '[]'::jsonb,

  -- Pricing
  total_ht DECIMAL(10, 2) DEFAULT 0,
  tax_rate DECIMAL(5, 2) DEFAULT 20.00,
  total_ttc DECIMAL(10, 2) DEFAULT 0,

  -- Validity
  valid_until DATE,

  -- Notes
  notes TEXT,
  internal_notes TEXT,

  -- Conversion
  converted_to_contract_id UUID,

  -- Tracking
  sent_at TIMESTAMP,
  viewed_at TIMESTAMP,
  accepted_at TIMESTAMP,
  rejected_at TIMESTAMP,

  -- Metadata
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proposals_tenant ON proposals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_proposals_lead ON proposals(lead_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_reference ON proposals(reference);

-- ========================================
-- UPDATE CONTRACTS TABLE (additional columns)
-- ========================================

-- Add pipeline_lead_id if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contracts' AND column_name = 'pipeline_lead_id'
  ) THEN
    ALTER TABLE contracts ADD COLUMN pipeline_lead_id UUID;
  END IF;
END $$;

-- Add offer_type if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contracts' AND column_name = 'offer_type'
  ) THEN
    ALTER TABLE contracts ADD COLUMN offer_type VARCHAR(100);
  END IF;
END $$;

-- Add offer_name if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contracts' AND column_name = 'offer_name'
  ) THEN
    ALTER TABLE contracts ADD COLUMN offer_name VARCHAR(255);
  END IF;
END $$;

-- Add services JSON if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contracts' AND column_name = 'services'
  ) THEN
    ALTER TABLE contracts ADD COLUMN services JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Add contract_type if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contracts' AND column_name = 'contract_type'
  ) THEN
    ALTER TABLE contracts ADD COLUMN contract_type VARCHAR(50) DEFAULT 'avec_engagement_12';
  END IF;
END $$;

-- Add payment_frequency if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contracts' AND column_name = 'payment_frequency'
  ) THEN
    ALTER TABLE contracts ADD COLUMN payment_frequency VARCHAR(50) DEFAULT 'mensuel';
  END IF;
END $$;

-- Add user_count if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contracts' AND column_name = 'user_count'
  ) THEN
    ALTER TABLE contracts ADD COLUMN user_count INTEGER DEFAULT 1;
  END IF;
END $$;

-- Add monthly_price if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contracts' AND column_name = 'monthly_price'
  ) THEN
    ALTER TABLE contracts ADD COLUMN monthly_price DECIMAL(10, 2);
  END IF;
END $$;

-- Add total_amount if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contracts' AND column_name = 'total_amount'
  ) THEN
    ALTER TABLE contracts ADD COLUMN total_amount DECIMAL(10, 2);
  END IF;
END $$;

-- Add start_date if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contracts' AND column_name = 'start_date'
  ) THEN
    ALTER TABLE contracts ADD COLUMN start_date DATE;
  END IF;
END $$;

-- Add end_date if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contracts' AND column_name = 'end_date'
  ) THEN
    ALTER TABLE contracts ADD COLUMN end_date DATE;
  END IF;
END $$;

-- Add notes if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contracts' AND column_name = 'notes'
  ) THEN
    ALTER TABLE contracts ADD COLUMN notes TEXT;
  END IF;
END $$;

-- Add reference if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contracts' AND column_name = 'reference'
  ) THEN
    ALTER TABLE contracts ADD COLUMN reference VARCHAR(50);
  END IF;
END $$;

-- Add proposal_id if not exists (link to original proposal)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contracts' AND column_name = 'proposal_id'
  ) THEN
    ALTER TABLE contracts ADD COLUMN proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for reference
CREATE INDEX IF NOT EXISTS idx_contracts_reference ON contracts(reference);

-- ========================================
-- SEQUENCE FOR REFERENCE NUMBERS
-- ========================================
CREATE SEQUENCE IF NOT EXISTS proposal_reference_seq START 1;
CREATE SEQUENCE IF NOT EXISTS contract_reference_seq START 1;

-- ========================================
-- FUNCTION TO GENERATE REFERENCES
-- ========================================
CREATE OR REPLACE FUNCTION generate_proposal_reference(p_tenant_id UUID)
RETURNS VARCHAR AS $$
DECLARE
  v_year VARCHAR(4);
  v_seq INTEGER;
  v_ref VARCHAR(50);
BEGIN
  v_year := TO_CHAR(NOW(), 'YYYY');
  SELECT COALESCE(MAX(CAST(SUBSTRING(reference FROM 'DEV-[0-9]{4}-([0-9]+)') AS INTEGER)), 0) + 1
  INTO v_seq
  FROM proposals
  WHERE tenant_id = p_tenant_id AND reference LIKE 'DEV-' || v_year || '-%';

  v_ref := 'DEV-' || v_year || '-' || LPAD(v_seq::TEXT, 4, '0');
  RETURN v_ref;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_contract_reference(p_tenant_id UUID)
RETURNS VARCHAR AS $$
DECLARE
  v_year VARCHAR(4);
  v_seq INTEGER;
  v_ref VARCHAR(50);
BEGIN
  v_year := TO_CHAR(NOW(), 'YYYY');
  SELECT COALESCE(MAX(CAST(SUBSTRING(reference FROM 'CTR-[0-9]{4}-([0-9]+)') AS INTEGER)), 0) + 1
  INTO v_seq
  FROM contracts
  WHERE tenant_id = p_tenant_id AND reference LIKE 'CTR-' || v_year || '-%';

  v_ref := 'CTR-' || v_year || '-' || LPAD(v_seq::TEXT, 4, '0');
  RETURN v_ref;
END;
$$ LANGUAGE plpgsql;
