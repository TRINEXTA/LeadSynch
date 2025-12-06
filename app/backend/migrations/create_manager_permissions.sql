-- =========================================
-- MIGRATION: Système de permissions pour managers
-- Date: 2025-12-06
-- Description: Ajoute des permissions granulaires pour les managers
-- =========================================

-- Ajouter la colonne permissions (JSONB) à la table users
ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}';

-- Les permissions par défaut pour un manager (restrictives)
-- Le super-admin ou admin peut ensuite activer des permissions supplémentaires

COMMENT ON COLUMN users.permissions IS 'Permissions granulaires pour les managers. Format JSON avec les clés:
  - view_all_leads: Voir tous les leads (pas seulement ceux des campagnes assignées)
  - import_leads: Importer des leads CSV
  - generate_leads: Génération de leads IA
  - create_campaigns: Créer des campagnes
  - view_all_campaigns: Voir toutes les campagnes (pas seulement les assignées)
  - email_templates_marketing: Accès aux templates marketing (pas juste réponses)
  - mailing_config: Configuration mailing
  - spam_diagnostic: Diagnostic anti-spam
  - test_mailing: Test d''envoi
  - recategorize_ai: Recatégorisation IA
  - detect_duplicates: Détection de doublons
  - business_config: Configuration business
  - manage_all_users: Gestion de tous les utilisateurs
  - view_databases: Accès aux bases de données
';

-- Index pour améliorer les performances des requêtes sur les permissions
CREATE INDEX IF NOT EXISTS idx_users_permissions ON users USING gin(permissions);

-- Mettre à jour les managers existants avec les permissions par défaut (toutes désactivées)
UPDATE users
SET permissions = '{
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
  "view_databases": false
}'::jsonb
WHERE role = 'manager' AND (permissions IS NULL OR permissions = '{}'::jsonb);

-- Les admins ont toutes les permissions par défaut
UPDATE users
SET permissions = '{
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
  "view_databases": true
}'::jsonb
WHERE role = 'admin' AND (permissions IS NULL OR permissions = '{}'::jsonb);
