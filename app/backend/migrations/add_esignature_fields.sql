-- Migration: Add E-Signature fields for Proposals and Contracts
-- Date: 2025-11-26

-- =====================================================
-- PROPOSALS (Propositions) - Add acceptance tracking
-- =====================================================

-- Token unique pour l'acceptation client
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS acceptance_token VARCHAR(64) UNIQUE;

-- Tracking de l'acceptation
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS acceptor_email VARCHAR(255);
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS acceptor_ip VARCHAR(45);
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS acceptor_user_agent TEXT;

-- Lien public pour visualisation
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS public_link_sent_at TIMESTAMPTZ;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS public_link_viewed_at TIMESTAMPTZ;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- Index pour recherche par token
CREATE INDEX IF NOT EXISTS idx_proposals_acceptance_token ON proposals(acceptance_token);

-- =====================================================
-- CONTRACTS - Add signature tracking with email verification
-- =====================================================

-- Token unique pour la signature
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS signature_token VARCHAR(64) UNIQUE;

-- Code de vérification email (6 chiffres)
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS verification_code VARCHAR(6);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS verification_code_expires_at TIMESTAMPTZ;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS verification_attempts INTEGER DEFAULT 0;

-- Tracking de la signature
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS signer_email VARCHAR(255);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS signer_ip VARCHAR(45);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS signer_user_agent TEXT;

-- Lien public pour visualisation
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS public_link_sent_at TIMESTAMPTZ;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS public_link_viewed_at TIMESTAMPTZ;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- Conditions acceptées
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;

-- PDF signé stocké
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS signed_pdf_url TEXT;

-- Index pour recherche par token
CREATE INDEX IF NOT EXISTS idx_contracts_signature_token ON contracts(signature_token);

-- =====================================================
-- CONTRACT_SIGNATURES - Historique détaillé des signatures
-- =====================================================

CREATE TABLE IF NOT EXISTS contract_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Informations du signataire
  signer_email VARCHAR(255) NOT NULL,
  signer_name VARCHAR(255),
  signer_ip VARCHAR(45),
  signer_user_agent TEXT,

  -- Processus de signature
  verification_code_sent_at TIMESTAMPTZ,
  verification_code_verified_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Hash de vérification (pour intégrité)
  document_hash VARCHAR(64),
  signature_hash VARCHAR(64),

  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(contract_id)
);

CREATE INDEX IF NOT EXISTS idx_contract_signatures_contract ON contract_signatures(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_signatures_tenant ON contract_signatures(tenant_id);

-- =====================================================
-- PROPOSAL_ACCEPTANCES - Historique des acceptations
-- =====================================================

CREATE TABLE IF NOT EXISTS proposal_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Informations de l'acceptant
  acceptor_email VARCHAR(255) NOT NULL,
  acceptor_name VARCHAR(255),
  acceptor_ip VARCHAR(45),
  acceptor_user_agent TEXT,

  -- Timing
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Hash de vérification
  document_hash VARCHAR(64),

  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(proposal_id)
);

CREATE INDEX IF NOT EXISTS idx_proposal_acceptances_proposal ON proposal_acceptances(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_acceptances_tenant ON proposal_acceptances(tenant_id);

-- =====================================================
-- NOTIFICATIONS - Pour le suivi des notifications envoyées
-- =====================================================

CREATE TABLE IF NOT EXISTS signature_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Type: proposal_accepted, contract_signed, contract_viewed, etc.
  notification_type VARCHAR(50) NOT NULL,

  -- Référence
  proposal_id UUID REFERENCES proposals(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,

  -- Destinataires notifiés
  notified_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  notified_email VARCHAR(255),

  -- Status
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,

  -- Contenu
  subject VARCHAR(255),
  message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_signature_notifications_tenant ON signature_notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_signature_notifications_type ON signature_notifications(notification_type);

COMMENT ON TABLE contract_signatures IS 'Historique des signatures électroniques de contrats';
COMMENT ON TABLE proposal_acceptances IS 'Historique des acceptations de propositions (bon pour accord)';
COMMENT ON TABLE signature_notifications IS 'Notifications envoyées lors des signatures/acceptations';
