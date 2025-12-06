-- Migration: Create background jobs and notifications tables
-- Date: 2025-12-06
-- Description: Tables pour les jobs en background et notifications

-- ========== TABLE: BACKGROUND_JOBS ==========
CREATE TABLE IF NOT EXISTS background_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Type de job
  job_type VARCHAR(50) NOT NULL, -- 'lead_generation', 'lead_enrichment', 'csv_import', etc.

  -- Statut
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed', 'cancelled'

  -- Paramètres du job (JSON)
  params JSONB,

  -- Résultats (JSON)
  result JSONB,

  -- Progression
  progress INTEGER DEFAULT 0,
  progress_message TEXT,

  -- Statistiques
  items_total INTEGER DEFAULT 0,
  items_processed INTEGER DEFAULT 0,
  items_success INTEGER DEFAULT 0,
  items_failed INTEGER DEFAULT 0,

  -- Erreur
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Données résultantes (pour lead_generation)
  leads_data JSONB
);

CREATE INDEX IF NOT EXISTS idx_background_jobs_tenant ON background_jobs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_background_jobs_user ON background_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_background_jobs_status ON background_jobs(status);
CREATE INDEX IF NOT EXISTS idx_background_jobs_type ON background_jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_background_jobs_created ON background_jobs(created_at DESC);

-- ========== TABLE: NOTIFICATIONS ==========
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- Type de notification
  type VARCHAR(50) NOT NULL, -- 'job_complete', 'job_failed', 'lead_generated', 'campaign_sent', etc.

  -- Contenu
  title VARCHAR(255) NOT NULL,
  message TEXT,

  -- Données associées (JSON)
  data JSONB,

  -- Lien d'action
  action_url TEXT,
  action_label VARCHAR(100),

  -- Statut
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,

  -- Référence au job si applicable
  job_id UUID REFERENCES background_jobs(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, read) WHERE read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- ========== COMMENTS ==========
COMMENT ON TABLE background_jobs IS 'Jobs de traitement en arrière-plan (génération leads, import CSV, etc.)';
COMMENT ON TABLE notifications IS 'Notifications pour les utilisateurs';
COMMENT ON COLUMN background_jobs.leads_data IS 'Leads générés stockés temporairement avant sauvegarde';

-- ========== FIN ==========
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration background_jobs terminée !';
  RAISE NOTICE 'Tables créées: background_jobs, notifications';
  RAISE NOTICE '========================================';
END$$;
