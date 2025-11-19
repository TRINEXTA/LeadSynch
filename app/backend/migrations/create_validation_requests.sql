-- Migration: Système de demandes de validation et d'aide
-- Permet aux commerciaux de demander validation ou aide aux managers

-- Table des demandes de validation/aide
CREATE TABLE IF NOT EXISTS validation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,

  -- Type de demande
  type VARCHAR(20) NOT NULL CHECK (type IN ('validation', 'help', 'leadshow')),

  -- Qui demande
  requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Contexte
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,

  -- Détails de la demande
  subject VARCHAR(255) NOT NULL,
  message TEXT,
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

  -- Statut workflow
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'approved', 'rejected', 'resolved', 'cancelled')),

  -- Traitement par manager
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL, -- Manager assigné
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP,
  manager_response TEXT,
  resolution_notes TEXT,

  -- Métadonnées
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP,

  -- Index pour performances
  CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Index pour recherches rapides
CREATE INDEX IF NOT EXISTS idx_validation_requests_tenant ON validation_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_validation_requests_requester ON validation_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_validation_requests_status ON validation_requests(status);
CREATE INDEX IF NOT EXISTS idx_validation_requests_type ON validation_requests(type);
CREATE INDEX IF NOT EXISTS idx_validation_requests_assigned ON validation_requests(assigned_to);
CREATE INDEX IF NOT EXISTS idx_validation_requests_lead ON validation_requests(lead_id);
CREATE INDEX IF NOT EXISTS idx_validation_requests_campaign ON validation_requests(campaign_id);
CREATE INDEX IF NOT EXISTS idx_validation_requests_created ON validation_requests(created_at DESC);

-- Index composites pour requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_validation_requests_tenant_status
  ON validation_requests(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_validation_requests_tenant_type_status
  ON validation_requests(tenant_id, type, status);
CREATE INDEX IF NOT EXISTS idx_validation_requests_assigned_status
  ON validation_requests(assigned_to, status) WHERE assigned_to IS NOT NULL;

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_validation_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();

  -- Si résolu ou approuvé/rejeté, mettre resolved_at
  IF NEW.status IN ('approved', 'rejected', 'resolved', 'cancelled') AND OLD.status NOT IN ('approved', 'rejected', 'resolved', 'cancelled') THEN
    NEW.resolved_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validation_requests_updated_at
  BEFORE UPDATE ON validation_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_validation_requests_updated_at();

-- Commentaires pour documentation
COMMENT ON TABLE validation_requests IS 'Demandes de validation, aide et escalades (leadshow) des commerciaux aux managers';
COMMENT ON COLUMN validation_requests.type IS 'Type: validation (approbation), help (demande d''aide) ou leadshow (escalade au responsable)';
COMMENT ON COLUMN validation_requests.status IS 'Statut: pending, in_review, approved, rejected, resolved, cancelled';
COMMENT ON COLUMN validation_requests.priority IS 'Priorité: low, normal, high, urgent';

-- Données de démonstration (optionnel - commenter pour production)
-- INSERT INTO validation_requests (tenant_id, type, requester_id, subject, message, priority)
-- SELECT
--   t.id as tenant_id,
--   'validation' as type,
--   u.id as requester_id,
--   'Validation deal important' as subject,
--   'Deal de 50k€ avec prospect qualifié - besoin validation pour proposition commerciale' as message,
--   'high' as priority
-- FROM tenants t
-- CROSS JOIN users u
-- WHERE u.role = 'user'
-- LIMIT 1;

-- Vérification
SELECT
  'Table validation_requests créée avec succès' as message,
  COUNT(*) as nombre_demandes
FROM validation_requests;
