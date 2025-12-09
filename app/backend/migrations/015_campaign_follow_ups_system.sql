-- =====================================================
-- Migration 015: Système de Relances Automatiques V3
-- Date: 2025-12-09
-- Description: Tables pour les relances intelligentes,
--              détection spam et audit RGPD
-- =====================================================

-- =====================================================
-- 1. TABLE: campaign_follow_ups
-- Configuration des relances par campagne
-- =====================================================
CREATE TABLE IF NOT EXISTS campaign_follow_ups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Configuration de la relance
    follow_up_number INTEGER NOT NULL CHECK (follow_up_number IN (1, 2)),
    target_audience VARCHAR(50) NOT NULL CHECK (target_audience IN ('opened_not_clicked', 'not_opened')),
    delay_days INTEGER NOT NULL DEFAULT 3 CHECK (delay_days >= 1 AND delay_days <= 30),

    -- Template généré par Asefi
    template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
    subject VARCHAR(500),
    html_content TEXT,

    -- Statut de la relance
    status VARCHAR(50) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'scheduled', 'active', 'paused', 'completed', 'cancelled')),

    -- Dates
    scheduled_for TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- Stats
    total_eligible INTEGER DEFAULT 0,
    total_sent INTEGER DEFAULT 0,
    total_opened INTEGER DEFAULT 0,
    total_clicked INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Une seule relance par numéro par campagne
    UNIQUE(campaign_id, follow_up_number)
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_follow_ups_campaign ON campaign_follow_ups(campaign_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_tenant ON campaign_follow_ups(tenant_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_status ON campaign_follow_ups(status);
CREATE INDEX IF NOT EXISTS idx_follow_ups_scheduled ON campaign_follow_ups(scheduled_for) WHERE status = 'scheduled';

-- =====================================================
-- 2. TABLE: follow_up_queue
-- Queue d'envoi pour les relances
-- =====================================================
CREATE TABLE IF NOT EXISTS follow_up_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follow_up_id UUID NOT NULL REFERENCES campaign_follow_ups(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Email du destinataire (snapshot au moment de l'ajout)
    recipient_email VARCHAR(255) NOT NULL,

    -- Statut
    status VARCHAR(50) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'sent', 'failed', 'skipped', 'bounced')),

    -- Si skipped, pourquoi ?
    skip_reason VARCHAR(100),
    -- (unsubscribed, bounced_before, already_clicked, already_converted, etc.)

    -- Dates
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Erreur si échec
    error_message TEXT,

    -- Un lead ne peut être dans la queue qu'une fois par relance
    UNIQUE(follow_up_id, lead_id)
);

-- Index pour le worker
CREATE INDEX IF NOT EXISTS idx_follow_up_queue_status ON follow_up_queue(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_follow_up_queue_follow_up ON follow_up_queue(follow_up_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_queue_lead ON follow_up_queue(lead_id);

-- =====================================================
-- 3. TABLE: unsubscribe_override_log
-- Audit des décisions sur désinscrits (RGPD compliance)
-- =====================================================
CREATE TABLE IF NOT EXISTS unsubscribe_override_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,

    -- Contexte
    lead_email VARCHAR(255) NOT NULL,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
    context VARCHAR(100) NOT NULL, -- 'csv_import', 'add_to_campaign', 'manual_add'

    -- Décision prise
    decision VARCHAR(50) NOT NULL CHECK (decision IN ('excluded', 'forced_include')),
    reason TEXT, -- Raison fournie par l'utilisateur si forced_include

    -- Métadonnées
    ip_address VARCHAR(45),
    user_agent TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour audit
CREATE INDEX IF NOT EXISTS idx_override_log_tenant ON unsubscribe_override_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_override_log_email ON unsubscribe_override_log(lead_email);
CREATE INDEX IF NOT EXISTS idx_override_log_date ON unsubscribe_override_log(created_at DESC);

-- =====================================================
-- 4. TABLE: campaign_spam_analysis
-- Analyse spam des campagnes
-- =====================================================
CREATE TABLE IF NOT EXISTS campaign_spam_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Date de l'analyse
    analyzed_at TIMESTAMPTZ DEFAULT NOW(),

    -- Stats au moment de l'analyse
    total_sent INTEGER NOT NULL DEFAULT 0,
    total_delivered INTEGER NOT NULL DEFAULT 0,
    total_opened INTEGER NOT NULL DEFAULT 0,
    total_bounced INTEGER NOT NULL DEFAULT 0,

    -- Résultats de l'analyse
    suspected_spam INTEGER DEFAULT 0,
    spam_score DECIMAL(5,2) DEFAULT 0, -- 0-100

    -- Détails par catégorie
    spam_reasons JSONB DEFAULT '{}',
    -- Exemple: {"no_open_7_days": 30, "soft_bounce_repeated": 10, "invalid_domain": 5}

    -- Recommandations générées
    recommendations TEXT[],

    -- Domaines problématiques identifiés
    problematic_domains JSONB DEFAULT '[]',

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_spam_analysis_campaign ON campaign_spam_analysis(campaign_id);
CREATE INDEX IF NOT EXISTS idx_spam_analysis_date ON campaign_spam_analysis(analyzed_at DESC);

-- =====================================================
-- 5. NOUVELLES COLONNES SUR campaigns
-- Pour supporter les relances
-- =====================================================
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS follow_ups_enabled BOOLEAN DEFAULT false;

ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS follow_ups_count INTEGER DEFAULT 0 CHECK (follow_ups_count >= 0 AND follow_ups_count <= 2);

ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS follow_up_delay_days INTEGER DEFAULT 3;

-- =====================================================
-- 6. TABLE: email_tracking (si n'existe pas)
-- Pour tracker opens/clicks par lead
-- =====================================================
CREATE TABLE IF NOT EXISTS email_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    campaign_id UUID NOT NULL,
    lead_id UUID NOT NULL,
    follow_up_id UUID, -- NULL si email principal, sinon ID de la relance

    event_type VARCHAR(50) NOT NULL
        CHECK (event_type IN ('sent', 'delivered', 'open', 'click', 'bounce', 'unsubscribe', 'spam')),

    -- Métadonnées de l'événement
    metadata JSONB DEFAULT '{}',
    -- Pour click: {"url": "..."}, pour bounce: {"type": "soft/hard", "reason": "..."}

    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Un seul événement de chaque type par lead/campagne/relance
    UNIQUE(campaign_id, lead_id, event_type, follow_up_id)
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_email_tracking_campaign ON email_tracking(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_tracking_lead ON email_tracking(lead_id);
CREATE INDEX IF NOT EXISTS idx_email_tracking_type ON email_tracking(event_type);
CREATE INDEX IF NOT EXISTS idx_email_tracking_campaign_type ON email_tracking(campaign_id, event_type);

-- =====================================================
-- 7. FONCTION: Calculer les leads éligibles pour relance
-- =====================================================
CREATE OR REPLACE FUNCTION get_follow_up_eligible_leads(
    p_campaign_id UUID,
    p_target_audience VARCHAR,
    p_follow_up_number INTEGER
) RETURNS TABLE (
    lead_id UUID,
    email VARCHAR,
    company VARCHAR,
    contact_name VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        l.id AS lead_id,
        l.email,
        l.company,
        l.contact_name
    FROM leads l
    JOIN email_queue eq ON eq.lead_id = l.id AND eq.campaign_id = p_campaign_id
    WHERE eq.status = 'sent'
    AND l.unsubscribed = false
    -- Pas déjà dans une queue de relance pour cette campagne
    AND NOT EXISTS (
        SELECT 1 FROM follow_up_queue fq
        JOIN campaign_follow_ups cfu ON fq.follow_up_id = cfu.id
        WHERE fq.lead_id = l.id
        AND cfu.campaign_id = p_campaign_id
        AND cfu.follow_up_number >= p_follow_up_number
    )
    -- Logique selon target_audience
    AND (
        CASE
            WHEN p_target_audience = 'opened_not_clicked' THEN
                -- A ouvert MAIS pas cliqué
                EXISTS (
                    SELECT 1 FROM email_tracking et
                    WHERE et.lead_id = l.id
                    AND et.campaign_id = p_campaign_id
                    AND et.event_type = 'open'
                    AND et.follow_up_id IS NULL -- Seulement email principal
                )
                AND NOT EXISTS (
                    SELECT 1 FROM email_tracking et
                    WHERE et.lead_id = l.id
                    AND et.campaign_id = p_campaign_id
                    AND et.event_type = 'click'
                    AND et.follow_up_id IS NULL
                )
            WHEN p_target_audience = 'not_opened' THEN
                -- N'a jamais ouvert
                NOT EXISTS (
                    SELECT 1 FROM email_tracking et
                    WHERE et.lead_id = l.id
                    AND et.campaign_id = p_campaign_id
                    AND et.event_type = 'open'
                    AND et.follow_up_id IS NULL
                )
            ELSE false
        END
    )
    -- Pas bounced
    AND NOT EXISTS (
        SELECT 1 FROM email_queue eq2
        WHERE eq2.lead_id = l.id
        AND eq2.campaign_id = p_campaign_id
        AND eq2.status = 'bounced'
    );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. TRIGGER: Mise à jour automatique de updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer le trigger sur les nouvelles tables
DROP TRIGGER IF EXISTS update_campaign_follow_ups_updated_at ON campaign_follow_ups;
CREATE TRIGGER update_campaign_follow_ups_updated_at
    BEFORE UPDATE ON campaign_follow_ups
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 9. Commentaires pour documentation
-- =====================================================
COMMENT ON TABLE campaign_follow_ups IS 'Configuration des relances automatiques par campagne (max 2 relances)';
COMMENT ON TABLE follow_up_queue IS 'Queue d''envoi des emails de relance';
COMMENT ON TABLE unsubscribe_override_log IS 'Audit RGPD des décisions sur les désinscrits forcés';
COMMENT ON TABLE campaign_spam_analysis IS 'Analyses de détection spam par campagne';
COMMENT ON COLUMN campaign_follow_ups.target_audience IS 'opened_not_clicked = a ouvert mais pas cliqué, not_opened = n''a jamais ouvert';
COMMENT ON COLUMN unsubscribe_override_log.decision IS 'excluded = lead exclu comme demandé, forced_include = forcé malgré désinscription';

-- =====================================================
-- FIN DE LA MIGRATION
-- =====================================================
