-- Ajouter les colonnes pour la réinitialisation du mot de passe
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS reset_token VARCHAR(64),
ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP;

-- Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token);
