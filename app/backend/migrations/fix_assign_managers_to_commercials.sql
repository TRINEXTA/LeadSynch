-- =========================================
-- SCRIPT: Assigner des managers aux commerciaux
-- Date: 2025-11-19
-- Description: Assigne automatiquement un manager aux commerciaux qui n'en ont pas
-- =========================================

-- 1. Diagnostic : Voir les utilisateurs sans manager
DO $$
DECLARE
  unassigned_count INT;
BEGIN
  SELECT COUNT(*) INTO unassigned_count
  FROM users
  WHERE role IN ('user', 'commercial')
    AND manager_id IS NULL
    AND is_active = true;

  RAISE NOTICE '👥 Utilisateurs sans manager: %', unassigned_count;
END $$;

-- 2. Afficher les demandes orphelines (sans assigned_to)
DO $$
DECLARE
  orphan_requests INT;
BEGIN
  SELECT COUNT(*) INTO orphan_requests
  FROM validation_requests
  WHERE assigned_to IS NULL
    AND status = 'pending';

  RAISE NOTICE '📋 Demandes sans assignation: %', orphan_requests;
END $$;

-- 3. CORRECTION : Assigner automatiquement les commerciaux au premier manager/admin trouvé
-- (À exécuter uniquement si vous voulez corriger automatiquement)
DO $$
DECLARE
  default_manager_id UUID;
  updated_count INT;
BEGIN
  -- Trouver le premier manager ou admin
  SELECT id INTO default_manager_id
  FROM users
  WHERE role IN ('manager', 'admin')
    AND is_active = true
  ORDER BY created_at ASC
  LIMIT 1;

  IF default_manager_id IS NULL THEN
    RAISE WARNING '⚠️ Aucun manager/admin trouvé dans le système !';
    RETURN;
  END IF;

  -- Assigner ce manager aux commerciaux sans manager
  UPDATE users
  SET manager_id = default_manager_id
  WHERE role IN ('user', 'commercial')
    AND manager_id IS NULL
    AND is_active = true;

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  RAISE NOTICE '✅ % utilisateurs assignés au manager %', updated_count, default_manager_id;

  -- Ré-assigner les demandes orphelines à ce manager
  UPDATE validation_requests
  SET assigned_to = default_manager_id
  WHERE assigned_to IS NULL
    AND status = 'pending';

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  RAISE NOTICE '✅ % demandes ré-assignées au manager', updated_count;
END $$;

-- 4. Vérification finale
DO $$
DECLARE
  unassigned_count INT;
  orphan_requests INT;
BEGIN
  SELECT COUNT(*) INTO unassigned_count
  FROM users
  WHERE role IN ('user', 'commercial')
    AND manager_id IS NULL
    AND is_active = true;

  SELECT COUNT(*) INTO orphan_requests
  FROM validation_requests
  WHERE assigned_to IS NULL
    AND status = 'pending';

  RAISE NOTICE '=================================';
  RAISE NOTICE '📊 RÉSULTATS FINAUX:';
  RAISE NOTICE '   - Utilisateurs sans manager: %', unassigned_count;
  RAISE NOTICE '   - Demandes orphelines: %', orphan_requests;
  RAISE NOTICE '=================================';
END $$;
