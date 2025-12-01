-- Migration: Création de la table global_leads
-- Date: 2025-12-01
-- Description: Table centralisée pour stocker les leads générés depuis Google Maps
-- Cette table permet le cache/réutilisation des leads entre les tenants

-- ========== TABLE GLOBAL_LEADS ==========
CREATE TABLE IF NOT EXISTS global_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Informations entreprise
  company_name VARCHAR(500) NOT NULL,
  phone VARCHAR(50),
  website VARCHAR(500),
  email VARCHAR(255),
  all_emails TEXT, -- Liste de tous les emails trouvés, séparés par virgules

  -- Localisation
  address TEXT,
  city VARCHAR(255),
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),

  -- Catégorisation
  industry VARCHAR(100), -- Secteur d'activité (juridique, informatique, etc.)

  -- Google Maps données
  google_place_id VARCHAR(255) UNIQUE, -- ID unique Google pour éviter les doublons
  google_types JSONB, -- Types Google Maps (lawyer, restaurant, etc.)
  rating DECIMAL(2, 1), -- Note Google (1.0 à 5.0)
  review_count INTEGER, -- Nombre d'avis Google

  -- Métadonnées
  source VARCHAR(50) DEFAULT 'google_maps', -- google_maps, api_gouv, manual, etc.
  first_discovered_by UUID, -- tenant_id qui a découvert ce lead en premier
  last_verified_at TIMESTAMP, -- Dernière vérification des données

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ========== INDEXES ==========
CREATE INDEX IF NOT EXISTS idx_global_leads_industry ON global_leads(industry);
CREATE INDEX IF NOT EXISTS idx_global_leads_city ON global_leads(city);
CREATE INDEX IF NOT EXISTS idx_global_leads_industry_city ON global_leads(industry, city);
CREATE INDEX IF NOT EXISTS idx_global_leads_google_place_id ON global_leads(google_place_id);
CREATE INDEX IF NOT EXISTS idx_global_leads_email ON global_leads(email);
CREATE INDEX IF NOT EXISTS idx_global_leads_source ON global_leads(source);
CREATE INDEX IF NOT EXISTS idx_global_leads_last_verified ON global_leads(last_verified_at DESC);

-- ========== TRIGGER pour updated_at ==========
CREATE OR REPLACE FUNCTION update_global_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_global_leads_timestamp ON global_leads;
CREATE TRIGGER update_global_leads_timestamp
  BEFORE UPDATE ON global_leads
  FOR EACH ROW EXECUTE FUNCTION update_global_leads_updated_at();

-- ========== COMMENTAIRES ==========
COMMENT ON TABLE global_leads IS 'Cache centralisé des leads générés depuis Google Maps et autres sources';
COMMENT ON COLUMN global_leads.google_place_id IS 'ID unique Google Maps pour éviter les doublons';
COMMENT ON COLUMN global_leads.first_discovered_by IS 'Tenant ID qui a généré ce lead en premier';
COMMENT ON COLUMN global_leads.all_emails IS 'Tous les emails trouvés par scraping, séparés par virgules';

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration global_leads terminee !';
  RAISE NOTICE '========================================';
END$$;
