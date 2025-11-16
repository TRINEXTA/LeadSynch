-- Migration 010 : Correction système désabonnement RGPD
-- Ajoute tenant_id + système 3 strikes

-- 1. Ajouter tenant_id à email_unsubscribes
ALTER TABLE email_unsubscribes
ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- Mise à jour des données existantes (si elles existent)
-- On récupère le tenant_id depuis le lead
UPDATE email_unsubscribes eu
SET tenant_id = l.tenant_id
FROM leads l
WHERE eu.lead_id = l.id
AND eu.tenant_id IS NULL;

-- Rendre tenant_id NOT NULL après mise à jour
ALTER TABLE email_unsubscribes
ALTER COLUMN tenant_id SET NOT NULL;

-- Ajouter contrainte FK
ALTER TABLE email_unsubscribes
ADD CONSTRAINT fk_unsubscribe_tenant
FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_unsubscribes_tenant_email
ON email_unsubscribes(tenant_id, email);

-- 2. Créer table pour violations RGPD (système 3 strikes)
CREATE TABLE IF NOT EXISTS tenant_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  violation_type VARCHAR(50) NOT NULL, -- 'unsubscribe_ignored', 'spam_reported', etc.
  lead_email VARCHAR(255) NOT NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  description TEXT,
  severity INTEGER DEFAULT 1, -- 1=warning, 2=serious, 3=critical
  created_at TIMESTAMPTZ DEFAULT NOW(),
  notified_at TIMESTAMPTZ,
  admin_notified BOOLEAN DEFAULT false
);

CREATE INDEX idx_violations_tenant ON tenant_violations(tenant_id);
CREATE INDEX idx_violations_created ON tenant_violations(created_at DESC);

-- 3. Ajouter colonnes aux tenants pour tracking violations
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS violation_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_violation_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS blocked_for_violations BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMPTZ;

-- 4. Ajouter colonne warning_sent pour tracking emails
ALTER TABLE email_unsubscribes
ADD COLUMN IF NOT EXISTS warning_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS warning_sent_at TIMESTAMPTZ;

-- 5. Créer vue pour statistiques désabonnements par tenant
CREATE OR REPLACE VIEW v_unsubscribe_stats AS
SELECT
  eu.tenant_id,
  t.name as tenant_name,
  COUNT(*) as total_unsubscribes,
  COUNT(*) FILTER (WHERE eu.unsubscribed_at > NOW() - INTERVAL '7 days') as last_7_days,
  COUNT(*) FILTER (WHERE eu.unsubscribed_at > NOW() - INTERVAL '30 days') as last_30_days,
  COUNT(*) FILTER (WHERE eu.warning_sent = true) as warnings_sent
FROM email_unsubscribes eu
JOIN tenants t ON eu.tenant_id = t.id
GROUP BY eu.tenant_id, t.name;

COMMENT ON TABLE tenant_violations IS 'Historique des violations RGPD pour système 3 strikes';
COMMENT ON COLUMN tenant_violations.severity IS '1=Avertissement, 2=Sérieux (2ème strike), 3=Critique (blocage compte)';
