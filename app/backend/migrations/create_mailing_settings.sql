-- Migration: Création table mailing_settings
-- Date: 2025-11-14
-- Description: Paramètres d'envoi d'emails pour chaque tenant

CREATE TABLE IF NOT EXISTS mailing_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  from_email VARCHAR(255) NOT NULL,
  from_name VARCHAR(255) NOT NULL,
  reply_to VARCHAR(255),
  provider VARCHAR(50) DEFAULT 'elasticemail',
  api_key TEXT,
  configured BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id)
);

CREATE INDEX idx_mailing_settings_tenant ON mailing_settings(tenant_id);

COMMENT ON TABLE mailing_settings IS 'Configuration email par tenant pour les campagnes';
