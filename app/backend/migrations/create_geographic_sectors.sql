-- =========================================
-- MIGRATION: Système de Secteurs Géographiques
-- Date: 2025-11-16
-- Description: Système d'attribution de secteurs géographiques aux commerciaux
--              avec hiérarchie de management
-- =========================================

-- ========== 1. TABLE DES SECTEURS GÉOGRAPHIQUES ==========
CREATE TABLE IF NOT EXISTS geographic_sectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,                -- Ex: "Paris Nord", "Lyon Est", "Marseille Sud"
  code VARCHAR(50) NOT NULL,                 -- Ex: "PARIS_N", "LYON_E", "MARSEILLE_S"
  region VARCHAR(100),                       -- Ex: "Île-de-France", "Auvergne-Rhône-Alpes"
  department VARCHAR(100),                   -- Ex: "Paris (75)", "Rhône (69)"
  zone VARCHAR(50),                          -- Ex: "Nord", "Sud", "Est", "Ouest", "Centre"
  postal_codes TEXT[],                       -- Array de codes postaux: ['75001', '75002', ...]
  cities TEXT[],                             -- Array de villes: ['Paris', 'Boulogne-Billancourt', ...]
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  color VARCHAR(20),                         -- Couleur pour l'affichage sur carte
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Contrainte unique: un secteur par tenant/code
  UNIQUE(tenant_id, code)
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_sectors_tenant ON geographic_sectors(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sectors_zone ON geographic_sectors(zone);
CREATE INDEX IF NOT EXISTS idx_sectors_active ON geographic_sectors(is_active);
CREATE INDEX IF NOT EXISTS idx_sectors_region ON geographic_sectors(region);

-- ========== 2. TABLE D'ATTRIBUTION DES SECTEURS ==========
CREATE TABLE IF NOT EXISTS sector_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sector_id UUID NOT NULL REFERENCES geographic_sectors(id) ON DELETE CASCADE,

  -- Rôle dans ce secteur (permet hiérarchie)
  role VARCHAR(50) DEFAULT 'commercial',     -- commercial, zone_manager, regional_manager, department_head, commercial_director

  -- Période d'affectation
  assigned_at TIMESTAMP DEFAULT NOW(),
  assigned_by UUID REFERENCES users(id),    -- Qui a fait l'affectation
  valid_from DATE DEFAULT CURRENT_DATE,
  valid_until DATE,                          -- NULL = affectation permanente

  -- Statut
  is_active BOOLEAN DEFAULT true,
  is_primary BOOLEAN DEFAULT false,          -- Secteur principal pour ce commercial

  -- Métadonnées
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Contrainte unique: un utilisateur ne peut être affecté qu'une fois au même secteur en même temps
  UNIQUE(tenant_id, user_id, sector_id, is_active)
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_assignments_tenant ON sector_assignments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_assignments_user ON sector_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_assignments_sector ON sector_assignments(sector_id);
CREATE INDEX IF NOT EXISTS idx_assignments_active ON sector_assignments(is_active);
CREATE INDEX IF NOT EXISTS idx_assignments_role ON sector_assignments(role);

-- ========== 3. TABLE DE HIÉRARCHIE MANAGÉRIALE ==========
-- Définit la structure hiérarchique: Commercial → Zone Manager → Regional Manager → Department Head → Commercial Director
CREATE TABLE IF NOT EXISTS management_hierarchy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Relation manager-commercial
  manager_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,    -- Le manager
  subordinate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- Le subordonné

  -- Type de relation
  hierarchy_level VARCHAR(50),               -- "zone", "regional", "department", "director"

  -- Périmètre de responsabilité
  sector_ids UUID[],                         -- Array des secteurs concernés
  region VARCHAR(100),                       -- Région concernée

  -- Période de validité
  valid_from DATE DEFAULT CURRENT_DATE,
  valid_until DATE,
  is_active BOOLEAN DEFAULT true,

  -- Métadonnées
  assigned_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Contraintes
  UNIQUE(tenant_id, manager_id, subordinate_id, is_active),
  CHECK (manager_id != subordinate_id)       -- Un utilisateur ne peut pas être son propre manager
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_hierarchy_tenant ON management_hierarchy(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hierarchy_manager ON management_hierarchy(manager_id);
CREATE INDEX IF NOT EXISTS idx_hierarchy_subordinate ON management_hierarchy(subordinate_id);
CREATE INDEX IF NOT EXISTS idx_hierarchy_active ON management_hierarchy(is_active);

-- ========== 4. EXTENSION TABLE USERS POUR RÔLES ÉTENDUS ==========
-- Ajouter une colonne pour le rôle hiérarchique si elle n'existe pas
ALTER TABLE users ADD COLUMN IF NOT EXISTS hierarchical_role VARCHAR(50) DEFAULT 'commercial';
-- Valeurs possibles: 'commercial', 'zone_manager', 'regional_manager', 'department_head', 'commercial_director'

-- Ajouter une colonne pour le secteur principal
ALTER TABLE users ADD COLUMN IF NOT EXISTS primary_sector_id UUID REFERENCES geographic_sectors(id);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_users_hierarchical_role ON users(hierarchical_role);
CREATE INDEX IF NOT EXISTS idx_users_primary_sector ON users(primary_sector_id);

-- ========== 5. DONNÉES DE DÉMO - SECTEURS PARIS ==========
-- Créer des secteurs par défaut pour Île-de-France
DO $$
DECLARE
  v_tenant_id UUID;
BEGIN
  -- Récupérer le premier tenant (si existe)
  SELECT id INTO v_tenant_id FROM tenants LIMIT 1;

  IF v_tenant_id IS NOT NULL THEN
    -- Paris Nord
    INSERT INTO geographic_sectors (tenant_id, name, code, region, department, zone, postal_codes, cities, color)
    VALUES (
      v_tenant_id,
      'Paris Nord',
      'PARIS_NORD',
      'Île-de-France',
      'Paris (75)',
      'Nord',
      ARRAY['75017', '75018', '75019'],
      ARRAY['Paris 17e', 'Paris 18e', 'Paris 19e'],
      '#3B82F6'
    ) ON CONFLICT (tenant_id, code) DO NOTHING;

    -- Paris Sud
    INSERT INTO geographic_sectors (tenant_id, name, code, region, department, zone, postal_codes, cities, color)
    VALUES (
      v_tenant_id,
      'Paris Sud',
      'PARIS_SUD',
      'Île-de-France',
      'Paris (75)',
      'Sud',
      ARRAY['75013', '75014', '75015'],
      ARRAY['Paris 13e', 'Paris 14e', 'Paris 15e'],
      '#EF4444'
    ) ON CONFLICT (tenant_id, code) DO NOTHING;

    -- Paris Est
    INSERT INTO geographic_sectors (tenant_id, name, code, region, department, zone, postal_codes, cities, color)
    VALUES (
      v_tenant_id,
      'Paris Est',
      'PARIS_EST',
      'Île-de-France',
      'Paris (75)',
      'Est',
      ARRAY['75011', '75012', '75020'],
      ARRAY['Paris 11e', 'Paris 12e', 'Paris 20e'],
      '#10B981'
    ) ON CONFLICT (tenant_id, code) DO NOTHING;

    -- Paris Ouest
    INSERT INTO geographic_sectors (tenant_id, name, code, region, department, zone, postal_codes, cities, color)
    VALUES (
      v_tenant_id,
      'Paris Ouest',
      'PARIS_OUEST',
      'Île-de-France',
      'Paris (75)',
      'Ouest',
      ARRAY['75016', '75008', '75007'],
      ARRAY['Paris 16e', 'Paris 8e', 'Paris 7e'],
      '#F59E0B'
    ) ON CONFLICT (tenant_id, code) DO NOTHING;

    -- Hauts-de-Seine Nord
    INSERT INTO geographic_sectors (tenant_id, name, code, region, department, zone, postal_codes, cities, color)
    VALUES (
      v_tenant_id,
      'Hauts-de-Seine Nord',
      'HDS_NORD',
      'Île-de-France',
      'Hauts-de-Seine (92)',
      'Nord',
      ARRAY['92400', '92600', '92800'],
      ARRAY['Courbevoie', 'Asnières-sur-Seine', 'Puteaux'],
      '#8B5CF6'
    ) ON CONFLICT (tenant_id, code) DO NOTHING;

    -- Hauts-de-Seine Sud
    INSERT INTO geographic_sectors (tenant_id, name, code, region, department, zone, postal_codes, cities, color)
    VALUES (
      v_tenant_id,
      'Hauts-de-Seine Sud',
      'HDS_SUD',
      'Île-de-France',
      'Hauts-de-Seine (92)',
      'Sud',
      ARRAY['92100', '92130', '92190'],
      ARRAY['Boulogne-Billancourt', 'Issy-les-Moulineaux', 'Meudon'],
      '#EC4899'
    ) ON CONFLICT (tenant_id, code) DO NOTHING;
  END IF;
END$$;

-- ========== 6. COMMENTAIRES ==========
COMMENT ON TABLE geographic_sectors IS 'Secteurs géographiques pour attribution des commerciaux';
COMMENT ON TABLE sector_assignments IS 'Attribution des commerciaux aux secteurs géographiques';
COMMENT ON TABLE management_hierarchy IS 'Hiérarchie managériale (Commercial → Manager → Regional Manager → Director)';

COMMENT ON COLUMN geographic_sectors.zone IS 'Zone principale: Nord, Sud, Est, Ouest, Centre';
COMMENT ON COLUMN geographic_sectors.postal_codes IS 'Array des codes postaux couverts par ce secteur';

COMMENT ON COLUMN sector_assignments.role IS 'Rôle: commercial, zone_manager, regional_manager, department_head, commercial_director';
COMMENT ON COLUMN sector_assignments.is_primary IS 'Secteur principal pour affichage prioritaire';

COMMENT ON COLUMN management_hierarchy.hierarchy_level IS 'Niveau hiérarchique: zone, regional, department, director';

-- =========================================
-- FIN DE LA MIGRATION
-- =========================================
