-- ========================================
-- FIX URGENT : Supprimer contraintes validation_requests
-- ========================================

-- Supprimer TOUTES les contraintes de clé étrangère sur validation_requests
ALTER TABLE validation_requests
DROP CONSTRAINT IF EXISTS validation_requests_lead_id_fkey;

ALTER TABLE validation_requests
DROP CONSTRAINT IF EXISTS validation_requests_requester_id_fkey;

ALTER TABLE validation_requests
DROP CONSTRAINT IF EXISTS validation_requests_tenant_id_fkey;

ALTER TABLE validation_requests
DROP CONSTRAINT IF EXISTS validation_requests_assigned_to_fkey;

ALTER TABLE validation_requests
DROP CONSTRAINT IF EXISTS validation_requests_reviewed_by_fkey;

SELECT 'Contraintes supprimées avec succès!' as message;
