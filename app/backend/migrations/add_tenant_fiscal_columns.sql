-- Migration: Add fiscal columns to tenants table
-- Date: 2025-11-21

-- Add missing columns for full tenant info
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS country VARCHAR(50) DEFAULT 'France';

-- Add SIREN column (9 first digits of SIRET)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS company_siren VARCHAR(9);

-- Add VAT applicability flag
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS vat_applicable BOOLEAN DEFAULT true;

-- Add credits columns for gift credits feature
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS credits_remaining INTEGER DEFAULT 0;

-- Index for quick lookup
CREATE INDEX IF NOT EXISTS idx_tenants_company_siret ON tenants(company_siret);
CREATE INDEX IF NOT EXISTS idx_tenants_company_siren ON tenants(company_siren);
