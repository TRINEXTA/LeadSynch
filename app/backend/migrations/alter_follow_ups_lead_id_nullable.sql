-- Migration: Rendre lead_id nullable dans follow_ups
-- Date: 2025-11-19
-- Description: Permet de créer des tâches générales non liées à un lead spécifique

-- Supprimer la contrainte NOT NULL sur lead_id
ALTER TABLE follow_ups
ALTER COLUMN lead_id DROP NOT NULL;

-- Supprimer la contrainte de clé étrangère existante
ALTER TABLE follow_ups
DROP CONSTRAINT IF EXISTS follow_ups_lead_id_fkey;

-- Recréer la contrainte de clé étrangère en permettant NULL
ALTER TABLE follow_ups
ADD CONSTRAINT follow_ups_lead_id_fkey
FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE;

-- Mettre à jour le commentaire
COMMENT ON COLUMN follow_ups.lead_id IS 'Lead concerné (optionnel pour tâches générales)';

-- Vérification
DO $$
DECLARE
  nullable_check TEXT;
BEGIN
  SELECT is_nullable INTO nullable_check
  FROM information_schema.columns
  WHERE table_name = 'follow_ups' AND column_name = 'lead_id';

  RAISE NOTICE '✅ Migration terminée - lead_id nullable: %', nullable_check;
END $$;
