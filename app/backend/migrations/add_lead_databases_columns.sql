-- Migration: Add missing columns to lead_databases table
-- Date: 2025-12-06
-- Description: Adds sector and leads_count columns required by generate-leads-v2

-- ========== LEAD_DATABASES - COLONNES MANQUANTES ==========

-- Colonne sector (pour stocker le secteur principal de la base)
ALTER TABLE lead_databases ADD COLUMN IF NOT EXISTS sector VARCHAR(255);

-- Colonne leads_count (compteur de leads)
ALTER TABLE lead_databases ADD COLUMN IF NOT EXISTS leads_count INTEGER DEFAULT 0;

-- Index sur sector pour recherches rapides
CREATE INDEX IF NOT EXISTS idx_lead_databases_sector ON lead_databases(sector);

-- Index sur tenant + sector pour filtrage multi-tenant
CREATE INDEX IF NOT EXISTS idx_lead_databases_tenant_sector ON lead_databases(tenant_id, sector);

-- ========== SYNCHRONISATION LEADS_COUNT ==========

-- Mettre à jour leads_count avec le nombre réel de leads
UPDATE lead_databases ld
SET leads_count = (
  SELECT COUNT(*)
  FROM leads l
  WHERE l.database_id = ld.id
);

-- ========== VÉRIFICATION ==========

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration add_lead_databases_columns terminée !';
  RAISE NOTICE 'Colonnes ajoutées:';
  RAISE NOTICE '  - sector (VARCHAR 255)';
  RAISE NOTICE '  - leads_count (INTEGER DEFAULT 0)';
  RAISE NOTICE '========================================';
END$$;
