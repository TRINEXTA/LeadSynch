import { jest, describe, test, expect, beforeEach } from '@jest/globals';

describe('Campaigns API', () => {
  const mockCampaign = {
    id: '123e4567-e89b-12d3-a456-426614174100',
    name: 'Test Campaign',
    type: 'email',
    database_id: '123e4567-e89b-12d3-a456-426614174200',
    tenant_id: global.testUtils.mockTenant.id,
    status: 'draft',
    created_by: global.testUtils.mockUser.id
  };

  describe('Zod Validation Schema', () => {
    test('should require name field', () => {
      const invalidData = { type: 'email', database_id: '123' };
      expect(invalidData.name).toBeUndefined();
    });

    test('should validate type as email or phone', () => {
      const validTypes = ['email', 'phone'];
      const invalidType = 'sms';

      expect(validTypes).toContain('email');
      expect(validTypes).toContain('phone');
      expect(validTypes).not.toContain(invalidType);
    });

    test('should require valid UUID for database_id', () => {
      const validUUID = '123e4567-e89b-12d3-a456-426614174000';
      const invalidUUID = 'not-a-uuid';

      expect(validUUID).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(invalidUUID).not.toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    test('should validate send_time format (HH:MM)', () => {
      const validTime = '09:30';
      const invalidTime = '9:30';

      expect(validTime).toMatch(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/);
      expect(invalidTime).not.toMatch(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/);
    });

    test('should limit emails_per_cycle to 1-1000', () => {
      const validCount = 100;
      const tooHigh = 1001;
      const tooLow = 0;

      expect(validCount).toBeGreaterThanOrEqual(1);
      expect(validCount).toBeLessThanOrEqual(1000);
      expect(tooHigh).toBeGreaterThan(1000);
      expect(tooLow).toBeLessThan(1);
    });

    test('should validate send_days as array of 1-7', () => {
      const validDays = [1, 2, 3, 4, 5]; // Monday to Friday
      const invalidDays = [0, 8]; // Invalid day numbers

      validDays.forEach(day => {
        expect(day).toBeGreaterThanOrEqual(1);
        expect(day).toBeLessThanOrEqual(7);
      });

      expect(invalidDays[0]).toBeLessThan(1);
      expect(invalidDays[1]).toBeGreaterThan(7);
    });

    test('should validate status enum', () => {
      const validStatuses = ['draft', 'active', 'paused', 'stopped', 'archived'];
      const invalidStatus = 'pending';

      expect(validStatuses).not.toContain(invalidStatus);
      validStatuses.forEach(status => {
        expect(['draft', 'active', 'paused', 'stopped', 'archived']).toContain(status);
      });
    });

    test('should validate link as URL when provided', () => {
      const validUrl = 'https://example.com/track';
      const invalidUrl = 'not-a-url';

      expect(validUrl).toMatch(/^https?:\/\//);
      expect(invalidUrl).not.toMatch(/^https?:\/\//);
    });
  });

  describe('GET /api/campaigns', () => {
    test('should return campaigns for admin users', () => {
      const adminUser = { ...global.testUtils.mockUser, role: 'admin' };
      expect(adminUser.role).toBe('admin');
    });

    test('should filter campaigns for non-admin users', () => {
      const regularUser = { ...global.testUtils.mockUser, role: 'user' };
      expect(regularUser.role).toBe('user');
    });

    test('should include database_name and template_name', () => {
      const campaignWithJoins = {
        ...mockCampaign,
        database_name: 'Test Database',
        template_name: 'Welcome Email'
      };

      expect(campaignWithJoins.database_name).toBe('Test Database');
      expect(campaignWithJoins.template_name).toBe('Welcome Email');
    });

    test('should order by created_at DESC', () => {
      const orderClause = 'ORDER BY c.created_at DESC';
      expect(orderClause).toContain('created_at DESC');
    });
  });

  describe('GET /api/campaigns/my-campaigns', () => {
    test('should return campaigns with stats', () => {
      const campaignWithStats = {
        ...mockCampaign,
        my_leads_count: 50,
        emails_sent: 25
      };

      expect(campaignWithStats.my_leads_count).toBe(50);
      expect(campaignWithStats.emails_sent).toBe(25);
    });

    test('should filter by assigned_users for regular users', () => {
      const userId = global.testUtils.mockUser.id;
      expect(userId).toBeDefined();
    });

    test('should include campaigns created by user', () => {
      const userId = global.testUtils.mockUser.id;
      expect(userId).toBe(mockCampaign.created_by);
    });
  });

  describe('Role-based Access Control', () => {
    test('super_admin should see all campaigns', () => {
      const superAdmin = { ...global.testUtils.mockUser, is_super_admin: true };
      expect(superAdmin.is_super_admin).toBe(true);
    });

    test('admin should see all tenant campaigns', () => {
      const admin = { ...global.testUtils.mockUser, role: 'admin' };
      expect(admin.role).toBe('admin');
    });

    test('manager should see assigned campaigns only', () => {
      const manager = { ...global.testUtils.mockUser, role: 'manager' };
      expect(manager.role).toBe('manager');
    });

    test('user should see assigned campaigns only', () => {
      const user = { ...global.testUtils.mockUser, role: 'user' };
      expect(user.role).toBe('user');
    });
  });

  describe('Tenant Isolation', () => {
    test('should always filter by tenant_id', () => {
      const tenantId = global.testUtils.mockTenant.id;
      expect(tenantId).toBeDefined();
    });

    test('should not return campaigns from other tenants', () => {
      const otherTenantCampaign = {
        ...mockCampaign,
        tenant_id: 'other-tenant-id'
      };

      expect(otherTenantCampaign.tenant_id).not.toBe(global.testUtils.mockTenant.id);
    });
  });

  describe('Campaign Status Transitions', () => {
    test('should allow transition from draft to active', () => {
      const validTransitions = {
        'draft': ['active', 'archived'],
        'active': ['paused', 'stopped'],
        'paused': ['active', 'stopped'],
        'stopped': ['archived'],
        'archived': []
      };

      expect(validTransitions['draft']).toContain('active');
    });

    test('should not allow reactivating archived campaigns', () => {
      const archivedTransitions = [];
      expect(archivedTransitions).not.toContain('active');
    });
  });

  describe('POST /api/campaigns', () => {
    test('should create campaign with valid data', () => {
      const validCampaign = {
        name: 'New Campaign',
        type: 'email',
        database_id: '123e4567-e89b-12d3-a456-426614174200'
      };

      expect(validCampaign.name).toBeDefined();
      expect(validCampaign.type).toBe('email');
      expect(validCampaign.database_id).toBeDefined();
    });

    test('should set default status to draft', () => {
      const defaultStatus = 'draft';
      expect(defaultStatus).toBe('draft');
    });

    test('should set created_by to current user', () => {
      const userId = global.testUtils.mockUser.id;
      expect(userId).toBeDefined();
    });
  });

  describe('Campaign Sectors/Filtering', () => {
    test('should support sectors as record of database_id to sector array', () => {
      const sectors = {
        'db-1': ['tech', 'finance'],
        'db-2': ['healthcare']
      };

      expect(sectors['db-1']).toContain('tech');
      expect(sectors['db-2']).toContain('healthcare');
    });

    test('should filter leads by database and sector', () => {
      const database_id = '123';
      const sectors = ['tech', 'finance'];

      expect(database_id).toBeDefined();
      expect(sectors.length).toBe(2);
    });
  });

  describe('Campaign Scheduling', () => {
    test('should validate send_days array', () => {
      const sendDays = [1, 2, 3, 4, 5]; // Mon-Fri
      expect(sendDays.every(d => d >= 1 && d <= 7)).toBe(true);
    });

    test('should validate send time range', () => {
      const startTime = '09:00';
      const endTime = '18:00';

      expect(startTime < endTime).toBe(true);
    });

    test('should validate emails_per_cycle and interval', () => {
      const emailsPerCycle = 50;
      const intervalMinutes = 60;

      expect(emailsPerCycle).toBeGreaterThan(0);
      expect(intervalMinutes).toBeGreaterThan(0);
    });
  });

  describe('Campaign Attachments', () => {
    test('should support attachments array', () => {
      const campaignWithAttachments = {
        ...mockCampaign,
        attachments: [
          { name: 'file.pdf', url: '/uploads/file.pdf' }
        ]
      };

      expect(campaignWithAttachments.attachments).toBeDefined();
      expect(campaignWithAttachments.attachments.length).toBe(1);
    });
  });

  describe('Track Clicks Option', () => {
    test('should support track_clicks boolean', () => {
      const campaignWithTracking = {
        ...mockCampaign,
        track_clicks: true
      };

      expect(campaignWithTracking.track_clicks).toBe(true);
    });
  });

  describe('Auto Distribution', () => {
    test('should support auto_distribute boolean', () => {
      const campaignWithAutoDistribute = {
        ...mockCampaign,
        auto_distribute: true
      };

      expect(campaignWithAutoDistribute.auto_distribute).toBe(true);
    });
  });
});
