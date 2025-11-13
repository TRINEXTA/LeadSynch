-- Migration : Ajouter support propriétaire de tenant et Stripe

-- 1. Ajouter colonnes Stripe dans tenants
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan VARCHAR(50) DEFAULT 'FREE';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'active';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(20) DEFAULT 'monthly';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

-- 2. Ajouter colonne is_tenant_owner dans users
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_tenant_owner BOOLEAN DEFAULT false;

-- 3. Marquer le premier utilisateur de chaque tenant comme propriétaire
-- (basé sur created_at au lieu de MIN(id) qui ne fonctionne pas avec UUID)
UPDATE users u
SET is_tenant_owner = true
FROM (
  SELECT DISTINCT ON (tenant_id) id, tenant_id
  FROM users
  ORDER BY tenant_id, created_at ASC
) first_users
WHERE u.id = first_users.id;

-- 4. Index pour performance
CREATE INDEX IF NOT EXISTS idx_tenants_stripe_customer ON tenants(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_tenants_stripe_subscription ON tenants(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_users_tenant_owner ON users(tenant_id, is_tenant_owner);

-- 5. Vérification
SELECT
  t.id as tenant_id,
  t.name as tenant_name,
  t.plan,
  u.email as owner_email,
  u.first_name || ' ' || u.last_name as owner_name,
  u.is_tenant_owner
FROM tenants t
LEFT JOIN users u ON t.id = u.tenant_id AND u.is_tenant_owner = true
ORDER BY t.created_at;
