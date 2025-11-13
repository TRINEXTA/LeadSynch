-- Migration: Ajout du champ payment_link à la table contracts
-- Date: 2025-11-13
-- Description: Permet d'associer un lien de paiement (Stripe, PayPal, etc.) à chaque contrat

-- Vérifier si la table contracts existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contracts') THEN
    -- Créer la table contracts si elle n'existe pas
    CREATE TABLE contracts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      amount DECIMAL(10, 2),
      currency VARCHAR(3) DEFAULT 'EUR',
      status VARCHAR(50) DEFAULT 'draft', -- draft, sent, signed, cancelled
      signed_at TIMESTAMP,
      expires_at TIMESTAMP,
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE INDEX idx_contracts_tenant ON contracts(tenant_id);
    CREATE INDEX idx_contracts_lead ON contracts(lead_id);
    CREATE INDEX idx_contracts_status ON contracts(status);

    RAISE NOTICE 'Table contracts créée';
  END IF;
END
$$;

-- Ajouter le champ payment_link s'il n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contracts' AND column_name = 'payment_link'
  ) THEN
    ALTER TABLE contracts ADD COLUMN payment_link TEXT;
    RAISE NOTICE 'Colonne payment_link ajoutée à contracts';
  ELSE
    RAISE NOTICE 'Colonne payment_link existe déjà';
  END IF;
END
$$;

-- Ajouter un commentaire pour documenter le champ
COMMENT ON COLUMN contracts.payment_link IS 'Lien de paiement Stripe, PayPal ou autre pour ce contrat';
