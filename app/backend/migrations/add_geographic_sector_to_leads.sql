-- Migration: Ajouter secteur géographique aux leads
-- Permet l'affectation automatique par code postal

-- Ajouter colonne geographic_sector_id
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS geographic_sector_id UUID REFERENCES geographic_sectors(id) ON DELETE SET NULL;

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_leads_geographic_sector
  ON leads(geographic_sector_id) WHERE geographic_sector_id IS NOT NULL;

-- Index composite pour filtrage rapide
CREATE INDEX IF NOT EXISTS idx_leads_tenant_sector
  ON leads(tenant_id, geographic_sector_id);

-- Commentaire
COMMENT ON COLUMN leads.geographic_sector_id IS 'Secteur géographique assigné automatiquement basé sur le code postal';

-- Fonction pour trouver le secteur géographique d'un lead basé sur son code postal
CREATE OR REPLACE FUNCTION assign_geographic_sector_to_lead(
  p_tenant_id UUID,
  p_postal_code VARCHAR
) RETURNS UUID AS $$
DECLARE
  v_sector_id UUID;
BEGIN
  -- Nettoyer le code postal (enlever espaces)
  p_postal_code := TRIM(p_postal_code);

  -- Chercher le secteur qui contient ce code postal
  SELECT id INTO v_sector_id
  FROM geographic_sectors
  WHERE tenant_id = p_tenant_id
    AND is_active = true
    AND p_postal_code = ANY(postal_codes)
  LIMIT 1;

  RETURN v_sector_id;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour chercher par préfixe si pas de match exact
CREATE OR REPLACE FUNCTION assign_geographic_sector_by_prefix(
  p_tenant_id UUID,
  p_postal_code VARCHAR
) RETURNS UUID AS $$
DECLARE
  v_sector_id UUID;
  v_prefix VARCHAR;
BEGIN
  -- Nettoyer le code postal
  p_postal_code := TRIM(p_postal_code);

  -- Chercher d'abord un match exact
  v_sector_id := assign_geographic_sector_to_lead(p_tenant_id, p_postal_code);

  IF v_sector_id IS NOT NULL THEN
    RETURN v_sector_id;
  END IF;

  -- Si pas de match exact, chercher par préfixe (ex: 75 pour Paris)
  v_prefix := SUBSTRING(p_postal_code FROM 1 FOR 2);

  SELECT id INTO v_sector_id
  FROM geographic_sectors
  WHERE tenant_id = p_tenant_id
    AND is_active = true
    AND EXISTS (
      SELECT 1 FROM unnest(postal_codes) pc
      WHERE pc LIKE v_prefix || '%'
    )
  LIMIT 1;

  RETURN v_sector_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour assigner automatiquement le secteur lors de l'insertion/mise à jour d'un lead
CREATE OR REPLACE FUNCTION auto_assign_geographic_sector()
RETURNS TRIGGER AS $$
BEGIN
  -- Si le lead a un code postal et pas encore de secteur assigné
  IF NEW.postal_code IS NOT NULL AND NEW.postal_code != '' AND NEW.geographic_sector_id IS NULL THEN
    NEW.geographic_sector_id := assign_geographic_sector_by_prefix(NEW.tenant_id, NEW.postal_code);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger
DROP TRIGGER IF EXISTS trigger_auto_assign_geographic_sector ON leads;
CREATE TRIGGER trigger_auto_assign_geographic_sector
  BEFORE INSERT OR UPDATE OF postal_code
  ON leads
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_geographic_sector();

-- Commentaires
COMMENT ON FUNCTION assign_geographic_sector_to_lead IS 'Trouve le secteur géographique correspondant à un code postal (match exact)';
COMMENT ON FUNCTION assign_geographic_sector_by_prefix IS 'Trouve le secteur géographique par code postal exact ou préfixe (ex: 75 pour Paris)';
COMMENT ON FUNCTION auto_assign_geographic_sector IS 'Trigger function qui assigne automatiquement le secteur géographique aux leads';

-- Mettre à jour les leads existants (optionnel - à exécuter manuellement si souhaité)
-- UPDATE leads
-- SET geographic_sector_id = assign_geographic_sector_by_prefix(tenant_id, postal_code)
-- WHERE postal_code IS NOT NULL
--   AND postal_code != ''
--   AND geographic_sector_id IS NULL;

SELECT 'Migration terminée: geographic_sector_id ajouté aux leads avec auto-assignment' as status;
