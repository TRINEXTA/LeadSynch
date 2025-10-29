-- Table email_templates pour LeadSynch + Asefi
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  template_type VARCHAR(50) DEFAULT 'email',
  metadata JSONB,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_templates ON email_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_metadata_gin ON email_templates USING gin(metadata);

COMMENT ON TABLE email_templates IS 'Templates emails générés par Asefi ou manuellement';
