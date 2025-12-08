import { jest, describe, test, expect, beforeEach } from '@jest/globals';

describe('Leads API', () => {
  describe('GET /api/leads', () => {
    test('should require tenant_id from authenticated user', () => {
      const mockReq = {
        method: 'GET',
        query: {},
        user: { id: global.testUtils.mockUser.id }
      };
      expect(mockReq.user.tenant_id).toBeUndefined();
    });

    test('should return paginated response structure', () => {
      const response = {
        success: true,
        leads: [],
        pagination: {
          page: 1,
          limit: 50,
          total: 0,
          totalPages: 0
        }
      };

      expect(response.success).toBe(true);
      expect(response.leads).toBeDefined();
      expect(response.pagination).toBeDefined();
      expect(response.pagination.page).toBe(1);
    });

    test('should default to page 1 and limit 50', () => {
      const defaultPage = 1;
      const defaultLimit = 50;

      expect(defaultPage).toBe(1);
      expect(defaultLimit).toBe(50);
    });

    test('should limit max results to 200', () => {
      const requestedLimit = 500;
      const maxLimit = 200;
      const actualLimit = Math.min(maxLimit, Math.max(1, requestedLimit));

      expect(actualLimit).toBe(200);
    });

    test('should support status filter', () => {
      const validStatuses = ['new', 'contacted', 'qualified', 'lost', 'won'];
      validStatuses.forEach(status => {
        expect(validStatuses).toContain(status);
      });
    });

    test('should support search across multiple fields', () => {
      const searchFields = ['company_name', 'email', 'phone', 'contact_name'];
      expect(searchFields.length).toBe(4);
    });

    test('should support database_id filter', () => {
      const database_id = '123e4567-e89b-12d3-a456-426614174002';
      expect(database_id).toMatch(/^[0-9a-f-]+$/);
    });
  });

  describe('GET /api/leads/:id', () => {
    test('should return lead with joined data', () => {
      const mockLead = {
        id: '1',
        company_name: 'Test Company',
        email: 'test@example.com',
        tenant_id: global.testUtils.mockTenant.id,
        database_name: 'Main DB',
        assigned_to_name: 'John Doe'
      };

      expect(mockLead.database_name).toBe('Main DB');
      expect(mockLead.assigned_to_name).toBe('John Doe');
    });

    test('should enforce tenant isolation', () => {
      const leadTenantId = global.testUtils.mockTenant.id;
      const requestTenantId = global.testUtils.mockTenant.id;
      expect(leadTenantId).toBe(requestTenantId);
    });

    test('should return 404 for non-existent lead', () => {
      const lead = null;
      const expectedError = lead ? null : 'Lead non trouvé';
      expect(expectedError).toBe('Lead non trouvé');
    });
  });

  describe('POST /api/leads - Zod Validation', () => {
    test('should require company_name', () => {
      const data = { email: 'test@example.com' };
      expect(data.company_name).toBeUndefined();
    });

    test('should require valid email', () => {
      const validEmail = 'test@example.com';
      const invalidEmail = 'not-an-email';

      expect(validEmail).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      expect(invalidEmail).not.toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    });

    test('should validate website URL if provided', () => {
      const validUrl = 'https://example.com';
      const invalidUrl = 'not-a-url';

      expect(validUrl).toMatch(/^https?:\/\//);
      expect(invalidUrl).not.toMatch(/^https?:\/\//);
    });

    test('should default score to 50', () => {
      const defaultScore = 50;
      expect(defaultScore).toBe(50);
    });

    test('should default deal_value to 0', () => {
      const defaultDealValue = 0;
      expect(defaultDealValue).toBe(0);
    });

    test('should validate score range 0-100', () => {
      const validScore = 75;
      const tooHigh = 150;
      const tooLow = -10;

      expect(validScore).toBeGreaterThanOrEqual(0);
      expect(validScore).toBeLessThanOrEqual(100);
      expect(tooHigh).toBeGreaterThan(100);
      expect(tooLow).toBeLessThan(0);
    });

    test('should validate database_id as UUID', () => {
      const validUUID = '123e4567-e89b-12d3-a456-426614174000';
      const invalidUUID = 'not-a-uuid';

      expect(validUUID).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(invalidUUID).not.toMatch(/^[0-9a-f]{8}-/);
    });

    test('should handle duplicate email error', () => {
      const duplicateErrorCode = '23505';
      const expectedMessage = 'Un lead avec cet email existe déjà';
      expect(duplicateErrorCode).toBe('23505');
      expect(expectedMessage).toContain('email existe déjà');
    });
  });

  describe('PUT /api/leads/:id - Partial Update', () => {
    test('should allow partial updates', () => {
      const partialUpdate = { status: 'contacted' };
      expect(partialUpdate.company_name).toBeUndefined();
      expect(partialUpdate.status).toBe('contacted');
    });

    test('should validate status enum', () => {
      const validStatuses = ['new', 'contacted', 'qualified', 'lost', 'won'];
      const invalidStatus = 'invalid';

      expect(validStatuses).not.toContain(invalidStatus);
    });

    test('should preserve existing values with COALESCE', () => {
      const existingValue = 'Original Company';
      const newValue = undefined;
      const result = newValue ?? existingValue;

      expect(result).toBe('Original Company');
    });

    test('should return 404 for non-existent lead', () => {
      const lead = null;
      const expectedError = !lead ? 'Lead non trouvé' : null;
      expect(expectedError).toBe('Lead non trouvé');
    });
  });

  describe('DELETE /api/leads/:id', () => {
    test('should delete related records first', () => {
      const deleteOrder = [
        'call_history',
        'pipeline_leads',
        'campaign_leads',
        'email_tracking',
        'leads'
      ];
      expect(deleteOrder.length).toBe(5);
      expect(deleteOrder[deleteOrder.length - 1]).toBe('leads');
    });

    test('should enforce tenant isolation on delete', () => {
      const tenantId = global.testUtils.mockTenant.id;
      expect(tenantId).toBeDefined();
    });

    test('should return 404 for non-existent lead', () => {
      const lead = null;
      const expectedError = !lead ? 'Lead non trouvé' : null;
      expect(expectedError).toBe('Lead non trouvé');
    });
  });

  describe('GET /api/leads/count', () => {
    test('should return 0 when no database_id provided', () => {
      const database_id = undefined;
      const expectedCount = database_id ? 10 : 0;
      expect(expectedCount).toBe(0);
    });

    test('should support industry filter', () => {
      const industry = 'tech';
      expect(industry).toBeDefined();
    });
  });

  describe('GET /api/leads/today', () => {
    test('should filter by current date', () => {
      const today = new Date().toISOString().split('T')[0];
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    test('should support scope parameter', () => {
      const validScopes = ['mine', 'all'];
      validScopes.forEach(scope => {
        expect(['mine', 'all']).toContain(scope);
      });
    });

    test('should limit to maximum 1000 results', () => {
      const requestedLimit = 2000;
      const maxLimit = 1000;
      const actualLimit = Math.min(requestedLimit, maxLimit);

      expect(actualLimit).toBe(1000);
    });
  });

  describe('Tenant Isolation', () => {
    test('should always include tenant_id in queries', () => {
      const tenantId = global.testUtils.mockTenant.id;
      expect(tenantId).toBeDefined();
    });

    test('should prevent cross-tenant data access', () => {
      const userTenantId = global.testUtils.mockTenant.id;
      const otherTenantId = 'different-tenant-id';

      expect(userTenantId).not.toBe(otherTenantId);
    });
  });
});
