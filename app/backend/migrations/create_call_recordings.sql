-- =========================================
-- MIGRATION : Système d'enregistrement d'appels
-- Date: 2025-11-15
-- Description: Crée les tables pour stocker les enregistrements d'appels et leurs transcriptions
-- =========================================

-- ========== 1. TABLE HISTORIQUE DES APPELS ==========

-- Table pour l'historique des appels (si elle n'existe pas déjà)
CREATE TABLE IF NOT EXISTS lead_call_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  pipeline_lead_id UUID REFERENCES pipeline_leads(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,

  -- Type et statut
  action_type VARCHAR(50) DEFAULT 'call', -- 'call', 'qualification', 'note'
  call_status VARCHAR(50), -- 'answered', 'no_answer', 'voicemail', 'busy'

  -- Données de l'appel
  call_duration INTEGER, -- Durée en secondes
  phone_number VARCHAR(50), -- Numéro appelé
  phone_provider VARCHAR(50), -- 'teams', 'standard', 'voip', 'other'

  -- Qualification
  qualification VARCHAR(50), -- 'hot', 'warm', 'cold', 'not_interested'
  stage_before VARCHAR(50),
  stage_after VARCHAR(50),

  -- Détails
  notes TEXT,
  next_action VARCHAR(100),
  scheduled_date TIMESTAMP,
  deal_value DECIMAL(10, 2),

  -- Audit
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ========== 2. TABLE ENREGISTREMENTS AUDIO ==========

CREATE TABLE IF NOT EXISTS call_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Relations
  call_history_id UUID REFERENCES lead_call_history(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,

  -- Fichier audio
  filename VARCHAR(255) NOT NULL, -- Nom du fichier sur disque
  original_filename VARCHAR(255) NOT NULL, -- Nom d'origine
  filepath TEXT NOT NULL, -- Chemin complet du fichier
  filesize INTEGER, -- Taille en bytes
  mimetype VARCHAR(100), -- audio/mpeg, audio/wav, audio/webm, etc.
  duration INTEGER, -- Durée en secondes (extraite du fichier si possible)

  -- Provider d'origine
  phone_provider VARCHAR(50), -- 'teams', 'standard', 'voip', 'other'
  provider_metadata JSONB, -- Métadonnées du provider (Teams meeting ID, etc.)

  -- Transcription
  transcription_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  transcription_text TEXT, -- Texte de la transcription
  transcription_language VARCHAR(10) DEFAULT 'fr', -- Code langue ISO
  transcription_confidence DECIMAL(5, 2), -- Score de confiance 0-100
  transcription_error TEXT, -- Message d'erreur si échec
  transcribed_at TIMESTAMP, -- Date de transcription

  -- RGPD / Consentement
  consent_obtained BOOLEAN DEFAULT false,
  consent_date TIMESTAMP,
  consent_method VARCHAR(100), -- 'manual', 'email', 'phone', 'contract'
  can_be_stored BOOLEAN DEFAULT true,
  deletion_scheduled_at TIMESTAMP, -- Date de suppression planifiée (RGPD)

  -- Audit
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ========== 3. INDEXES POUR PERFORMANCE ==========

-- Indexes lead_call_history
CREATE INDEX IF NOT EXISTS idx_lead_call_history_tenant ON lead_call_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lead_call_history_lead ON lead_call_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_call_history_pipeline ON lead_call_history(pipeline_lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_call_history_campaign ON lead_call_history(campaign_id);
CREATE INDEX IF NOT EXISTS idx_lead_call_history_created_by ON lead_call_history(created_by);
CREATE INDEX IF NOT EXISTS idx_lead_call_history_created_at ON lead_call_history(created_at);

-- Indexes call_recordings
CREATE INDEX IF NOT EXISTS idx_call_recordings_tenant ON call_recordings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_call_recordings_call_history ON call_recordings(call_history_id);
CREATE INDEX IF NOT EXISTS idx_call_recordings_lead ON call_recordings(lead_id);
CREATE INDEX IF NOT EXISTS idx_call_recordings_campaign ON call_recordings(campaign_id);
CREATE INDEX IF NOT EXISTS idx_call_recordings_transcription_status ON call_recordings(transcription_status);
CREATE INDEX IF NOT EXISTS idx_call_recordings_uploaded_by ON call_recordings(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_call_recordings_created_at ON call_recordings(created_at);
CREATE INDEX IF NOT EXISTS idx_call_recordings_deletion_scheduled ON call_recordings(deletion_scheduled_at) WHERE deletion_scheduled_at IS NOT NULL;

-- ========== 4. TRIGGERS POUR updated_at ==========

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger pour lead_call_history
DROP TRIGGER IF EXISTS update_lead_call_history_updated_at ON lead_call_history;
CREATE TRIGGER update_lead_call_history_updated_at
  BEFORE UPDATE ON lead_call_history
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour call_recordings
DROP TRIGGER IF EXISTS update_call_recordings_updated_at ON call_recordings;
CREATE TRIGGER update_call_recordings_updated_at
  BEFORE UPDATE ON call_recordings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========== 5. PERMISSIONS ET SÉCURITÉ ==========

-- RLS (Row Level Security) - À activer en production si nécessaire
-- ALTER TABLE lead_call_history ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE call_recordings ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY tenant_isolation_call_history ON lead_call_history
--   USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- CREATE POLICY tenant_isolation_call_recordings ON call_recordings
--   USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- ========== 6. COMMENTAIRES POUR DOCUMENTATION ==========

COMMENT ON TABLE lead_call_history IS 'Historique complet des appels téléphoniques avec les leads';
COMMENT ON TABLE call_recordings IS 'Enregistrements audio des appels avec transcriptions et métadonnées RGPD';

COMMENT ON COLUMN call_recordings.phone_provider IS 'Provider utilisé : teams, standard, voip, other - Permet support multi-provider';
COMMENT ON COLUMN call_recordings.provider_metadata IS 'Métadonnées JSON du provider (Teams meeting ID, SIP call ID, etc.)';
COMMENT ON COLUMN call_recordings.transcription_status IS 'Statut de la transcription : pending, processing, completed, failed';
COMMENT ON COLUMN call_recordings.consent_obtained IS 'Consentement RGPD obtenu pour enregistrement';
COMMENT ON COLUMN call_recordings.deletion_scheduled_at IS 'Date de suppression automatique (conformité RGPD)';

-- ========== 7. MESSAGE DE CONFIRMATION ==========

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Migration terminée avec succès !';
  RAISE NOTICE '========================================';
  RAISE NOTICE '📋 Tables créées :';
  RAISE NOTICE '   - lead_call_history : Historique des appels';
  RAISE NOTICE '   - call_recordings : Enregistrements audio + transcriptions';
  RAISE NOTICE '🔧 Indexes créés : 14';
  RAISE NOTICE '🎯 Triggers créés : 2';
  RAISE NOTICE '🔐 Support multi-tenant : ✓';
  RAISE NOTICE '🎤 Support multi-provider : ✓ (Teams, standard, VoIP, other)';
  RAISE NOTICE '🤖 Transcription IA : ✓ (Claude AI ready)';
  RAISE NOTICE '⚖️  Conformité RGPD : ✓ (consentement + suppression planifiée)';
  RAISE NOTICE '========================================';
END$$;
