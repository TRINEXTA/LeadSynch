-- Migration: Fix mailing_settings table structure
-- Date: 2025-11-17
-- Description: Ajouter les colonnes manquantes à la table mailing_settings

-- Ajouter la colonne 'configured' si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mailing_settings' AND column_name = 'configured'
  ) THEN
    ALTER TABLE mailing_settings ADD COLUMN configured BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Ajouter la colonne 'company_name' si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mailing_settings' AND column_name = 'company_name'
  ) THEN
    ALTER TABLE mailing_settings ADD COLUMN company_name VARCHAR(255);
  END IF;
END $$;

-- Ajouter la colonne 'company_address' si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mailing_settings' AND column_name = 'company_address'
  ) THEN
    ALTER TABLE mailing_settings ADD COLUMN company_address TEXT;
  END IF;
END $$;

-- Ajouter la colonne 'api_key' si elle n'existe pas (en plus de elastic_email_api_key)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mailing_settings' AND column_name = 'api_key'
  ) THEN
    ALTER TABLE mailing_settings ADD COLUMN api_key TEXT;
  END IF;
END $$;

-- Migrer les données existantes de elastic_email_api_key vers api_key si nécessaire
UPDATE mailing_settings
SET api_key = elastic_email_api_key
WHERE api_key IS NULL AND elastic_email_api_key IS NOT NULL;

-- Mettre à jour 'configured' à true pour les entrées existantes qui ont un from_email
UPDATE mailing_settings
SET configured = true
WHERE from_email IS NOT NULL AND from_email != '';

COMMENT ON COLUMN mailing_settings.configured IS 'Indique si la configuration email a été complétée';
COMMENT ON COLUMN mailing_settings.company_name IS 'Nom de l''entreprise pour les mentions légales';
COMMENT ON COLUMN mailing_settings.company_address IS 'Adresse de l''entreprise pour les mentions légales';
COMMENT ON COLUMN mailing_settings.api_key IS 'Clé API du provider email (ElasticEmail, etc.)';
