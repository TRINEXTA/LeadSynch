// Test setup file
// This file runs before all tests

import { jest } from '@jest/globals';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-testing-only-32chars';
process.env.POSTGRES_URL = 'postgresql://test:test@localhost:5432/test';
process.env.ELASTIC_EMAIL_API_KEY = 'test-api-key';
process.env.EMAIL_FROM = 'test@example.com';

// Increase timeout for integration tests
jest.setTimeout(10000);

// Global test utilities
global.testUtils = {
  mockUser: {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
    role: 'admin',
    tenant_id: '123e4567-e89b-12d3-a456-426614174001',
    is_active: true,
    is_super_admin: false
  },
  mockTenant: {
    id: '123e4567-e89b-12d3-a456-426614174001',
    name: 'Test Tenant'
  },
  createMockDb: () => ({
    query: jest.fn().mockResolvedValue({ rows: [] }),
    queryOne: jest.fn().mockResolvedValue(null),
    queryAll: jest.fn().mockResolvedValue([]),
    execute: jest.fn().mockResolvedValue(null)
  }),
  createTestLead: (overrides = {}) => ({
    id: '123e4567-e89b-12d3-a456-426614174002',
    tenant_id: '123e4567-e89b-12d3-a456-426614174001',
    company_name: 'Test Company',
    email: 'lead@example.com',
    phone: '+33612345678',
    status: 'new',
    score: 50,
    created_at: new Date().toISOString(),
    ...overrides
  }),
  createTestCampaign: (overrides = {}) => ({
    id: '123e4567-e89b-12d3-a456-426614174003',
    tenant_id: '123e4567-e89b-12d3-a456-426614174001',
    name: 'Test Campaign',
    type: 'email',
    status: 'draft',
    created_by: '123e4567-e89b-12d3-a456-426614174000',
    ...overrides
  })
};
