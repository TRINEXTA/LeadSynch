-- Table des rappels/follow-ups
CREATE TABLE IF NOT EXISTS follow_ups (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  lead_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'call', -- call, email, meeting, demo, quote, other
  priority VARCHAR(20) NOT NULL DEFAULT 'medium', -- low, medium, high
  title VARCHAR(255),
  notes TEXT,
  scheduled_date TIMESTAMP NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  completed_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_follow_ups_tenant ON follow_ups(tenant_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_user ON follow_ups(user_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_lead ON follow_ups(lead_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_scheduled ON follow_ups(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_follow_ups_completed ON follow_ups(completed);

-- Vue pour les rappels avec infos lead et user
CREATE OR REPLACE VIEW follow_ups_view AS
SELECT 
  f.*,
  l.company_name,
  l.email AS lead_email,
  l.phone AS lead_phone,
  l.industry,
  u.first_name || ' ' || u.last_name AS user_name,
  u.email AS user_email
FROM follow_ups f
LEFT JOIN leads l ON f.lead_id = l.id
LEFT JOIN users u ON f.user_id = u.id;
