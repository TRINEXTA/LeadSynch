-- Migration: Création table manager_requests
-- Date: 2025-11-16
-- Description: Table pour gérer les demandes d'aide/validation manager

CREATE TABLE IF NOT EXISTS manager_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relations
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Type de demande
  request_type VARCHAR(50) NOT NULL CHECK (request_type IN ('help', 'validation', 'show')),

  -- Contenu
  message TEXT NOT NULL,
  response_message TEXT,

  -- Statut et urgence
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'rejected')),
  urgency VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (urgency IN ('low', 'normal', 'urgent')),

  -- Dates
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_manager_requests_tenant ON manager_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_manager_requests_lead ON manager_requests(lead_id);
CREATE INDEX IF NOT EXISTS idx_manager_requests_requested_by ON manager_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_manager_requests_status ON manager_requests(status);
CREATE INDEX IF NOT EXISTS idx_manager_requests_urgency ON manager_requests(urgency);
CREATE INDEX IF NOT EXISTS idx_manager_requests_created_at ON manager_requests(created_at DESC);

-- Index composite pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_manager_requests_tenant_status ON manager_requests(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_manager_requests_tenant_urgency ON manager_requests(tenant_id, urgency);

-- Commentaires
COMMENT ON TABLE manager_requests IS 'Demandes d''aide, validation ou signalement de prospects prioritaires pour les managers';
COMMENT ON COLUMN manager_requests.request_type IS 'Type de demande: help (aide), validation (demande validation), show (prospect prioritaire)';
COMMENT ON COLUMN manager_requests.status IS 'Statut: pending (en attente), in_progress (en cours), resolved (résolu), rejected (rejeté)';
COMMENT ON COLUMN manager_requests.urgency IS 'Niveau d''urgence: low (faible), normal, urgent';
