-- Migration: Ajout système "Ne pas contacter"
-- Date: 2025-11-16
-- Description: Ajoute les champs pour gérer les leads à ne pas contacter automatiquement

-- Ajouter les colonnes à la table leads
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS do_not_contact BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS do_not_contact_reason VARCHAR(100),
ADD COLUMN IF NOT EXISTS do_not_contact_since TIMESTAMP,
ADD COLUMN IF NOT EXISTS do_not_contact_by UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS do_not_contact_note TEXT,
ADD COLUMN IF NOT EXISTS manager_override_contact BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS manager_override_by UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS manager_override_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS manager_override_reason TEXT;

-- Index pour les requêtes de filtrage
CREATE INDEX IF NOT EXISTS idx_leads_do_not_contact ON leads(do_not_contact) WHERE do_not_contact = true;
CREATE INDEX IF NOT EXISTS idx_leads_do_not_contact_tenant ON leads(tenant_id, do_not_contact);
CREATE INDEX IF NOT EXISTS idx_leads_manager_override ON leads(manager_override_contact) WHERE manager_override_contact = true;

-- Commentaires
COMMENT ON COLUMN leads.do_not_contact IS 'Si true, ce lead ne sera plus contacté automatiquement';
COMMENT ON COLUMN leads.do_not_contact_reason IS 'Raison: no_phone, after_click, called_no_interest, other';
COMMENT ON COLUMN leads.do_not_contact_since IS 'Date depuis laquelle le lead ne doit plus être contacté';
COMMENT ON COLUMN leads.do_not_contact_by IS 'Utilisateur ayant marqué le lead comme "ne pas contacter"';
COMMENT ON COLUMN leads.do_not_contact_note IS 'Note explicative sur la raison';
COMMENT ON COLUMN leads.manager_override_contact IS 'Si true, manager a autorisé le contact malgré do_not_contact';
COMMENT ON COLUMN leads.manager_override_by IS 'Manager ayant autorisé l''override';
COMMENT ON COLUMN leads.manager_override_at IS 'Date de l''override manager';
COMMENT ON COLUMN leads.manager_override_reason IS 'Raison de l''autorisation de contact par le manager';
