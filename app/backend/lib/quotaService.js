import { queryOne, execute } from './db.js';

const QUOTA_LIMITS = {
  FREE: {
    email: 100,
    leads: 500,
    campaigns: 3,
    attachments: 3 // MB
  },
  STARTER: {
    email: 1000,
    leads: 5000,
    campaigns: 10,
    attachments: 5
  },
  PRO: {
    email: 10000,
    leads: 50000,
    campaigns: -1,
    attachments: 10
  },
  ENTERPRISE: {
    email: -1,
    leads: -1,
    campaigns: -1,
    attachments: 20
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
    console.error('Quota check error:', error);
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
    console.error('Quota increment error:', error);
    return false;
  }
}
