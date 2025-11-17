-- ========================================
-- MIGRATION COMPLÈTE : Ajout colonnes manquantes
-- Date: 2025-11-16
-- Description: Corrige toutes les erreurs de colonnes manquantes
-- ========================================

-- 1. Table mailing_settings (Email Config)
ALTER TABLE mailing_settings
ADD COLUMN IF NOT EXISTS company_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS company_address VARCHAR(500);

COMMENT ON COLUMN mailing_settings.company_name IS 'Nom de l entreprise pour le footer des emails (RGPD)';
COMMENT ON COLUMN mailing_settings.company_address IS 'Adresse de l entreprise pour le footer des emails (RGPD)';

-- 2. Table campaigns (Stats détaillées)
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS sent_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS opened_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS clicked_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS reply_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS bounced_count INTEGER DEFAULT 0;

COMMENT ON COLUMN campaigns.sent_count IS 'Nombre d emails envoyés';
COMMENT ON COLUMN campaigns.opened_count IS 'Nombre d emails ouverts';
COMMENT ON COLUMN campaigns.clicked_count IS 'Nombre de clics';
COMMENT ON COLUMN campaigns.reply_count IS 'Nombre de réponses';
COMMENT ON COLUMN campaigns.bounced_count IS 'Nombre de bounces (emails rejetés)';

-- 3. Table users - Ajouter colonne manager_id
ALTER TABLE users
ADD COLUMN IF NOT EXISTS manager_id VARCHAR(36);

CREATE INDEX IF NOT EXISTS idx_users_manager ON users(manager_id);

COMMENT ON COLUMN users.manager_id IS 'ID du manager de cet utilisateur (pour validation_requests)';

-- 4. Table validation_requests (si n'existe pas, la créer avec TOUTES les colonnes)
CREATE TABLE IF NOT EXISTS validation_requests (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id VARCHAR(36) NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'validation',
  requester_id VARCHAR(36) NOT NULL,
  lead_id VARCHAR(36),
  campaign_id VARCHAR(36),
  subject VARCHAR(255) NOT NULL,
  message TEXT,
  priority VARCHAR(50) DEFAULT 'normal',
  assigned_to VARCHAR(36),
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  reviewed_by VARCHAR(36),
  manager_response TEXT,
  resolution_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_validation_requests_tenant ON validation_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_validation_requests_lead ON validation_requests(lead_id);
CREATE INDEX IF NOT EXISTS idx_validation_requests_requester ON validation_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_validation_requests_assigned ON validation_requests(assigned_to);
CREATE INDEX IF NOT EXISTS idx_validation_requests_status ON validation_requests(status);

-- Vérifier que tout est OK
SELECT 'Migration terminée avec succès!' as message;
