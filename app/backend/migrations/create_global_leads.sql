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

  -- Contact
  contact_name VARCHAR(255),
  contact_role VARCHAR(100),

  -- Localisation
  address TEXT,
  city VARCHAR(255),
  postal_code VARCHAR(20),
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),

  -- Catégorisation
  industry VARCHAR(100), -- Secteur d'activité (juridique, informatique, etc.)

  -- Données Sirene/INSEE
  siren VARCHAR(9),
  siret VARCHAR(14),
  naf_code VARCHAR(10),
  naf_label VARCHAR(255),
  employee_count INTEGER,
  employee_range VARCHAR(50),
  legal_form VARCHAR(100),
  creation_date DATE,
  company_status VARCHAR(20) DEFAULT 'active',

  -- Qualité
  quality_score INTEGER DEFAULT 0,

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

-- ========== COLONNES MANQUANTES (pour tables existantes) ==========
ALTER TABLE global_leads ADD COLUMN IF NOT EXISTS contact_name VARCHAR(255);
ALTER TABLE global_leads ADD COLUMN IF NOT EXISTS contact_role VARCHAR(100);
ALTER TABLE global_leads ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);
ALTER TABLE global_leads ADD COLUMN IF NOT EXISTS siren VARCHAR(9);
ALTER TABLE global_leads ADD COLUMN IF NOT EXISTS siret VARCHAR(14);
ALTER TABLE global_leads ADD COLUMN IF NOT EXISTS naf_code VARCHAR(10);
ALTER TABLE global_leads ADD COLUMN IF NOT EXISTS naf_label VARCHAR(255);
ALTER TABLE global_leads ADD COLUMN IF NOT EXISTS employee_count INTEGER;
ALTER TABLE global_leads ADD COLUMN IF NOT EXISTS employee_range VARCHAR(50);
ALTER TABLE global_leads ADD COLUMN IF NOT EXISTS legal_form VARCHAR(100);
ALTER TABLE global_leads ADD COLUMN IF NOT EXISTS creation_date DATE;
ALTER TABLE global_leads ADD COLUMN IF NOT EXISTS company_status VARCHAR(20);
ALTER TABLE global_leads ADD COLUMN IF NOT EXISTS quality_score INTEGER;

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
