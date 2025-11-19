-- Migration: Ajouter champ created_by à follow_ups
-- Date: 2025-11-19
-- Description: Permet de tracker qui a créé chaque tâche (pas seulement à qui elle est assignée)

-- Ajouter la colonne created_by
ALTER TABLE follow_ups
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);

-- Remplir avec user_id pour les tâches existantes (on suppose que celui assigné = créateur pour l'ancien data)
UPDATE follow_ups
SET created_by = user_id
WHERE created_by IS NULL;

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_follow_ups_created_by ON follow_ups(created_by);

-- Commentaire
COMMENT ON COLUMN follow_ups.created_by IS 'Utilisateur qui a créé la tâche (peut différer de user_id qui est l''assigné)';

-- Vérification
DO $$
DECLARE
  column_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'follow_ups'
    AND column_name = 'created_by'
  ) INTO column_exists;

  RAISE NOTICE '✅ Migration terminée - created_by existe: %', column_exists;
END $$;
