-- =========================================
-- FIX: Permissions pour les tables d'activité utilisateur
-- À exécuter sur le VPS PostgreSQL
-- =========================================

-- Remplacez 'votre_utilisateur' par le nom d'utilisateur de votre connexion DB
-- Vous pouvez trouver cet utilisateur dans votre POSTGRES_URL

-- Option 1: Si vous connaissez le nom d'utilisateur
-- GRANT ALL PRIVILEGES ON TABLE user_sessions TO votre_utilisateur;
-- GRANT ALL PRIVILEGES ON TABLE activity_logs TO votre_utilisateur;

-- Option 2: Donner les permissions à PUBLIC (tous les utilisateurs)
GRANT ALL PRIVILEGES ON TABLE user_sessions TO PUBLIC;
GRANT ALL PRIVILEGES ON TABLE activity_logs TO PUBLIC;

-- Option 3: Créer les permissions pour un utilisateur spécifique (plus sécurisé)
-- Exemple pour un utilisateur nommé 'leadsynch_user':
-- GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE user_sessions TO leadsynch_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE activity_logs TO leadsynch_user;

-- Vérifier les permissions
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_name IN ('user_sessions', 'activity_logs');
