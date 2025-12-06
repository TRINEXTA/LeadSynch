-- ============================================================
-- MIGRATION COMPLÈTE - Fix Leads Table pour LeadSynch V2
-- Date: 2025-12-06
-- Description: Ajoute TOUTES les colonnes nécessaires + synchronisation
-- ============================================================

-- ========================================
-- 1. COLONNES LEADS - TOUTES LES MANQUANTES
-- ========================================

-- Adresse
ALTER TABLE leads ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);

-- Secteur et industrie
ALTER TABLE leads ADD COLUMN IF NOT EXISTS sector VARCHAR(255);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS industry VARCHAR(255);

-- Données entreprise (Sirene INSEE)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS siren VARCHAR(9);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS siret VARCHAR(14);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS naf_code VARCHAR(10);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS naf_label VARCHAR(255);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS employee_count INTEGER;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS employee_range VARCHAR(50);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS legal_form VARCHAR(100);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS creation_date DATE;

-- Qualité et source
ALTER TABLE leads ADD COLUMN IF NOT EXISTS quality_score INTEGER DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS data_source VARCHAR(50);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS enriched_at TIMESTAMP;

-- Contact
ALTER TABLE leads ADD COLUMN IF NOT EXISTS contact_name VARCHAR(255);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS contact_role VARCHAR(100);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS all_emails TEXT;

-- Référence cache global
ALTER TABLE leads ADD COLUMN IF NOT EXISTS global_lead_id UUID;

-- ========================================
-- 2. COLONNES LEAD_DATABASES - MANQUANTES
-- ========================================

ALTER TABLE lead_databases ADD COLUMN IF NOT EXISTS sector VARCHAR(255);
ALTER TABLE lead_databases ADD COLUMN IF NOT EXISTS leads_count INTEGER DEFAULT 0;

-- ========================================
-- 3. TABLE LEAD_DATABASE_RELATIONS - Vérifier
-- ========================================

CREATE TABLE IF NOT EXISTS lead_database_relations (
  lead_id UUID NOT NULL,
  database_id UUID NOT NULL,
  added_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (lead_id, database_id)
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_ldr_lead ON lead_database_relations(lead_id);
CREATE INDEX IF NOT EXISTS idx_ldr_database ON lead_database_relations(database_id);

-- ========================================
-- 4. SYNCHRONISER LEADS.DATABASE_ID
-- ========================================

-- Pour les leads qui n'ont que des relations (import CSV)
UPDATE leads l
SET database_id = (
  SELECT ldr.database_id
  FROM lead_database_relations ldr
  WHERE ldr.lead_id = l.id
  LIMIT 1
)
WHERE l.database_id IS NULL
  AND EXISTS (
    SELECT 1 FROM lead_database_relations ldr WHERE ldr.lead_id = l.id
  );

-- ========================================
-- 5. CRÉER RELATIONS MANQUANTES
-- ========================================

-- Pour les leads qui ont database_id mais pas de relation
INSERT INTO lead_database_relations (lead_id, database_id, added_at)
SELECT l.id, l.database_id, COALESCE(l.created_at, NOW())
FROM leads l
WHERE l.database_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM lead_database_relations ldr
    WHERE ldr.lead_id = l.id AND ldr.database_id = l.database_id
  )
ON CONFLICT (lead_id, database_id) DO NOTHING;

-- ========================================
-- 6. RECALCULER COMPTEURS
-- ========================================

UPDATE lead_databases ld
SET leads_count = (
  SELECT COUNT(DISTINCT lead_id) FROM (
    SELECT id as lead_id FROM leads WHERE database_id = ld.id
    UNION
    SELECT lead_id FROM lead_database_relations WHERE database_id = ld.id
  ) combined
);

-- ========================================
-- 7. INDEX POUR PERFORMANCE
-- ========================================

CREATE INDEX IF NOT EXISTS idx_leads_siret ON leads(siret);
CREATE INDEX IF NOT EXISTS idx_leads_siren ON leads(siren);
CREATE INDEX IF NOT EXISTS idx_leads_naf ON leads(naf_code);
CREATE INDEX IF NOT EXISTS idx_leads_quality ON leads(quality_score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_sector ON leads(sector);
CREATE INDEX IF NOT EXISTS idx_leads_city ON leads(city);
CREATE INDEX IF NOT EXISTS idx_leads_database_id ON leads(database_id);
CREATE INDEX IF NOT EXISTS idx_leads_data_source ON leads(data_source);
CREATE INDEX IF NOT EXISTS idx_leads_contact ON leads(contact_name);

-- ========================================
-- 8. VÉRIFICATION FINALE
-- ========================================

DO $$
DECLARE
  col_count INTEGER;
  leads_count INTEGER;
  relations_count INTEGER;
BEGIN
  -- Compter les colonnes
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns
  WHERE table_name = 'leads'
  AND column_name IN ('address', 'postal_code', 'sector', 'industry', 'siren', 'siret',
                      'naf_code', 'employee_count', 'quality_score', 'data_source',
                      'contact_name', 'contact_role');

  -- Compter les leads
  SELECT COUNT(*) INTO leads_count FROM leads;

  -- Compter les relations
  SELECT COUNT(*) INTO relations_count FROM lead_database_relations;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRATION COMPLÈTE TERMINÉE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Colonnes vérifiées: %/12', col_count;
  RAISE NOTICE 'Leads totaux: %', leads_count;
  RAISE NOTICE 'Relations lead-database: %', relations_count;
  RAISE NOTICE '========================================';
END$$;
