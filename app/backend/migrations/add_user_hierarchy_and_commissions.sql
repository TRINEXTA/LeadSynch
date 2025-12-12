-- =========================================
-- MIGRATION: Système de hiérarchie utilisateurs et commissions
-- Date: 2025-12-11
-- Description: Ajoute la hiérarchie des rôles, les commissions et le planning
-- IMPORTANT: Cette migration est ADDITIVE - ne modifie aucune donnée existante
-- =========================================

-- ========== 1. EXTENSION TABLE USERS ==========

-- Niveau hiérarchique (complémentaire au rôle existant)
-- Permet de différencier les niveaux au sein du rôle 'manager'
ALTER TABLE users ADD COLUMN IF NOT EXISTS hierarchical_level VARCHAR(50);
COMMENT ON COLUMN users.hierarchical_level IS 'Niveau hiérarchique: director_general, director, supervisor, department_head, null (manager standard)';

-- Département/Pôle d'appartenance
ALTER TABLE users ADD COLUMN IF NOT EXISTS department_id UUID;

-- Système de commission
ALTER TABLE users ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2) DEFAULT 0;
COMMENT ON COLUMN users.commission_rate IS 'Taux de commission personnel (en %)';

ALTER TABLE users ADD COLUMN IF NOT EXISTS team_commission_rate DECIMAL(5,2) DEFAULT 0;
COMMENT ON COLUMN users.team_commission_rate IS 'Taux de commission sur les ventes de son équipe (en %)';

ALTER TABLE users ADD COLUMN IF NOT EXISTS commission_type VARCHAR(20) DEFAULT 'percentage';
COMMENT ON COLUMN users.commission_type IS 'Type de commission: percentage, fixed, mixed';

ALTER TABLE users ADD COLUMN IF NOT EXISTS base_salary DECIMAL(10,2);
COMMENT ON COLUMN users.base_salary IS 'Salaire fixe de base (optionnel, pour calculs)';

-- Avatar (le champ existe peut-être déjà, on s'assure qu'il est là)
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- ========== 2. TABLE DÉPARTEMENTS ==========

CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_departments_tenant ON departments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_departments_parent ON departments(parent_id);
CREATE INDEX IF NOT EXISTS idx_departments_manager ON departments(manager_id);

-- ========== 3. TABLE COMMISSIONS ==========

CREATE TABLE IF NOT EXISTS commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Bénéficiaire de la commission
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Source de la commission
  contract_id UUID,  -- Référence au contrat (si applicable)
  proposal_id UUID,  -- Référence à la proposition (si applicable)
  pipeline_lead_id UUID,  -- Référence au lead pipeline

  -- Montants
  base_amount DECIMAL(10,2) NOT NULL,  -- Montant du contrat sur lequel la commission est calculée
  commission_rate DECIMAL(5,2) NOT NULL,  -- Taux appliqué
  commission_amount DECIMAL(10,2) NOT NULL,  -- Montant de la commission

  -- Type de commission
  commission_type VARCHAR(50) NOT NULL DEFAULT 'direct_sale',
  -- Valeurs: 'direct_sale' (vente directe), 'team_bonus' (bonus équipe manager),
  --          'recurring' (commission récurrente abonnement), 'one_shot' (vente unique)

  -- Type de contrat source
  contract_type VARCHAR(50),  -- 'subscription', 'one_shot', 'engagement_12', etc.

  -- Période (pour les commissions récurrentes)
  period_month INTEGER,  -- Mois (1-12)
  period_year INTEGER,   -- Année

  -- Statut
  status VARCHAR(20) DEFAULT 'pending',
  -- Valeurs: 'pending', 'validated', 'paid', 'cancelled'

  validated_at TIMESTAMP,
  validated_by UUID REFERENCES users(id),
  paid_at TIMESTAMP,

  -- Métadonnées
  notes TEXT,
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commissions_tenant ON commissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_commissions_user ON commissions(user_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions(status);
CREATE INDEX IF NOT EXISTS idx_commissions_period ON commissions(period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_commissions_contract ON commissions(contract_id);
CREATE INDEX IF NOT EXISTS idx_commissions_type ON commissions(commission_type);

-- ========== 4. TABLE PLANNING ==========

CREATE TABLE IF NOT EXISTS planning_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Propriétaire de l'événement
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- Équipe (si événement d'équipe)
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,

  -- Informations événement
  title VARCHAR(255) NOT NULL,
  description TEXT,

  -- Type d'événement
  event_type VARCHAR(50) NOT NULL DEFAULT 'task',
  -- Valeurs: 'meeting', 'call', 'rdv_client', 'task', 'follow_up', 'conge', 'formation', 'other'

  -- Horaires
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  all_day BOOLEAN DEFAULT false,

  -- Lieu
  location VARCHAR(255),
  location_type VARCHAR(50),  -- 'office', 'client', 'remote', 'other'

  -- Liens avec d'autres entités
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  contract_id UUID,

  -- Récurrence
  is_recurring BOOLEAN DEFAULT false,
  recurrence_rule TEXT,  -- Format iCal RRULE
  parent_event_id UUID REFERENCES planning_events(id) ON DELETE CASCADE,

  -- Statut
  status VARCHAR(20) DEFAULT 'scheduled',
  -- Valeurs: 'scheduled', 'completed', 'cancelled', 'in_progress'

  -- Rappels
  reminder_minutes INTEGER,  -- Minutes avant l'événement pour rappel

  -- Couleur (pour affichage calendrier)
  color VARCHAR(20),

  -- Audit
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_planning_tenant ON planning_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_planning_user ON planning_events(user_id);
CREATE INDEX IF NOT EXISTS idx_planning_team ON planning_events(team_id);
CREATE INDEX IF NOT EXISTS idx_planning_dates ON planning_events(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_planning_type ON planning_events(event_type);
CREATE INDEX IF NOT EXISTS idx_planning_status ON planning_events(status);
CREATE INDEX IF NOT EXISTS idx_planning_lead ON planning_events(lead_id);

-- ========== 5. TABLE CONFIGURATION DES RÔLES PAR TENANT ==========

CREATE TABLE IF NOT EXISTS role_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Identifiant du niveau hiérarchique
  hierarchical_level VARCHAR(50) NOT NULL,

  -- Affichage
  display_name VARCHAR(100) NOT NULL,
  description TEXT,

  -- Position dans la hiérarchie (1 = plus haut)
  hierarchy_order INTEGER NOT NULL DEFAULT 99,

  -- Permissions par défaut pour ce niveau
  default_permissions JSONB DEFAULT '{}',

  -- Actif ou non
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(tenant_id, hierarchical_level)
);

CREATE INDEX IF NOT EXISTS idx_role_config_tenant ON role_configurations(tenant_id);

-- ========== 6. INSERTION DES CONFIGURATIONS PAR DÉFAUT ==========

-- Fonction pour initialiser les configurations de rôles pour un tenant
CREATE OR REPLACE FUNCTION init_role_configurations(p_tenant_id UUID)
RETURNS void AS $$
BEGIN
  -- Directeur Général
  INSERT INTO role_configurations (tenant_id, hierarchical_level, display_name, description, hierarchy_order, default_permissions)
  VALUES (
    p_tenant_id,
    'director_general',
    'Directeur Général',
    'Accès complet à toutes les fonctionnalités sauf super-admin',
    1,
    '{
      "view_all_leads": true,
      "import_leads": true,
      "generate_leads": true,
      "create_campaigns": true,
      "view_all_campaigns": true,
      "email_templates_marketing": true,
      "mailing_config": true,
      "spam_diagnostic": true,
      "test_mailing": true,
      "recategorize_ai": true,
      "detect_duplicates": true,
      "business_config": true,
      "manage_all_users": true,
      "view_databases": true,
      "view_commissions": true,
      "manage_commissions": true,
      "view_all_planning": true
    }'::jsonb
  )
  ON CONFLICT (tenant_id, hierarchical_level) DO NOTHING;

  -- Directeur
  INSERT INTO role_configurations (tenant_id, hierarchical_level, display_name, description, hierarchy_order, default_permissions)
  VALUES (
    p_tenant_id,
    'director',
    'Directeur',
    'Accès étendu avec statistiques globales',
    2,
    '{
      "view_all_leads": true,
      "import_leads": true,
      "generate_leads": true,
      "create_campaigns": true,
      "view_all_campaigns": true,
      "email_templates_marketing": true,
      "mailing_config": false,
      "spam_diagnostic": true,
      "test_mailing": true,
      "recategorize_ai": true,
      "detect_duplicates": true,
      "business_config": false,
      "manage_all_users": false,
      "view_databases": true,
      "view_commissions": true,
      "manage_commissions": false,
      "view_all_planning": true
    }'::jsonb
  )
  ON CONFLICT (tenant_id, hierarchical_level) DO NOTHING;

  -- Superviseur
  INSERT INTO role_configurations (tenant_id, hierarchical_level, display_name, description, hierarchy_order, default_permissions)
  VALUES (
    p_tenant_id,
    'supervisor',
    'Superviseur',
    'Supervision de plusieurs équipes',
    3,
    '{
      "view_all_leads": true,
      "import_leads": false,
      "generate_leads": false,
      "create_campaigns": true,
      "view_all_campaigns": true,
      "email_templates_marketing": false,
      "mailing_config": false,
      "spam_diagnostic": false,
      "test_mailing": false,
      "recategorize_ai": false,
      "detect_duplicates": false,
      "business_config": false,
      "manage_all_users": false,
      "view_databases": true,
      "view_commissions": true,
      "manage_commissions": false,
      "view_all_planning": false
    }'::jsonb
  )
  ON CONFLICT (tenant_id, hierarchical_level) DO NOTHING;

  -- Responsable de pôle/département
  INSERT INTO role_configurations (tenant_id, hierarchical_level, display_name, description, hierarchy_order, default_permissions)
  VALUES (
    p_tenant_id,
    'department_head',
    'Responsable de Pôle',
    'Gestion de son département uniquement',
    4,
    '{
      "view_all_leads": false,
      "import_leads": false,
      "generate_leads": false,
      "create_campaigns": true,
      "view_all_campaigns": false,
      "email_templates_marketing": false,
      "mailing_config": false,
      "spam_diagnostic": false,
      "test_mailing": false,
      "recategorize_ai": false,
      "detect_duplicates": false,
      "business_config": false,
      "manage_all_users": false,
      "view_databases": false,
      "view_commissions": true,
      "manage_commissions": false,
      "view_all_planning": false
    }'::jsonb
  )
  ON CONFLICT (tenant_id, hierarchical_level) DO NOTHING;

  -- Manager (niveau par défaut, permissions minimales)
  INSERT INTO role_configurations (tenant_id, hierarchical_level, display_name, description, hierarchy_order, default_permissions)
  VALUES (
    p_tenant_id,
    'manager',
    'Manager',
    'Manager commercial - supervision équipe directe',
    5,
    '{
      "view_all_leads": false,
      "import_leads": false,
      "generate_leads": false,
      "create_campaigns": false,
      "view_all_campaigns": false,
      "email_templates_marketing": false,
      "mailing_config": false,
      "spam_diagnostic": false,
      "test_mailing": false,
      "recategorize_ai": false,
      "detect_duplicates": false,
      "business_config": false,
      "manage_all_users": false,
      "view_databases": false,
      "view_commissions": true,
      "manage_commissions": false,
      "view_all_planning": false
    }'::jsonb
  )
  ON CONFLICT (tenant_id, hierarchical_level) DO NOTHING;

END;
$$ LANGUAGE plpgsql;

-- Initialiser pour tous les tenants existants
DO $$
DECLARE
  tenant_record RECORD;
BEGIN
  FOR tenant_record IN SELECT id FROM tenants LOOP
    PERFORM init_role_configurations(tenant_record.id);
  END LOOP;
END$$;

-- ========== 7. TRIGGERS ==========

-- Trigger pour updated_at sur les nouvelles tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_commissions_updated_at') THEN
    CREATE TRIGGER update_commissions_updated_at BEFORE UPDATE ON commissions
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_planning_updated_at') THEN
    CREATE TRIGGER update_planning_updated_at BEFORE UPDATE ON planning_events
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_departments_updated_at') THEN
    CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_role_config_updated_at') THEN
    CREATE TRIGGER update_role_config_updated_at BEFORE UPDATE ON role_configurations
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END$$;

-- ========== 8. CONTRAINTE FK POUR department_id ==========

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'users_department_id_fkey'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_department_id_fkey
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;
  END IF;
END$$;

-- ========== 9. INDEX SUPPLÉMENTAIRES ==========

CREATE INDEX IF NOT EXISTS idx_users_hierarchical_level ON users(hierarchical_level);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department_id);

-- ========== 10. VÉRIFICATION FINALE ==========

DO $$
BEGIN
  RAISE NOTICE '✅ Migration terminée avec succès !';
  RAISE NOTICE '📋 Colonnes ajoutées à users: hierarchical_level, department_id, commission_rate, team_commission_rate, commission_type, base_salary';
  RAISE NOTICE '📋 Tables créées: departments, commissions, planning_events, role_configurations';
END$$;
