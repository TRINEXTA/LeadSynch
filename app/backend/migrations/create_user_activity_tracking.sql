-- =========================================
-- MIGRATION: Système de tracking d'activité utilisateur
-- Date: 2025-01-06
-- Description: Ajoute le suivi en temps réel des connexions et activités
-- =========================================

-- ========== 1. COLONNES SUPPLÉMENTAIRES SUR USERS ==========

-- Dernière activité (mise à jour à chaque requête API)
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP;

-- Statut de présence calculé
ALTER TABLE users ADD COLUMN IF NOT EXISTS presence_status VARCHAR(20) DEFAULT 'offline';
-- Valeurs: 'online', 'idle', 'offline'

-- Page courante (pour savoir où est l'utilisateur)
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_page VARCHAR(255);

-- Index pour les requêtes de présence
CREATE INDEX IF NOT EXISTS idx_users_last_activity ON users(last_activity);
CREATE INDEX IF NOT EXISTS idx_users_presence ON users(tenant_id, presence_status);

-- ========== 2. TABLE DES SESSIONS UTILISATEUR ==========

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Informations de connexion
  login_at TIMESTAMP DEFAULT NOW(),
  logout_at TIMESTAMP,
  last_activity TIMESTAMP DEFAULT NOW(),

  -- Informations techniques
  ip_address VARCHAR(50),
  user_agent TEXT,
  device_type VARCHAR(50), -- 'desktop', 'mobile', 'tablet'
  browser VARCHAR(100),

  -- Statut de la session
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'idle', 'expired', 'logged_out'

  -- Durée totale (calculée à la déconnexion)
  duration_seconds INTEGER,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_tenant ON user_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_status ON user_sessions(status);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(tenant_id, status) WHERE status = 'active';

-- ========== 3. TABLE DES LOGS D'ACTIVITÉ ==========

CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  session_id UUID REFERENCES user_sessions(id) ON DELETE SET NULL,

  -- Type d'action
  action VARCHAR(100) NOT NULL,
  -- Exemples: 'login', 'logout', 'view_page', 'create_lead', 'update_lead',
  -- 'delete_lead', 'send_email', 'start_call', 'end_call', 'qualify_lead', etc.

  -- Catégorie d'action
  category VARCHAR(50),
  -- Exemples: 'auth', 'leads', 'campaigns', 'emails', 'calls', 'pipeline', 'settings'

  -- Ressource concernée
  resource_type VARCHAR(50),  -- 'lead', 'campaign', 'email_template', etc.
  resource_id UUID,
  resource_name VARCHAR(255), -- Nom lisible (ex: nom du lead, nom de la campagne)

  -- Détails de l'action
  description TEXT,
  changes JSONB, -- Avant/après pour les modifications
  metadata JSONB, -- Données supplémentaires

  -- Informations techniques
  ip_address VARCHAR(50),
  page_url VARCHAR(500),

  -- Horodatage
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index pour les requêtes de logs
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_tenant ON activity_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_category ON activity_logs(category);
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource ON activity_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_date ON activity_logs(created_at DESC);

-- ========== 4. VUE POUR LE DASHBOARD ADMIN ==========

CREATE OR REPLACE VIEW user_activity_summary AS
SELECT
  u.id as user_id,
  u.tenant_id,
  u.first_name,
  u.last_name,
  u.email,
  u.role,
  u.is_active,
  u.last_login,
  u.last_activity,
  u.presence_status,
  u.current_page,

  -- Session active
  (SELECT COUNT(*) FROM user_sessions us
   WHERE us.user_id = u.id AND us.status = 'active') as active_sessions,

  -- Dernière session
  (SELECT login_at FROM user_sessions us
   WHERE us.user_id = u.id
   ORDER BY login_at DESC LIMIT 1) as last_session_start,

  -- Temps total connecté aujourd'hui
  (SELECT COALESCE(SUM(
    CASE
      WHEN us.logout_at IS NOT NULL THEN EXTRACT(EPOCH FROM (us.logout_at - us.login_at))
      WHEN us.status = 'active' THEN EXTRACT(EPOCH FROM (NOW() - us.login_at))
      ELSE 0
    END
  ), 0)::INTEGER
   FROM user_sessions us
   WHERE us.user_id = u.id
   AND DATE(us.login_at) = CURRENT_DATE) as time_online_today_seconds,

  -- Nombre d'actions aujourd'hui
  (SELECT COUNT(*) FROM activity_logs al
   WHERE al.user_id = u.id
   AND DATE(al.created_at) = CURRENT_DATE) as actions_today,

  -- Dernière action
  (SELECT al.action FROM activity_logs al
   WHERE al.user_id = u.id
   ORDER BY al.created_at DESC LIMIT 1) as last_action,

  (SELECT al.created_at FROM activity_logs al
   WHERE al.user_id = u.id
   ORDER BY al.created_at DESC LIMIT 1) as last_action_at

FROM users u
WHERE u.role != 'super_admin';

-- ========== 5. FONCTION POUR CALCULER LE STATUT DE PRÉSENCE ==========

CREATE OR REPLACE FUNCTION update_user_presence_status()
RETURNS void AS $$
BEGIN
  -- Marquer comme 'offline' les utilisateurs inactifs depuis plus de 15 minutes
  UPDATE users
  SET presence_status = 'offline'
  WHERE last_activity < NOW() - INTERVAL '15 minutes'
  AND presence_status != 'offline';

  -- Marquer comme 'idle' les utilisateurs inactifs depuis 5-15 minutes
  UPDATE users
  SET presence_status = 'idle'
  WHERE last_activity >= NOW() - INTERVAL '15 minutes'
  AND last_activity < NOW() - INTERVAL '5 minutes'
  AND presence_status = 'online';

  -- Expirer les sessions inactives depuis plus de 30 minutes
  UPDATE user_sessions
  SET status = 'expired',
      logout_at = last_activity,
      duration_seconds = EXTRACT(EPOCH FROM (last_activity - login_at))::INTEGER
  WHERE status = 'active'
  AND last_activity < NOW() - INTERVAL '30 minutes';
END;
$$ LANGUAGE plpgsql;

-- ========== 6. DONNÉES INITIALES ==========

-- Mettre à jour les utilisateurs existants avec last_activity = last_login
UPDATE users
SET last_activity = COALESCE(last_login, created_at),
    presence_status = 'offline'
WHERE last_activity IS NULL;

-- ========== 7. COMMENTAIRES ==========

COMMENT ON TABLE user_sessions IS 'Historique des sessions de connexion des utilisateurs';
COMMENT ON TABLE activity_logs IS 'Journal d''audit de toutes les actions utilisateur';
COMMENT ON COLUMN users.last_activity IS 'Dernière activité de l''utilisateur (mise à jour à chaque requête API)';
COMMENT ON COLUMN users.presence_status IS 'Statut de présence: online (actif), idle (inactif 5-15min), offline (inactif 15min+)';
COMMENT ON COLUMN users.current_page IS 'Page actuelle où se trouve l''utilisateur';

-- ========== FIN DE LA MIGRATION ==========
