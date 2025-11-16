-- =========================================
-- MIGRATION 011: Ajouter tenant_id à pipeline_leads et training_progress
-- Date: 2025-11-16
-- Description: CRITIQUE - Sécurité multi-tenant
-- =========================================

-- ========== 1. PIPELINE_LEADS ==========
-- Ajouter la colonne tenant_id
ALTER TABLE pipeline_leads
ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- Remplir avec les données existantes (depuis leads)
UPDATE pipeline_leads pl
SET tenant_id = l.tenant_id
FROM leads l
WHERE pl.lead_id = l.id
  AND pl.tenant_id IS NULL;

-- Rendre NOT NULL
ALTER TABLE pipeline_leads
ALTER COLUMN tenant_id SET NOT NULL;

-- Ajouter FK
ALTER TABLE pipeline_leads
ADD CONSTRAINT IF NOT EXISTS fk_pipeline_leads_tenant
FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_pipeline_leads_tenant
  ON pipeline_leads(tenant_id);

CREATE INDEX IF NOT EXISTS idx_pipeline_leads_tenant_stage
  ON pipeline_leads(tenant_id, stage);

CREATE INDEX IF NOT EXISTS idx_pipeline_leads_tenant_campaign
  ON pipeline_leads(tenant_id, campaign_id);

-- Modifier contrainte UNIQUE pour inclure tenant_id
ALTER TABLE pipeline_leads
DROP CONSTRAINT IF EXISTS pipeline_leads_lead_id_campaign_id_key;

ALTER TABLE pipeline_leads
ADD CONSTRAINT pipeline_leads_unique_tenant_lead_campaign
  UNIQUE (tenant_id, lead_id, campaign_id);

COMMENT ON COLUMN pipeline_leads.tenant_id IS 'Tenant ID pour isolation multi-tenant (ajouté migration 011)';

-- ========== 2. TRAINING_PROGRESS ==========
-- Vérifier si la table existe
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'training_progress') THEN
    -- Ajouter tenant_id
    ALTER TABLE training_progress
    ADD COLUMN IF NOT EXISTS tenant_id UUID;

    -- Remplir depuis users
    UPDATE training_progress tp
    SET tenant_id = u.tenant_id
    FROM users u
    WHERE tp.user_id = u.id
      AND tp.tenant_id IS NULL;

    -- Rendre NOT NULL
    ALTER TABLE training_progress
    ALTER COLUMN tenant_id SET NOT NULL;

    -- FK
    ALTER TABLE training_progress
    ADD CONSTRAINT IF NOT EXISTS fk_training_progress_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

    -- Index
    CREATE INDEX IF NOT EXISTS idx_training_progress_tenant
      ON training_progress(tenant_id);
  END IF;
END $$;

-- ========== 3. VÉRIFICATION ==========
-- Afficher les résultats
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 011 terminée';
  RAISE NOTICE 'Pipeline_leads: tenant_id ajouté et indexé';
  RAISE NOTICE 'Training_progress: tenant_id ajouté si table existe';
END $$;
