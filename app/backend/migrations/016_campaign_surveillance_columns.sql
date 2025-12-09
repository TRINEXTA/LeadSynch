-- Migration 016: Ajout des colonnes pour le système de surveillance des campagnes
-- Date: 2025-12-09
-- Description: Ajoute surveillance_started_at et closed_at pour la gestion du cycle de vie des campagnes

-- ==================== COLONNES SURVEILLANCE ====================

-- Colonne pour marquer le début de la surveillance (après les relances)
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS surveillance_started_at TIMESTAMPTZ DEFAULT NULL;

-- Colonne pour marquer la clôture définitive de la campagne
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ DEFAULT NULL;

-- ==================== MISE À JOUR DES STATUTS ====================

-- Mise à jour du type ENUM si nécessaire (les nouveaux statuts)
-- Note: PostgreSQL ne permet pas d'ajouter facilement des valeurs aux ENUM
-- donc on utilise VARCHAR pour le statut ou on s'assure que les valeurs sont acceptées

-- Commentaires pour documenter les statuts
COMMENT ON COLUMN campaigns.status IS 'Statuts possibles: draft, scheduled, active, paused, completed, relances_en_cours, surveillance, closed, archived';
COMMENT ON COLUMN campaigns.surveillance_started_at IS 'Date de début de la période de surveillance (15 jours avant clôture auto)';
COMMENT ON COLUMN campaigns.closed_at IS 'Date de clôture définitive de la campagne';

-- ==================== INDEX POUR PERFORMANCE ====================

-- Index pour trouver rapidement les campagnes en surveillance
CREATE INDEX IF NOT EXISTS idx_campaigns_surveillance
ON campaigns (status, surveillance_started_at)
WHERE status = 'surveillance';

-- Index pour les campagnes clôturées
CREATE INDEX IF NOT EXISTS idx_campaigns_closed
ON campaigns (status, closed_at)
WHERE status = 'closed';

-- ==================== VÉRIFICATION ====================

-- Vérifier que les colonnes existent
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaigns'
    AND column_name = 'surveillance_started_at'
  ) THEN
    RAISE NOTICE 'Colonne surveillance_started_at: OK';
  ELSE
    RAISE WARNING 'Colonne surveillance_started_at: MANQUANTE';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaigns'
    AND column_name = 'closed_at'
  ) THEN
    RAISE NOTICE 'Colonne closed_at: OK';
  ELSE
    RAISE WARNING 'Colonne closed_at: MANQUANTE';
  END IF;
END $$;
