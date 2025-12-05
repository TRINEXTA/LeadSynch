import { log, error, warn } from "../lib/logger.js";
import { queryOne, execute } from './db.js';

const QUOTA_LIMITS = {
  FREE: {
    email: 100,
    leads: 60, // 10 IA générés + 50 importés
    campaigns: 1,
    attachments: 3 // MB
  },
  BASIC: {
    email: 5000,
    leads: 1000,
    campaigns: 5,
    attachments: 5 // MB
  },
  PRO: {
    email: 50000,
    leads: 10000,
    campaigns: -1, // illimité
    attachments: 10 // MB
  },
  ENTERPRISE: {
    email: -1, // illimité
    leads: -1, // illimité
    campaigns: -1, // illimité
    attachments: 20 // MB
  }
};

export async function checkQuota(tenant_id, quota_type) {
  try {
    const quota = await queryOne(
      `SELECT * FROM quotas WHERE tenant_id = $1 AND quota_type = $2`,
      [tenant_id, quota_type]
    );

    if (!quota) {
      await execute(
        `INSERT INTO quotas (tenant_id, quota_type, plan_type, quota_limit, quota_used)
         VALUES ($1, $2, 'FREE', $3, 0)`,
        [tenant_id, quota_type, QUOTA_LIMITS.FREE[quota_type]]
      );

      return {
        allowed: true,
        remaining: QUOTA_LIMITS.FREE[quota_type],
        used: 0,
        limit: QUOTA_LIMITS.FREE[quota_type],
        percentage: 0,
        plan: 'FREE',
        unlimited: false
      };
    }

    const limit = quota.quota_limit;
    const used = quota.quota_used || 0;
    const unlimited = limit === -1;
    const remaining = unlimited ? -1 : Math.max(0, limit - used);
    const allowed = unlimited || remaining > 0;
    const percentage = unlimited ? 0 : Math.min(100, Math.round((used / limit) * 100));

    return {
      allowed,
      remaining,
      used,
      limit,
      percentage,
      plan: quota.plan_type,
      unlimited,
      max_size_mb: limit === -1 ? 20 : limit // Pour attachments
    };

  } catch (error) {
    error('Quota check error:', error);
    return {
      allowed: false,
      remaining: 0,
      used: 0,
      limit: 0,
      percentage: 100,
      plan: 'FREE',
      unlimited: false
    };
  }
}

export async function incrementQuota(tenant_id, quota_type, amount = 1) {
  try {
    await execute(
      `UPDATE quotas 
       SET quota_used = quota_used + $1, 
           updated_at = NOW()
       WHERE tenant_id = $2 AND quota_type = $3`,
      [amount, tenant_id, quota_type]
    );
    return true;
  } catch (error) {
    error('Quota increment error:', error);
    return false;
  }
}
