-- Migration: Fix leads table - Add all missing columns
-- Date: 2025-12-06
-- Description: Adds all columns required by generate-leads-v2.js

-- ========== LEADS TABLE - COLONNES MANQUANTES ==========

-- Colonnes de base
ALTER TABLE leads ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS sector VARCHAR(255);

-- Colonnes entreprise (Sirene/INSEE)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS siren VARCHAR(9);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS siret VARCHAR(14);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS naf_code VARCHAR(10);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS naf_label VARCHAR(255);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS employee_count INTEGER;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS employee_range VARCHAR(50);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS legal_form VARCHAR(100);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS creation_date DATE;

-- Colonnes qualité et source
ALTER TABLE leads ADD COLUMN IF NOT EXISTS quality_score INTEGER DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS data_source VARCHAR(50);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS enriched_at TIMESTAMP;

-- Colonnes contact
ALTER TABLE leads ADD COLUMN IF NOT EXISTS contact_role VARCHAR(100);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS all_emails TEXT;

-- Référence au cache global
ALTER TABLE leads ADD COLUMN IF NOT EXISTS global_lead_id UUID;

-- ========== INDEX POUR PERFORMANCE ==========

CREATE INDEX IF NOT EXISTS idx_leads_siret ON leads(siret);
CREATE INDEX IF NOT EXISTS idx_leads_siren ON leads(siren);
CREATE INDEX IF NOT EXISTS idx_leads_naf ON leads(naf_code);
CREATE INDEX IF NOT EXISTS idx_leads_quality ON leads(quality_score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_sector ON leads(sector);
CREATE INDEX IF NOT EXISTS idx_leads_city ON leads(city);
CREATE INDEX IF NOT EXISTS idx_leads_global_lead ON leads(global_lead_id);
CREATE INDEX IF NOT EXISTS idx_leads_data_source ON leads(data_source);

-- ========== GLOBAL_LEADS TABLE - COLONNES MANQUANTES ==========

-- Vérifier que global_leads existe et ajouter colonnes manquantes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'global_leads') THEN
    -- Colonnes entreprise
    ALTER TABLE global_leads ADD COLUMN IF NOT EXISTS siret VARCHAR(14);
    ALTER TABLE global_leads ADD COLUMN IF NOT EXISTS siren VARCHAR(9);
    ALTER TABLE global_leads ADD COLUMN IF NOT EXISTS naf_code VARCHAR(10);
    ALTER TABLE global_leads ADD COLUMN IF NOT EXISTS naf_label VARCHAR(255);
    ALTER TABLE global_leads ADD COLUMN IF NOT EXISTS employee_count INTEGER;
    ALTER TABLE global_leads ADD COLUMN IF NOT EXISTS employee_range VARCHAR(50);
    ALTER TABLE global_leads ADD COLUMN IF NOT EXISTS legal_form VARCHAR(100);
    ALTER TABLE global_leads ADD COLUMN IF NOT EXISTS creation_date DATE;
    ALTER TABLE global_leads ADD COLUMN IF NOT EXISTS postal_code VARCHAR(10);
    ALTER TABLE global_leads ADD COLUMN IF NOT EXISTS contact_name VARCHAR(255);
    ALTER TABLE global_leads ADD COLUMN IF NOT EXISTS contact_role VARCHAR(100);
    ALTER TABLE global_leads ADD COLUMN IF NOT EXISTS quality_score INTEGER DEFAULT 0;
    ALTER TABLE global_leads ADD COLUMN IF NOT EXISTS company_status VARCHAR(20) DEFAULT 'active';

    RAISE NOTICE 'global_leads: colonnes ajoutées';
  END IF;
END$$;

-- ========== VÉRIFICATION ==========

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration fix_leads_columns_complete terminée !';
  RAISE NOTICE 'Colonnes ajoutées à leads:';
  RAISE NOTICE '  - address, postal_code, sector';
  RAISE NOTICE '  - siren, siret, naf_code, naf_label';
  RAISE NOTICE '  - employee_count, employee_range, legal_form';
  RAISE NOTICE '  - quality_score, data_source, enriched_at';
  RAISE NOTICE '  - contact_role, all_emails, global_lead_id';
  RAISE NOTICE '========================================';
END$$;
