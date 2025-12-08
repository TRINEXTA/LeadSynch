// Test setup file
// This file runs before all tests

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-testing-only-32chars';

// Mock database for tests
jest.mock('../config/db.js', () => ({
  default: {
    query: jest.fn()
  }
}));

// Global test utilities
global.testUtils = {
  mockUser: {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
    role: 'user',
    tenant_id: '123e4567-e89b-12d3-a456-426614174001',
    is_active: true,
    is_super_admin: false
  },
  mockTenant: {
    id: '123e4567-e89b-12d3-a456-426614174001',
    name: 'Test Tenant'
  }
};

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
});
