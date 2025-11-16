-- =========================================
-- FIX: Ajout colonnes manquantes
-- Date: 2025-11-16
-- Description: Ajoute les colonnes company_name et company_address à mailing_settings
-- =========================================

-- Ajouter colonnes company_name et company_address à mailing_settings
ALTER TABLE mailing_settings
ADD COLUMN IF NOT EXISTS company_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS company_address VARCHAR(500);

-- Note: reply_to_email existe déjà, pas besoin de l'ajouter
-- Note: Pas besoin d'ajouter plan_type à tenants - on l'enlèvera du code

COMMENT ON COLUMN mailing_settings.company_name IS 'Nom de l entreprise pour le footer des emails (RGPD)';
COMMENT ON COLUMN mailing_settings.company_address IS 'Adresse de l entreprise pour le footer des emails (RGPD)';
