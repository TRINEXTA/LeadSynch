-- Migration: Add missing performance indexes
-- Date: 2025-12-02
-- Description: Add missing indexes for frequently queried columns to improve performance

-- ============================================
-- LEADS TABLE INDEXES
-- ============================================

-- Index for tenant_id + status queries (common filter combination)
CREATE INDEX IF NOT EXISTS idx_leads_tenant_status ON leads(tenant_id, status);

-- Index for tenant_id alone (if not already exists)
CREATE INDEX IF NOT EXISTS idx_leads_tenant_id ON leads(tenant_id);

-- Index for assigned_to (for filtering leads by commercial)
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);

-- Index for sector (for filtering by industry)
CREATE INDEX IF NOT EXISTS idx_leads_sector ON leads(sector);

-- Index for created_at (for sorting and date range queries)
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);

-- ============================================
-- CAMPAIGNS TABLE INDEXES
-- ============================================

-- Index for tenant_id + status queries
CREATE INDEX IF NOT EXISTS idx_campaigns_tenant_status ON campaigns(tenant_id, status);

-- Index for created_by (for filtering campaigns by creator)
CREATE INDEX IF NOT EXISTS idx_campaigns_created_by ON campaigns(created_by);

-- Index for status alone (for filtering active/paused campaigns)
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);

-- ============================================
-- EMAIL_QUEUE TABLE INDEXES
-- ============================================

-- Index for status (critical for email worker performance)
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);

-- Index for campaign_id (for campaign-specific queries)
CREATE INDEX IF NOT EXISTS idx_email_queue_campaign ON email_queue(campaign_id);

-- Index for scheduled_at (for scheduling queries)
CREATE INDEX IF NOT EXISTS idx_email_queue_scheduled ON email_queue(scheduled_at);

-- Composite index for worker queries
CREATE INDEX IF NOT EXISTS idx_email_queue_status_scheduled ON email_queue(status, scheduled_at);

-- ============================================
-- EMAIL_TRACKING TABLE INDEXES
-- ============================================

-- Index for campaign_id (for campaign stats)
CREATE INDEX IF NOT EXISTS idx_email_tracking_campaign ON email_tracking(campaign_id);

-- Index for lead_id (for lead activity)
CREATE INDEX IF NOT EXISTS idx_email_tracking_lead ON email_tracking(lead_id);

-- Index for event_type (for filtering opens/clicks)
CREATE INDEX IF NOT EXISTS idx_email_tracking_event_type ON email_tracking(event_type);

-- Composite index for campaign stats queries
CREATE INDEX IF NOT EXISTS idx_email_tracking_campaign_event ON email_tracking(campaign_id, event_type);

-- ============================================
-- PIPELINE_LEADS TABLE INDEXES
-- ============================================

-- Index for campaign_id (for pipeline by campaign)
CREATE INDEX IF NOT EXISTS idx_pipeline_leads_campaign ON pipeline_leads(campaign_id);

-- Index for stage (for filtering by stage)
CREATE INDEX IF NOT EXISTS idx_pipeline_leads_stage ON pipeline_leads(stage);

-- Index for lead_id (for lead lookups)
CREATE INDEX IF NOT EXISTS idx_pipeline_leads_lead ON pipeline_leads(lead_id);

-- ============================================
-- FOLLOW_UPS TABLE INDEXES
-- ============================================

-- Index for assigned_to (for user task lists)
CREATE INDEX IF NOT EXISTS idx_follow_ups_assigned ON follow_ups(assigned_to);

-- Index for status + due_date (for task filtering)
CREATE INDEX IF NOT EXISTS idx_follow_ups_status_due ON follow_ups(status, due_date);

-- Index for tenant_id
CREATE INDEX IF NOT EXISTS idx_follow_ups_tenant ON follow_ups(tenant_id);

-- ============================================
-- USERS TABLE INDEXES
-- ============================================

-- Index for tenant_id (for team queries)
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);

-- Index for role (for permission queries)
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ============================================
-- VERIFICATION: List all indexes
-- ============================================
-- SELECT indexname, tablename FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename, indexname;
