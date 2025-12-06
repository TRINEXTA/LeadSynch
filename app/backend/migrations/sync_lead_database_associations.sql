-- Migration: Synchronize lead-database associations
-- Date: 2025-12-06
-- Description: Ensures consistency between leads.database_id and lead_database_relations table

-- ========================================
-- PROBLÈME RÉSOLU:
-- Certaines bases utilisent leads.database_id (generate-leads-v2)
-- D'autres utilisent lead_database_relations (import-csv)
-- Cette migration synchronise les deux méthodes
-- ========================================

-- 1. Pour les leads qui n'ont que lead_database_relations (pas de database_id):
--    Mettre à jour leads.database_id avec la première relation trouvée
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

-- 2. Pour les leads qui ont database_id mais pas de relation:
--    Créer l'entrée dans lead_database_relations
INSERT INTO lead_database_relations (lead_id, database_id, added_at)
SELECT l.id, l.database_id, COALESCE(l.created_at, NOW())
FROM leads l
WHERE l.database_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM lead_database_relations ldr
    WHERE ldr.lead_id = l.id AND ldr.database_id = l.database_id
  )
ON CONFLICT (lead_id, database_id) DO NOTHING;

-- 3. Recalculer les compteurs pour toutes les bases
UPDATE lead_databases ld
SET
  leads_count = (
    SELECT COUNT(DISTINCT lead_id) FROM (
      SELECT id as lead_id FROM leads WHERE database_id = ld.id
      UNION
      SELECT lead_id FROM lead_database_relations WHERE database_id = ld.id
    ) combined
  ),
  updated_at = NOW();

-- ========================================
-- VÉRIFICATION
-- ========================================

DO $$
DECLARE
  leads_updated INTEGER;
  relations_created INTEGER;
  bases_updated INTEGER;
BEGIN
  -- Compter les modifications
  GET DIAGNOSTICS leads_updated = ROW_COUNT;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration sync_lead_database_associations terminée !';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Actions effectuées:';
  RAISE NOTICE '  1. Leads mis à jour avec database_id';
  RAISE NOTICE '  2. Relations créées dans lead_database_relations';
  RAISE NOTICE '  3. Compteurs recalculés pour toutes les bases';
  RAISE NOTICE '========================================';
END$$;
