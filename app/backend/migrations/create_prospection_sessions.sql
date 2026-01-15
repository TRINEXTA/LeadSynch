-- =========================================
-- MIGRATION: Tables pour le mode prospection
-- Date: 2025-01-14
-- Description: Tables pour les sessions de prospection et l'historique des appels
-- =========================================

-- ========== 1. TABLE PROSPECTION_SESSIONS ==========

CREATE TABLE IF NOT EXISTS prospection_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,

  -- Status de la session
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),

  -- Timestamps
  start_time TIMESTAMP NOT NULL DEFAULT NOW(),
  pause_time TIMESTAMP,
  resume_time TIMESTAMP,
  end_time TIMESTAMP,
  pause_reason TEXT,

  -- Durees (en secondes)
  total_duration INTEGER DEFAULT 0,

  -- Compteurs de session
  calls_made INTEGER DEFAULT 0,
  meetings_obtained INTEGER DEFAULT 0,
  docs_sent INTEGER DEFAULT 0,
  follow_ups_created INTEGER DEFAULT 0,
  disqualified INTEGER DEFAULT 0,
  nrp INTEGER DEFAULT 0,

  -- Metadonnees
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index pour les requetes frequentes
CREATE INDEX IF NOT EXISTS idx_prospection_sessions_tenant ON prospection_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_prospection_sessions_user ON prospection_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_prospection_sessions_campaign ON prospection_sessions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_prospection_sessions_status ON prospection_sessions(status) WHERE status IN ('active', 'paused');
CREATE INDEX IF NOT EXISTS idx_prospection_sessions_user_campaign ON prospection_sessions(user_id, campaign_id);

-- ========== 2. TABLE CALL_HISTORY ==========

CREATE TABLE IF NOT EXISTS call_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES prospection_sessions(id) ON DELETE SET NULL,

  -- Details de l'appel
  duration INTEGER DEFAULT 0,           -- Duree en secondes
  qualification VARCHAR(50),            -- interested, meeting_scheduled, nrp, etc.
  notes TEXT,
  follow_up_date TIMESTAMP,

  -- Metadonnees
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index pour les requetes
CREATE INDEX IF NOT EXISTS idx_call_history_lead ON call_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_call_history_user ON call_history(user_id);
CREATE INDEX IF NOT EXISTS idx_call_history_session ON call_history(session_id);
CREATE INDEX IF NOT EXISTS idx_call_history_user_session ON call_history(user_id, session_id);
CREATE INDEX IF NOT EXISTS idx_call_history_date ON call_history(created_at);

-- ========== 3. TRIGGER POUR UPDATED_AT ==========

CREATE OR REPLACE FUNCTION update_prospection_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_prospection_sessions_updated ON prospection_sessions;
CREATE TRIGGER trigger_prospection_sessions_updated
  BEFORE UPDATE ON prospection_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_prospection_sessions_updated_at();

-- ========== 4. CONTRAINTE D'UNICITE POUR UNE SEULE SESSION ACTIVE PAR USER/CAMPAGNE ==========

-- Cette contrainte empeche d'avoir plusieurs sessions actives pour le meme user sur la meme campagne
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_session
ON prospection_sessions(user_id, campaign_id)
WHERE status IN ('active', 'paused');
