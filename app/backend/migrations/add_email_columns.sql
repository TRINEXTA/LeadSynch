ALTER TABLE global_leads ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE global_leads ADD COLUMN IF NOT EXISTS all_emails TEXT;
CREATE INDEX IF NOT EXISTS idx_global_leads_email ON global_leads(email);