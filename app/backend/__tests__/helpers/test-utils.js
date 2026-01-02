/**
 * Test Application Factory
 *
 * Crée une instance Express pour les tests d'intégration
 * sans démarrer le serveur ni vérifier les variables d'environnement
 */
import express from 'express';
import cors from 'cors';

/**
 * Crée une application Express minimale pour les tests
 * @param {Object} options - Options de configuration
 * @param {Object} options.mocks - Mocks pour les dépendances (db, auth, etc.)
 * @returns {express.Application}
 */
export function createTestApp(options = {}) {
  const app = express();

  // Middlewares de base
  app.use(express.json());
  app.use(cors());

  return app;
}

/**
 * Helper pour créer un mock de la base de données
 */
export function createMockDb() {
  return {
    query: jest.fn().mockResolvedValue({ rows: [] }),
    queryOne: jest.fn().mockResolvedValue(null),
    queryAll: jest.fn().mockResolvedValue([]),
    execute: jest.fn().mockResolvedValue(null),
    pool: {
      query: jest.fn().mockResolvedValue({ rows: [] }),
      connect: jest.fn().mockResolvedValue({
        query: jest.fn().mockResolvedValue({ rows: [] }),
        release: jest.fn()
      })
    }
  };
}

/**
 * Helper pour créer un utilisateur de test authentifié
 */
export function createTestUser(overrides = {}) {
  return {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
    role: 'admin',
    tenant_id: '123e4567-e89b-12d3-a456-426614174001',
    is_active: true,
    is_super_admin: false,
    ...overrides
  };
}

/**
 * Helper pour créer un token JWT de test
 */
export function createTestToken(user = null) {
  const jwt = await import('jsonwebtoken');
  const testUser = user || createTestUser();
  return jwt.default.sign(
    { userId: testUser.id, tenantId: testUser.tenant_id, role: testUser.role },
    process.env.JWT_SECRET || 'test-secret-key-for-testing-only-32chars',
    { expiresIn: '1h' }
  );
}

/**
 * Helper pour créer un mock de lead
 */
export function createTestLead(overrides = {}) {
  return {
    id: '123e4567-e89b-12d3-a456-426614174002',
    tenant_id: '123e4567-e89b-12d3-a456-426614174001',
    company_name: 'Test Company',
    email: 'lead@example.com',
    phone: '+33612345678',
    status: 'new',
    score: 50,
    sector: 'technology',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  };
}

/**
 * Helper pour créer un mock de campagne
 */
export function createTestCampaign(overrides = {}) {
  return {
    id: '123e4567-e89b-12d3-a456-426614174003',
    tenant_id: '123e4567-e89b-12d3-a456-426614174001',
    name: 'Test Campaign',
    type: 'email',
    status: 'draft',
    created_by: '123e4567-e89b-12d3-a456-426614174000',
    created_at: new Date().toISOString(),
    ...overrides
  };
}

export default {
  createTestApp,
  createMockDb,
  createTestUser,
  createTestToken,
  createTestLead,
  createTestCampaign
};
