-- Migration: Upgrade Leads Schema v2.0
-- Date: 2025-12-06
-- Description: Ajouter les colonnes manquantes pour l'enrichissement des leads
--              (SIRET, NAF, effectifs, score qualité, etc.)

-- ========== GLOBAL_LEADS - Nouvelles colonnes ==========

-- SIRET (14 chiffres)
ALTER TABLE global_leads ADD COLUMN IF NOT EXISTS siret VARCHAR(14);
CREATE INDEX IF NOT EXISTS idx_global_leads_siret ON global_leads(siret);

-- SIREN (9 chiffres)
ALTER TABLE global_leads ADD COLUMN IF NOT EXISTS siren VARCHAR(9);
CREATE INDEX IF NOT EXISTS idx_global_leads_siren ON global_leads(siren);

-- Code NAF (activité)
ALTER TABLE global_leads ADD COLUMN IF NOT EXISTS naf_code VARCHAR(10);
ALTER TABLE global_leads ADD COLUMN IF NOT EXISTS naf_label VARCHAR(255);

-- Effectifs
ALTER TABLE global_leads ADD COLUMN IF NOT EXISTS employee_count INTEGER;
ALTER TABLE global_leads ADD COLUMN IF NOT EXISTS employee_range VARCHAR(50);

-- Forme juridique
ALTER TABLE global_leads ADD COLUMN IF NOT EXISTS legal_form VARCHAR(100);

-- Date création entreprise
ALTER TABLE global_leads ADD COLUMN IF NOT EXISTS creation_date DATE;

-- Code postal (séparé de city)
ALTER TABLE global_leads ADD COLUMN IF NOT EXISTS postal_code VARCHAR(10);

-- Contact
ALTER TABLE global_leads ADD COLUMN IF NOT EXISTS contact_name VARCHAR(255);
ALTER TABLE global_leads ADD COLUMN IF NOT EXISTS contact_role VARCHAR(100);

-- Score qualité (0-100)
ALTER TABLE global_leads ADD COLUMN IF NOT EXISTS quality_score INTEGER DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_global_leads_quality ON global_leads(quality_score DESC);

-- Statut de l'entreprise (active, inactive)
ALTER TABLE global_leads ADD COLUMN IF NOT EXISTS company_status VARCHAR(20) DEFAULT 'active';

-- ========== LEADS - Nouvelles colonnes ==========

-- SIRET
ALTER TABLE leads ADD COLUMN IF NOT EXISTS siret VARCHAR(14);
CREATE INDEX IF NOT EXISTS idx_leads_siret ON leads(siret);

-- NAF
ALTER TABLE leads ADD COLUMN IF NOT EXISTS naf_code VARCHAR(10);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS naf_label VARCHAR(255);

-- Effectifs
ALTER TABLE leads ADD COLUMN IF NOT EXISTS employee_count INTEGER;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS employee_range VARCHAR(50);

-- Forme juridique
ALTER TABLE leads ADD COLUMN IF NOT EXISTS legal_form VARCHAR(100);

-- Date création entreprise
ALTER TABLE leads ADD COLUMN IF NOT EXISTS creation_date DATE;

-- Contact additionnel
ALTER TABLE leads ADD COLUMN IF NOT EXISTS contact_role VARCHAR(100);

-- Score qualité
ALTER TABLE leads ADD COLUMN IF NOT EXISTS quality_score INTEGER DEFAULT 0;

-- Tous les emails trouvés
ALTER TABLE leads ADD COLUMN IF NOT EXISTS all_emails TEXT;

-- Source de la donnée
ALTER TABLE leads ADD COLUMN IF NOT EXISTS data_source VARCHAR(50);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS enriched_at TIMESTAMP;

-- Global lead ID (référence au cache)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS global_lead_id UUID;
CREATE INDEX IF NOT EXISTS idx_leads_global_lead ON leads(global_lead_id);

-- ========== CONTRAINTES ==========

-- Contrainte unique sur SIRET dans global_leads (si non null)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'global_leads_siret_unique'
  ) THEN
    ALTER TABLE global_leads ADD CONSTRAINT global_leads_siret_unique UNIQUE (siret);
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN unique_violation THEN NULL;
END $$;

-- ========== INDEX COMPOSITES ==========

-- Index pour recherche par secteur + ville + qualité
CREATE INDEX IF NOT EXISTS idx_global_leads_search_v2
ON global_leads(industry, city, quality_score DESC)
WHERE company_status = 'active';

-- Index pour recherche par NAF
CREATE INDEX IF NOT EXISTS idx_global_leads_naf ON global_leads(naf_code);
CREATE INDEX IF NOT EXISTS idx_leads_naf ON leads(naf_code);

-- Index pour recherche par effectifs
CREATE INDEX IF NOT EXISTS idx_global_leads_employees ON global_leads(employee_count);

-- ========== COMMENTS ==========

COMMENT ON COLUMN global_leads.siret IS 'Numéro SIRET (14 chiffres) - identifiant unique établissement';
COMMENT ON COLUMN global_leads.siren IS 'Numéro SIREN (9 chiffres) - identifiant unique entreprise';
COMMENT ON COLUMN global_leads.naf_code IS 'Code NAF/APE - activité principale';
COMMENT ON COLUMN global_leads.employee_count IS 'Nombre approximatif d''employés';
COMMENT ON COLUMN global_leads.quality_score IS 'Score de qualité des données (0-100)';
COMMENT ON COLUMN leads.global_lead_id IS 'Référence vers le cache global_leads';

-- ========== FIN ==========

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration upgrade_leads_schema_v2 terminée !';
  RAISE NOTICE 'Nouvelles colonnes ajoutées:';
  RAISE NOTICE '  - siret, siren, naf_code, naf_label';
  RAISE NOTICE '  - employee_count, employee_range';
  RAISE NOTICE '  - legal_form, creation_date';
  RAISE NOTICE '  - quality_score, company_status';
  RAISE NOTICE '  - contact_name, contact_role';
  RAISE NOTICE '========================================';
END$$;
