-- =========================================
-- MIGRATION 017: Superviseur campagne + Filtrage telephone
-- Date: 2025-01-06
-- Description: Ajoute le superviseur aux campagnes et le comptage des leads exclus
-- SECURITE: Migration ADDITIVE uniquement - Ne supprime/modifie rien d'existant
-- =========================================

-- ========== 1. AJOUT SUPERVISEUR CAMPAGNE ==========

-- Colonne pour le superviseur/manager de la campagne
-- Permet de designer un responsable qui supervise les commerciaux
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS supervisor_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Commentaire explicatif
COMMENT ON COLUMN campaigns.supervisor_id IS 'ID du superviseur/manager qui a une vue d''ensemble sur la campagne et les activites des commerciaux';

-- ========== 2. COMPTEUR LEADS EXCLUS (PHONE) ==========

-- Nombre de leads exclus car sans telephone (pour campagnes phone)
-- Utile pour le reporting et l'information utilisateur
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS leads_excluded_no_phone INTEGER DEFAULT 0;

COMMENT ON COLUMN campaigns.leads_excluded_no_phone IS 'Nombre de leads exclus de la campagne car ils n''ont pas de numero de telephone (campagnes phoning uniquement)';

-- ========== 3. INDEXES POUR PERFORMANCE ==========

-- Index sur supervisor_id pour requetes filtrées
CREATE INDEX IF NOT EXISTS idx_campaigns_supervisor_id ON campaigns(supervisor_id) WHERE supervisor_id IS NOT NULL;

-- Index composite pour requetes superviseur + tenant
CREATE INDEX IF NOT EXISTS idx_campaigns_tenant_supervisor ON campaigns(tenant_id, supervisor_id) WHERE supervisor_id IS NOT NULL;

-- ========== 4. VERIFICATION ==========

DO $$
DECLARE
  col_supervisor_exists BOOLEAN;
  col_excluded_exists BOOLEAN;
BEGIN
  -- Verifier que les colonnes existent
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaigns' AND column_name = 'supervisor_id'
  ) INTO col_supervisor_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaigns' AND column_name = 'leads_excluded_no_phone'
  ) INTO col_excluded_exists;

  IF col_supervisor_exists AND col_excluded_exists THEN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration 017 terminee avec succes !';
    RAISE NOTICE '- Colonne supervisor_id: OK';
    RAISE NOTICE '- Colonne leads_excluded_no_phone: OK';
    RAISE NOTICE '========================================';
  ELSE
    RAISE WARNING 'Migration 017: Certaines colonnes n''ont pas ete creees correctement';
  END IF;
END$$;
