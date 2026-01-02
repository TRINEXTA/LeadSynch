-- =========================================
-- MIGRATION: Système de tracking des sessions d'appels
-- Date: 2025-01-02
-- Description: Tables pour suivre les heures d'appels par commercial/manager
-- =========================================

-- ========== 1. SESSIONS DE PROSPECTION ==========

-- Table des sessions de prospection (chaque fois qu'un user entre en mode prospection)
CREATE TABLE IF NOT EXISTS call_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Informations de session
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  filter_type VARCHAR(50) DEFAULT 'all', -- all, cold_call, relancer, nrp, qualifie, tres_qualifie

  -- Horaires
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMP,

  -- Durées en secondes
  total_duration INTEGER DEFAULT 0,        -- Durée totale (pause exclue)
  pause_duration INTEGER DEFAULT 0,        -- Temps total en pause

  -- Statistiques
  leads_processed INTEGER DEFAULT 0,
  leads_qualified INTEGER DEFAULT 0,
  leads_rdv INTEGER DEFAULT 0,             -- Leads convertis en RDV
  calls_made INTEGER DEFAULT 0,            -- Nombre d'appels effectués

  -- Status
  status VARCHAR(20) DEFAULT 'active',     -- active, paused, completed

  -- Métadonnées
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_call_sessions_tenant ON call_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_user ON call_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_date ON call_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_call_sessions_user_date ON call_sessions(user_id, started_at);
CREATE INDEX IF NOT EXISTS idx_call_sessions_status ON call_sessions(status) WHERE status = 'active';

-- ========== 2. DÉTAIL DES APPELS PAR SESSION ==========

-- Table des appels individuels pendant une session
CREATE TABLE IF NOT EXISTS call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES call_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  pipeline_lead_id UUID REFERENCES pipeline_leads(id) ON DELETE SET NULL,

  -- Horaires de l'appel
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMP,
  duration INTEGER DEFAULT 0,              -- Durée en secondes

  -- Résultat
  outcome VARCHAR(50),                     -- qualified, nrp, relancer, rejected, rdv
  qualification VARCHAR(50),               -- tres_qualifie, qualifie, a_relancer, nrp, pas_interesse
  notes TEXT,

  -- Si RDV créé
  rdv_scheduled_at TIMESTAMP,
  rdv_type VARCHAR(50),                    -- meeting, video, call

  created_at TIMESTAMP DEFAULT NOW()
);

-- Index pour les requêtes
CREATE INDEX IF NOT EXISTS idx_call_logs_session ON call_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_user ON call_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_lead ON call_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_date ON call_logs(started_at);

-- ========== 3. OBJECTIFS D'APPELS ==========

-- Table des objectifs d'heures d'appel par utilisateur
CREATE TABLE IF NOT EXISTS call_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Objectifs en minutes par jour
  daily_target_minutes INTEGER DEFAULT 240,      -- 4h par défaut
  weekly_target_minutes INTEGER DEFAULT 1200,    -- 20h par défaut
  monthly_target_minutes INTEGER DEFAULT 4800,   -- 80h par défaut

  -- Période de validité
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_until DATE,

  -- Qui a défini l'objectif
  set_by UUID REFERENCES users(id),

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Un seul objectif actif par user
  UNIQUE(user_id, effective_from)
);

CREATE INDEX IF NOT EXISTS idx_call_objectives_user ON call_objectives(user_id);
CREATE INDEX IF NOT EXISTS idx_call_objectives_effective ON call_objectives(effective_from, effective_until);

-- ========== 4. PAUSES DANS LES SESSIONS ==========

-- Table pour tracker les pauses individuelles
CREATE TABLE IF NOT EXISTS call_session_pauses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES call_sessions(id) ON DELETE CASCADE,

  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMP,
  duration INTEGER,                        -- Durée en secondes (calculée à la reprise)

  reason VARCHAR(100)                      -- optionnel: café, déjeuner, urgence, etc.
);

CREATE INDEX IF NOT EXISTS idx_session_pauses_session ON call_session_pauses(session_id);

-- ========== 5. VUE POUR LES STATISTIQUES QUOTIDIENNES ==========

CREATE OR REPLACE VIEW call_daily_stats AS
SELECT
  cs.tenant_id,
  cs.user_id,
  u.first_name,
  u.last_name,
  u.email,
  DATE(cs.started_at) as call_date,

  -- Totaux
  COUNT(DISTINCT cs.id) as sessions_count,
  SUM(cs.total_duration) as total_seconds,
  SUM(cs.pause_duration) as pause_seconds,
  SUM(cs.total_duration) - SUM(cs.pause_duration) as effective_seconds,

  -- Productivité
  SUM(cs.leads_processed) as leads_processed,
  SUM(cs.leads_qualified) as leads_qualified,
  SUM(cs.leads_rdv) as rdv_created,
  SUM(cs.calls_made) as calls_made,

  -- Moyennes
  CASE WHEN SUM(cs.leads_processed) > 0
    THEN ROUND(SUM(cs.total_duration)::numeric / SUM(cs.leads_processed), 0)
    ELSE 0
  END as avg_seconds_per_lead,

  CASE WHEN SUM(cs.leads_processed) > 0
    THEN ROUND((SUM(cs.leads_qualified)::numeric / SUM(cs.leads_processed)) * 100, 1)
    ELSE 0
  END as qualification_rate

FROM call_sessions cs
JOIN users u ON u.id = cs.user_id
WHERE cs.status IN ('completed', 'active')
GROUP BY cs.tenant_id, cs.user_id, u.first_name, u.last_name, u.email, DATE(cs.started_at);

-- ========== 6. VUE POUR LES STATISTIQUES HEBDOMADAIRES ==========

CREATE OR REPLACE VIEW call_weekly_stats AS
SELECT
  cs.tenant_id,
  cs.user_id,
  u.first_name,
  u.last_name,
  DATE_TRUNC('week', cs.started_at) as week_start,

  COUNT(DISTINCT cs.id) as sessions_count,
  SUM(cs.total_duration) as total_seconds,
  SUM(cs.pause_duration) as pause_seconds,
  SUM(cs.leads_processed) as leads_processed,
  SUM(cs.leads_qualified) as leads_qualified,
  SUM(cs.leads_rdv) as rdv_created,
  SUM(cs.calls_made) as calls_made

FROM call_sessions cs
JOIN users u ON u.id = cs.user_id
WHERE cs.status IN ('completed', 'active')
GROUP BY cs.tenant_id, cs.user_id, u.first_name, u.last_name, DATE_TRUNC('week', cs.started_at);

-- ========== 7. TRIGGER POUR METTRE À JOUR updated_at ==========

CREATE OR REPLACE FUNCTION update_call_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_call_sessions_updated ON call_sessions;
CREATE TRIGGER trigger_call_sessions_updated
  BEFORE UPDATE ON call_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_call_sessions_updated_at();
