-- Migration: Système de formation par rôle
-- Permet de tracker la progression des utilisateurs dans leur formation

-- Ajouter colonne training_completed aux users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS training_completed BOOLEAN DEFAULT FALSE;

-- Table de progression de formation
CREATE TABLE IF NOT EXISTS training_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Progression
  completed_modules JSONB DEFAULT '[]'::jsonb, -- Array des IDs de modules complétés
  quiz_scores JSONB DEFAULT '{}'::jsonb, -- Object {module_id: score}
  completed BOOLEAN DEFAULT FALSE,

  -- Timestamps
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Un seul progress par utilisateur
  CONSTRAINT unique_user_progress UNIQUE (user_id)
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_training_progress_user ON training_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_training_progress_completed ON training_progress(completed);
CREATE INDEX IF NOT EXISTS idx_users_training_completed ON users(training_completed);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_training_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER training_progress_updated_at
  BEFORE UPDATE ON training_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_training_progress_updated_at();

-- Commentaires pour documentation
COMMENT ON TABLE training_progress IS 'Progression des utilisateurs dans leur formation obligatoire';
COMMENT ON COLUMN training_progress.completed_modules IS 'Array JSON des IDs de modules complétés (ex: ["comm-1", "comm-2"])';
COMMENT ON COLUMN training_progress.quiz_scores IS 'Objet JSON des scores de quiz {module_id: score} (ex: {"comm-1": 3, "comm-2": 4})';
COMMENT ON COLUMN training_progress.completed IS 'Formation totalement complétée (tous les modules)';

-- Vérification
SELECT
  'Table training_progress créée avec succès' as message,
  COUNT(*) as nombre_progressions
FROM training_progress;
