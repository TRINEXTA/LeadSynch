-- =========================================
-- MIGRATION : Configuration Business pour Clients
-- Date : 2025-11-20
-- Description : Produits, CGV et liens paiement personnalisés par tenant
-- =========================================

-- ========== 1. TABLE PRODUITS CLIENTS ==========
-- Les clients peuvent créer leurs propres produits/services
CREATE TABLE IF NOT EXISTS tenant_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Informations produit
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100), -- 'consulting', 'development', 'support', 'marketing', 'other'

  -- Type et tarification
  type VARCHAR(50) NOT NULL DEFAULT 'subscription', -- 'subscription', 'one_time', 'hourly', 'quote'
  price DECIMAL(10, 2), -- NULL si "sur devis"
  currency VARCHAR(3) DEFAULT 'EUR',

  -- Périodicité (si abonnement)
  billing_cycle VARCHAR(50), -- 'monthly', 'quarterly', 'yearly', 'once'

  -- Engagement (optionnel)
  has_commitment_options BOOLEAN DEFAULT false,
  price_no_commitment DECIMAL(10, 2),
  price_monthly_commitment DECIMAL(10, 2),
  price_yearly_commitment DECIMAL(10, 2),

  -- Fonctionnalités incluses
  features JSONB, -- ["Feature 1", "Feature 2", ...]

  -- URL externe (optionnel)
  external_url TEXT,

  -- Statut
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_products_tenant ON tenant_products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_products_active ON tenant_products(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_tenant_products_category ON tenant_products(category);

COMMENT ON TABLE tenant_products IS 'Produits et services créés par les clients pour leurs propres contrats';

-- ========== 2. TABLE DOCUMENTS LÉGAUX ==========
-- CGV, templates de contrats personnalisés
CREATE TABLE IF NOT EXISTS tenant_legal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Type de document
  type VARCHAR(50) NOT NULL, -- 'cgv', 'cgu', 'contract_template', 'privacy_policy'

  -- Contenu
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL, -- Support des variables : {company_name}, {date}, {amount}, etc.

  -- Versioning
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,

  -- Métadonnées
  notes TEXT,

  -- Audit
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_legal_docs_tenant ON tenant_legal_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_legal_docs_type ON tenant_legal_documents(tenant_id, type);
CREATE INDEX IF NOT EXISTS idx_tenant_legal_docs_active ON tenant_legal_documents(tenant_id, is_active);

-- Contrainte : Un seul document actif par type par tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_legal_docs_active_unique
  ON tenant_legal_documents(tenant_id, type)
  WHERE is_active = true;

COMMENT ON TABLE tenant_legal_documents IS 'Documents légaux personnalisés (CGV, templates) pour chaque client';

-- ========== 3. TABLE LIENS DE PAIEMENT ==========
-- Liens externes Stripe, PayPal, etc. configurés par le client
CREATE TABLE IF NOT EXISTS tenant_payment_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Informations
  name VARCHAR(255) NOT NULL, -- 'Paiement Stripe', 'PayPal', 'Virement'
  provider VARCHAR(50), -- 'stripe', 'paypal', 'bank_transfer', 'other'
  url TEXT, -- Lien de paiement externe

  -- Instructions (optionnel, pour virement par exemple)
  instructions TEXT,

  -- Affichage
  icon_name VARCHAR(50), -- Nom de l'icône Lucide React
  display_in_contracts BOOLEAN DEFAULT true,
  display_in_quotes BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,

  -- Statut
  is_active BOOLEAN DEFAULT true,

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_payment_links_tenant ON tenant_payment_links(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_payment_links_active ON tenant_payment_links(tenant_id, is_active);

COMMENT ON TABLE tenant_payment_links IS 'Liens de paiement externes configurés par le client';

-- ========== 4. TRIGGERS updated_at ==========
CREATE OR REPLACE FUNCTION update_tenant_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tenant_products_updated_at
  BEFORE UPDATE ON tenant_products
  FOR EACH ROW
  EXECUTE FUNCTION update_tenant_config_updated_at();

CREATE TRIGGER tenant_legal_documents_updated_at
  BEFORE UPDATE ON tenant_legal_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_tenant_config_updated_at();

CREATE TRIGGER tenant_payment_links_updated_at
  BEFORE UPDATE ON tenant_payment_links
  FOR EACH ROW
  EXECUTE FUNCTION update_tenant_config_updated_at();

-- ========== 5. DONNÉES PAR DÉFAUT (Optionnel) ==========
-- Ajouter un produit par défaut "Service de Consulting" pour chaque tenant existant
INSERT INTO tenant_products (tenant_id, name, description, category, type, price, billing_cycle, features, is_active)
SELECT
  id as tenant_id,
  'Service de Consulting' as name,
  'Accompagnement stratégique personnalisé' as description,
  'consulting' as category,
  'subscription' as type,
  1000.00 as price,
  'monthly' as billing_cycle,
  '["Accompagnement stratégique", "Support dédié", "Rapports mensuels"]'::jsonb as features,
  false as is_active -- Désactivé par défaut, l'utilisateur l'activera s'il le souhaite
FROM tenants
ON CONFLICT DO NOTHING;

-- Ajouter CGV par défaut (vide, à remplir par le client)
INSERT INTO tenant_legal_documents (tenant_id, type, title, content, is_active)
SELECT
  id as tenant_id,
  'cgv' as type,
  'Conditions Générales de Vente' as title,
  'Veuillez configurer vos Conditions Générales de Vente dans les paramètres.' as content,
  false as is_active -- Désactivé tant que non configuré
FROM tenants
ON CONFLICT DO NOTHING;

-- ========== 6. VÉRIFICATION ==========
DO $$
BEGIN
  RAISE NOTICE '✅ Migration terminée : Configuration Business Clients';
  RAISE NOTICE 'Tables créées : tenant_products, tenant_legal_documents, tenant_payment_links';
END $$;
