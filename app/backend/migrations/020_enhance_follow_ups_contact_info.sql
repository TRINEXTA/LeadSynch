-- =========================================
-- MIGRATION 020: Améliorer follow_ups avec informations de contact
-- Date: 2025-01-13
-- Description: Ajoute champs contact_name, contact_phone, contact_method
-- =========================================

-- ========== 1. AJOUTER LES NOUVEAUX CHAMPS ==========

-- Nom de la personne à contacter (peut être différent du contact principal du lead)
ALTER TABLE follow_ups
ADD COLUMN IF NOT EXISTS contact_name VARCHAR(255);

-- Numéro de téléphone alternatif (si différent du numéro du lead)
ALTER TABLE follow_ups
ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50);

-- Méthode de contact préférée (phone ou email)
ALTER TABLE follow_ups
ADD COLUMN IF NOT EXISTS contact_method VARCHAR(20) DEFAULT 'phone';

-- ========== 2. COMMENTAIRES ==========
COMMENT ON COLUMN follow_ups.contact_name IS 'Nom de la personne à contacter (si différent du contact principal)';
COMMENT ON COLUMN follow_ups.contact_phone IS 'Numéro alternatif à appeler (si différent du lead)';
COMMENT ON COLUMN follow_ups.contact_method IS 'Méthode de contact: phone, email';

-- ========== 3. VÉRIFICATION ==========
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 020 terminée';
  RAISE NOTICE 'Champs ajoutés: contact_name, contact_phone, contact_method';
END $$;
