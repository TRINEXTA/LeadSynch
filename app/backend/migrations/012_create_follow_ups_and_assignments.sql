-- =========================================
-- MIGRATION 012: Créer tables follow_ups et campaign_assignments
-- Date: 2025-11-16
-- Description: Tables manquantes avec types UUID corrects
-- =========================================

-- ========== 1. TABLE FOLLOW_UPS ==========
CREATE TABLE IF NOT EXISTS follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Type de follow-up
  type VARCHAR(50) NOT NULL DEFAULT 'call',  -- call, email, meeting, other
  priority VARCHAR(20) NOT NULL DEFAULT 'medium',  -- low, medium, high, urgent

  -- Détails
  title VARCHAR(255),
  notes TEXT,

  -- Planification
  scheduled_date TIMESTAMPTZ NOT NULL,

  -- Statut
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  completed_notes TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour follow_ups
CREATE INDEX IF NOT EXISTS idx_follow_ups_tenant ON follow_ups(tenant_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_user ON follow_ups(user_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_lead ON follow_ups(lead_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_scheduled ON follow_ups(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_follow_ups_completed ON follow_ups(completed);
CREATE INDEX IF NOT EXISTS idx_follow_ups_tenant_user ON follow_ups(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_overdue ON follow_ups(scheduled_date, completed) WHERE completed = false;

-- Trigger updated_at pour follow_ups
CREATE OR REPLACE FUNCTION update_follow_ups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER follow_ups_updated_at
BEFORE UPDATE ON follow_ups
FOR EACH ROW
EXECUTE FUNCTION update_follow_ups_updated_at();

COMMENT ON TABLE follow_ups IS 'Tâches de suivi (follow-ups) assignées aux commerciaux';
COMMENT ON COLUMN follow_ups.type IS 'Type: call, email, meeting, other';
COMMENT ON COLUMN follow_ups.priority IS 'Priorité: low, medium, high, urgent';

-- ========== 2. TABLE CAMPAIGN_ASSIGNMENTS ==========
CREATE TABLE IF NOT EXISTS campaign_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Contrainte unique
  UNIQUE(campaign_id, lead_id)
);

-- Index pour campaign_assignments
CREATE INDEX IF NOT EXISTS idx_campaign_assignments_campaign ON campaign_assignments(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_assignments_lead ON campaign_assignments(lead_id);
CREATE INDEX IF NOT EXISTS idx_campaign_assignments_user ON campaign_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_campaign_assignments_tenant ON campaign_assignments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_campaign_assignments_tenant_user ON campaign_assignments(tenant_id, user_id);

COMMENT ON TABLE campaign_assignments IS 'Attribution de leads à des utilisateurs dans le contexte d\'une campagne';

-- ========== 3. VÉRIFICATION ==========
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 012 terminée';
  RAISE NOTICE 'Tables créées: follow_ups, campaign_assignments';
  RAISE NOTICE 'Types UUID utilisés partout';
END $$;
