-- =========================================
-- MIGRATION: Correction accès pipeline managers + Index performance
-- Date: 2026-01-07
-- Description:
--   1. Ajoute index sur users.manager_id pour la requête hiérarchique
--   2. Ajoute index composites pour améliorer les performances du pipeline
-- =========================================

-- Index pour la requête hiérarchique (managers voient leurs subordonnés)
CREATE INDEX IF NOT EXISTS idx_users_manager_id ON users(manager_id);

-- Index composites pour le pipeline (accélère les filtres par tenant + assigned_user)
CREATE INDEX IF NOT EXISTS idx_pipeline_leads_tenant_assigned
  ON pipeline_leads(tenant_id, assigned_user_id);

CREATE INDEX IF NOT EXISTS idx_pipeline_leads_tenant_assigned_stage
  ON pipeline_leads(tenant_id, assigned_user_id, stage);

-- Index pour validation_requests (utilisé dans la sous-requête EXISTS)
CREATE INDEX IF NOT EXISTS idx_validation_requests_lead_status
  ON validation_requests(lead_id, status);

-- Index sur leads.assigned_to pour la jointure
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to
  ON leads(assigned_to);

-- Vérification
DO $$
BEGIN
  RAISE NOTICE '=============================================';
  RAISE NOTICE '=== Migration 018: Manager Pipeline Access ===';
  RAISE NOTICE '=============================================';
  RAISE NOTICE 'Index créés:';
  RAISE NOTICE '  - idx_users_manager_id';
  RAISE NOTICE '  - idx_pipeline_leads_tenant_assigned';
  RAISE NOTICE '  - idx_pipeline_leads_tenant_assigned_stage';
  RAISE NOTICE '  - idx_validation_requests_lead_status';
  RAISE NOTICE '  - idx_leads_assigned_to';
  RAISE NOTICE '';
  RAISE NOTICE 'Correction: Les managers voient maintenant les leads';
  RAISE NOTICE 'de leurs subordonnés (users.manager_id = manager.id)';
END $$;
