-- Migration: Ajouter type 'leadshow' à validation_requests
-- Date: 2025-11-19
-- Description: Modifie la contrainte CHECK pour accepter le type 'leadshow'

-- Supprimer l'ancienne contrainte CHECK
ALTER TABLE validation_requests
DROP CONSTRAINT IF EXISTS validation_requests_type_check;

-- Ajouter la nouvelle contrainte CHECK avec 'leadshow'
ALTER TABLE validation_requests
ADD CONSTRAINT validation_requests_type_check
CHECK (type IN ('validation', 'help', 'leadshow'));

-- Mettre à jour les commentaires
COMMENT ON COLUMN validation_requests.type IS 'Type: validation (approbation), help (demande d''aide) ou leadshow (escalade au responsable)';
