import { log, error, warn } from "../lib/logger.js";
﻿import { queryAll, execute } from '../lib/db.js';
import dotenv from 'dotenv';

dotenv.config();

async function resetMonthlyQuotas() {
  try {
    log('🔄 Démarrage reset quotas mensuel...');

    // Récupérer les abonnements à reset
    const toReset = await queryAll(
      `SELECT tenant_id, plan 
       FROM subscriptions 
       WHERE current_period_end <= CURRENT_DATE`,
      []
    );

    log(`📊 ${toReset.length} abonnement(s) à réinitialiser`);

    // Reset les quotas
    if (toReset.length > 0) {
      await execute(
        `UPDATE subscriptions
         SET 
           google_leads_used = 0,
           local_leads_used = 0,
           emails_used = 0,
           current_period_start = CURRENT_DATE,
           current_period_end = CURRENT_DATE + INTERVAL '1 month',
           updated_at = NOW()
         WHERE current_period_end <= CURRENT_DATE`,
        []
      );

      log(`✅ ${toReset.length} abonnement(s) réinitialisé(s)`);
    }

    // Expirer les packs one-shot
    const expiredPacks = await queryAll(
      `SELECT id FROM one_shot_packs
       WHERE expires_at < CURRENT_DATE 
       AND status = 'active'`,
      []
    );

    if (expiredPacks.length > 0) {
      await execute(
        `UPDATE one_shot_packs
         SET status = 'expired'
         WHERE expires_at < CURRENT_DATE 
         AND status = 'active'`,
        []
      );

      log(`📦 ${expiredPacks.length} pack(s) expiré(s)`);
    }

    log('✅ Reset quotas terminé !');
    process.exit(0);

  } catch (error) {
    error('❌ Erreur reset quotas:', error);
    process.exit(1);
  }
}

resetMonthlyQuotas();
