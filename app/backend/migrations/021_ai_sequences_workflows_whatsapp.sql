-- =========================================
-- MIGRATION: IA Avancée, Sequences, Workflows, WhatsApp
-- Date: 2026-01-15
-- Description: Ajoute les tables pour:
--   - Health labels et Next Best Action
--   - Sales Sequences automatisées
--   - Workflows avancés (règles/actions)
--   - Intégration WhatsApp
--   - Détection duplicatas
-- =========================================

-- ========== 1. AMÉLIORATIONS SCORING LEADS ==========

-- Ajouter colonne health_label aux leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS health_label VARCHAR(20) DEFAULT 'new';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS health_label_updated_at TIMESTAMP;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS next_best_action VARCHAR(255);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS next_best_action_date TIMESTAMP;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS duplicate_of UUID REFERENCES leads(id);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS is_duplicate BOOLEAN DEFAULT false;

-- Index pour health_label
CREATE INDEX IF NOT EXISTS idx_leads_health_label ON leads(tenant_id, health_label);
CREATE INDEX IF NOT EXISTS idx_leads_last_activity ON leads(tenant_id, last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_duplicate ON leads(tenant_id, is_duplicate);

-- Table pour historique des actions suggérées
CREATE TABLE IF NOT EXISTS lead_suggested_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL, -- call, email, sms, whatsapp, wait, close
  action_reason TEXT NOT NULL,
  priority INTEGER DEFAULT 5, -- 1-10
  suggested_at TIMESTAMP DEFAULT NOW(),
  executed_at TIMESTAMP,
  dismissed_at TIMESTAMP,
  dismissed_reason TEXT,
  created_by_ai BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suggested_actions_lead ON lead_suggested_actions(lead_id);
CREATE INDEX IF NOT EXISTS idx_suggested_actions_pending ON lead_suggested_actions(tenant_id, executed_at)
  WHERE executed_at IS NULL AND dismissed_at IS NULL;

-- ========== 2. DÉTECTION DUPLICATAS ==========

-- Table pour log des duplicatas détectés
CREATE TABLE IF NOT EXISTS duplicate_detections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  duplicate_lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  match_type VARCHAR(50) NOT NULL, -- email, phone, siret, name_postal
  match_confidence INTEGER DEFAULT 100, -- 0-100
  status VARCHAR(20) DEFAULT 'pending', -- pending, merged, dismissed
  merged_at TIMESTAMP,
  merged_by UUID REFERENCES users(id),
  dismissed_at TIMESTAMP,
  dismissed_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_duplicates_lead ON duplicate_detections(lead_id);
CREATE INDEX IF NOT EXISTS idx_duplicates_pending ON duplicate_detections(tenant_id, status)
  WHERE status = 'pending';

-- ========== 3. SALES SEQUENCES ==========

-- Table des séquences
CREATE TABLE IF NOT EXISTS sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'draft', -- draft, active, paused, archived
  trigger_type VARCHAR(50) DEFAULT 'manual', -- manual, auto_import, auto_status_change
  trigger_config JSONB DEFAULT '{}',
  exit_conditions JSONB DEFAULT '[]', -- [{type: 'replied'}, {type: 'unsubscribed'}]
  working_days_only BOOLEAN DEFAULT true,
  working_hours_start TIME DEFAULT '09:00',
  working_hours_end TIME DEFAULT '18:00',
  timezone VARCHAR(50) DEFAULT 'Europe/Paris',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sequences_tenant ON sequences(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sequences_status ON sequences(tenant_id, status);

-- Table des étapes de séquence
CREATE TABLE IF NOT EXISTS sequence_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  step_type VARCHAR(50) NOT NULL, -- email, call_task, sms, whatsapp, linkedin, wait, condition
  delay_days INTEGER DEFAULT 0,
  delay_hours INTEGER DEFAULT 0,
  delay_minutes INTEGER DEFAULT 0,
  -- Configuration selon le type
  email_template_id UUID REFERENCES email_templates(id),
  email_subject VARCHAR(500),
  email_body TEXT,
  sms_content TEXT,
  whatsapp_template_name VARCHAR(100),
  whatsapp_message TEXT,
  linkedin_message TEXT,
  task_title VARCHAR(255),
  task_description TEXT,
  -- Conditions (pour step_type = 'condition')
  condition_type VARCHAR(50), -- if_opened, if_clicked, if_replied, if_not_opened
  condition_true_step INTEGER, -- step_order to jump to if true
  condition_false_step INTEGER, -- step_order to jump to if false
  -- Métriques
  emails_sent INTEGER DEFAULT 0,
  emails_opened INTEGER DEFAULT 0,
  emails_clicked INTEGER DEFAULT 0,
  tasks_created INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sequence_steps_sequence ON sequence_steps(sequence_id, step_order);

-- Table des inscriptions aux séquences
CREATE TABLE IF NOT EXISTS sequence_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sequence_id UUID NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  current_step_order INTEGER DEFAULT 1,
  status VARCHAR(50) DEFAULT 'active', -- active, paused, completed, exited, failed
  enrolled_at TIMESTAMP DEFAULT NOW(),
  enrolled_by UUID REFERENCES users(id),
  next_step_scheduled_at TIMESTAMP,
  last_step_executed_at TIMESTAMP,
  completed_at TIMESTAMP,
  exit_reason VARCHAR(255),
  exit_details JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(sequence_id, lead_id) -- Un lead ne peut être inscrit qu'une fois par séquence
);

CREATE INDEX IF NOT EXISTS idx_enrollments_sequence ON sequence_enrollments(sequence_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_lead ON sequence_enrollments(lead_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_active ON sequence_enrollments(tenant_id, status, next_step_scheduled_at)
  WHERE status = 'active';

-- Table des logs d'exécution séquence
CREATE TABLE IF NOT EXISTS sequence_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  enrollment_id UUID NOT NULL REFERENCES sequence_enrollments(id) ON DELETE CASCADE,
  step_id UUID REFERENCES sequence_steps(id) ON DELETE SET NULL,
  step_order INTEGER,
  action_type VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL, -- scheduled, sent, delivered, opened, clicked, replied, failed, skipped
  error_message TEXT,
  metadata JSONB DEFAULT '{}', -- email_id, tracking_id, etc.
  executed_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sequence_logs_enrollment ON sequence_execution_logs(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_sequence_logs_status ON sequence_execution_logs(status);

-- ========== 4. WORKFLOWS AVANCÉS ==========

-- Table des workflows
CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'draft', -- draft, active, paused, archived
  trigger_type VARCHAR(50) NOT NULL, -- lead_created, lead_updated, field_changed, status_changed, email_opened, email_clicked, scheduled
  trigger_config JSONB DEFAULT '{}', -- {field: 'status', old_value: 'nouveau', new_value: 'contacte'}
  run_once_per_lead BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  executions_count INTEGER DEFAULT 0,
  last_executed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflows_tenant ON workflows(tenant_id);
CREATE INDEX IF NOT EXISTS idx_workflows_active ON workflows(tenant_id, status, trigger_type)
  WHERE status = 'active';

-- Table des conditions de workflow
CREATE TABLE IF NOT EXISTS workflow_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  condition_group INTEGER DEFAULT 1, -- Pour grouper les conditions avec AND/OR
  field_name VARCHAR(100) NOT NULL, -- status, score, sector, email, created_at, etc.
  operator VARCHAR(50) NOT NULL, -- equals, not_equals, contains, greater_than, less_than, is_empty, is_not_empty, in_list
  value TEXT, -- Valeur à comparer
  value_type VARCHAR(20) DEFAULT 'string', -- string, number, date, boolean, list
  logic_operator VARCHAR(10) DEFAULT 'AND', -- AND, OR (pour lier avec la condition suivante)
  condition_order INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_conditions_workflow ON workflow_conditions(workflow_id);

-- Table des actions de workflow
CREATE TABLE IF NOT EXISTS workflow_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  action_order INTEGER NOT NULL,
  action_type VARCHAR(50) NOT NULL, -- update_field, change_status, assign_user, add_tag, remove_tag, send_email, send_sms, send_whatsapp, create_task, enroll_sequence, webhook, notify_user, wait
  -- Configuration générale
  delay_minutes INTEGER DEFAULT 0, -- Délai avant exécution
  stop_on_failure BOOLEAN DEFAULT false,
  -- Configuration selon le type
  field_name VARCHAR(100), -- Pour update_field
  field_value TEXT, -- Pour update_field
  status_value VARCHAR(50), -- Pour change_status
  assign_to_user_id UUID REFERENCES users(id), -- Pour assign_user
  assign_strategy VARCHAR(50), -- round_robin, least_leads, specific_user
  tag_name VARCHAR(100), -- Pour add_tag/remove_tag
  email_template_id UUID REFERENCES email_templates(id), -- Pour send_email
  email_subject VARCHAR(500),
  email_body TEXT,
  sms_content TEXT,
  whatsapp_template VARCHAR(100),
  whatsapp_message TEXT,
  task_title VARCHAR(255),
  task_description TEXT,
  task_due_days INTEGER DEFAULT 1,
  sequence_id UUID REFERENCES sequences(id), -- Pour enroll_sequence
  webhook_url TEXT,
  webhook_method VARCHAR(10) DEFAULT 'POST',
  webhook_headers JSONB,
  notify_user_ids UUID[],
  notify_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_actions_workflow ON workflow_actions(workflow_id, action_order);

-- Table des logs d'exécution workflow
CREATE TABLE IF NOT EXISTS workflow_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  trigger_event VARCHAR(50),
  trigger_data JSONB,
  status VARCHAR(50) NOT NULL, -- started, completed, partial, failed
  actions_executed INTEGER DEFAULT 0,
  actions_failed INTEGER DEFAULT 0,
  error_message TEXT,
  execution_time_ms INTEGER,
  executed_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_logs_workflow ON workflow_execution_logs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_logs_lead ON workflow_execution_logs(lead_id);

-- Table pour éviter les exécutions multiples
CREATE TABLE IF NOT EXISTS workflow_lead_executions (
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  executed_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (workflow_id, lead_id)
);

-- ========== 5. WHATSAPP INTEGRATION ==========

-- Configuration WhatsApp par tenant
CREATE TABLE IF NOT EXISTS whatsapp_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
  provider VARCHAR(50) DEFAULT 'meta', -- meta, twilio, 360dialog
  api_key TEXT,
  api_secret TEXT,
  phone_number_id VARCHAR(100),
  business_account_id VARCHAR(100),
  access_token TEXT,
  webhook_verify_token VARCHAR(255),
  is_active BOOLEAN DEFAULT false,
  daily_limit INTEGER DEFAULT 1000,
  messages_sent_today INTEGER DEFAULT 0,
  last_reset_at DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Templates WhatsApp (doivent être approuvés par Meta)
CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  template_name VARCHAR(100) NOT NULL,
  template_id VARCHAR(100), -- ID chez Meta
  language VARCHAR(10) DEFAULT 'fr',
  category VARCHAR(50), -- marketing, utility, authentication
  status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
  header_type VARCHAR(20), -- text, image, video, document
  header_content TEXT,
  body_text TEXT NOT NULL,
  footer_text TEXT,
  buttons JSONB, -- [{type: 'quick_reply', text: 'Oui'}, {type: 'url', text: 'Site', url: '...'}]
  variables JSONB, -- Liste des variables dans le template {{1}}, {{2}}
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, template_name)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_tenant ON whatsapp_templates(tenant_id);

-- Messages WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  sequence_enrollment_id UUID REFERENCES sequence_enrollments(id) ON DELETE SET NULL,
  direction VARCHAR(10) NOT NULL, -- inbound, outbound
  phone_number VARCHAR(20) NOT NULL,
  message_type VARCHAR(20) NOT NULL, -- template, text, image, document, audio, video
  template_name VARCHAR(100),
  template_variables JSONB,
  message_content TEXT,
  media_url TEXT,
  whatsapp_message_id VARCHAR(100),
  status VARCHAR(50) DEFAULT 'pending', -- pending, sent, delivered, read, failed
  error_code VARCHAR(50),
  error_message TEXT,
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  read_at TIMESTAMP,
  replied_at TIMESTAMP,
  sent_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_lead ON whatsapp_messages(lead_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_phone ON whatsapp_messages(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_status ON whatsapp_messages(tenant_id, status);

-- Conversations WhatsApp (pour inbox unifié)
CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  phone_number VARCHAR(20) NOT NULL,
  last_message_at TIMESTAMP,
  last_message_direction VARCHAR(10),
  last_message_preview TEXT,
  unread_count INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'open', -- open, closed, pending
  assigned_to UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, phone_number)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_tenant ON whatsapp_conversations(tenant_id, status);

-- ========== 6. ASEFI CONVERSATION HISTORY ==========

-- Historique des conversations avec ASEFI
CREATE TABLE IF NOT EXISTS asefi_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL, -- Contexte lead si applicable
  title VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_asefi_conversations_user ON asefi_conversations(user_id);

-- Messages ASEFI
CREATE TABLE IF NOT EXISTS asefi_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES asefi_conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL, -- user, assistant
  content TEXT NOT NULL,
  tokens_used INTEGER,
  action_executed JSONB, -- {type: 'update_status', lead_id: '...', result: 'success'}
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_asefi_messages_conversation ON asefi_messages(conversation_id);

-- ========== 7. TRIGGERS ET FONCTIONS ==========

-- Fonction pour mettre à jour last_activity_at sur les leads
CREATE OR REPLACE FUNCTION update_lead_last_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE leads SET last_activity_at = NOW() WHERE id = NEW.lead_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger sur email_events
DROP TRIGGER IF EXISTS trigger_lead_activity_email ON email_events;
CREATE TRIGGER trigger_lead_activity_email
  AFTER INSERT ON email_events
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_last_activity();

-- Trigger sur call_logs
DROP TRIGGER IF EXISTS trigger_lead_activity_call ON call_logs;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'call_logs') THEN
    CREATE TRIGGER trigger_lead_activity_call
      AFTER INSERT ON call_logs
      FOR EACH ROW
      EXECUTE FUNCTION update_lead_last_activity();
  END IF;
END$$;

-- Fonction pour calculer health_label
CREATE OR REPLACE FUNCTION calculate_health_label(
  p_score INTEGER,
  p_last_activity TIMESTAMP,
  p_status VARCHAR
) RETURNS VARCHAR AS $$
DECLARE
  days_inactive INTEGER;
BEGIN
  -- Calcul des jours sans activité
  days_inactive := EXTRACT(DAY FROM NOW() - COALESCE(p_last_activity, NOW() - INTERVAL '999 days'));

  -- Statuts terminaux
  IF p_status IN ('perdu', 'refuse', 'unsubscribed') THEN
    RETURN 'lost';
  END IF;

  IF p_status = 'gagne' THEN
    RETURN 'won';
  END IF;

  -- AT RISK: Score faible ou inactif longtemps
  IF p_score < 30 OR days_inactive > 14 THEN
    RETURN 'at_risk';
  END IF;

  -- HOT: Score élevé et activité récente
  IF p_score >= 70 AND days_inactive <= 7 THEN
    RETURN 'hot';
  END IF;

  -- WARM: Score moyen ou activité moyenne
  IF p_score >= 40 OR days_inactive <= 14 THEN
    RETURN 'warm';
  END IF;

  -- COLD: Reste
  RETURN 'cold';
END;
$$ LANGUAGE plpgsql;

-- Fonction pour mettre à jour les health labels en batch
CREATE OR REPLACE FUNCTION update_all_health_labels(p_tenant_id UUID)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE leads
  SET
    health_label = calculate_health_label(COALESCE(score, 0), last_activity_at, status),
    health_label_updated_at = NOW()
  WHERE tenant_id = p_tenant_id
    AND status NOT IN ('gagne', 'perdu');

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- ========== 8. INDEXES SUPPLÉMENTAIRES POUR PERFORMANCE ==========

-- Indexes composites pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_leads_tenant_status_score ON leads(tenant_id, status, score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_tenant_health_score ON leads(tenant_id, health_label, score DESC);
CREATE INDEX IF NOT EXISTS idx_sequences_active_tenant ON sequences(tenant_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_workflows_trigger_active ON workflows(trigger_type, tenant_id) WHERE status = 'active';

-- ========== 9. VÉRIFICATION FINALE ==========

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 021 terminée avec succès !';
  RAISE NOTICE '📋 Nouvelles fonctionnalités:';
  RAISE NOTICE '   - Health Labels (hot, warm, cold, at_risk, lost)';
  RAISE NOTICE '   - Next Best Action suggestions';
  RAISE NOTICE '   - Détection duplicatas';
  RAISE NOTICE '   - Sales Sequences automatisées';
  RAISE NOTICE '   - Workflows avec conditions/actions';
  RAISE NOTICE '   - Intégration WhatsApp';
  RAISE NOTICE '   - Historique conversations ASEFI';
END$$;
