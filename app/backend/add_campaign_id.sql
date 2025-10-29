-- Ajouter la colonne campaign_id
ALTER TABLE leads 
ADD COLUMN campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL;

-- Créer un index pour les performances
CREATE INDEX idx_leads_campaign_id ON leads(campaign_id);

-- Vérifier que ça a marché
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'leads' 
AND column_name = 'campaign_id';
