import { jest } from '@jest/globals';

// Mock bcrypt before importing handler
jest.unstable_mockModule('bcryptjs', () => ({
  default: {
    compare: jest.fn()
  }
}));

// Mock jwt
jest.unstable_mockModule('jsonwebtoken', () => ({
  default: {
    sign: jest.fn(() => 'mock-jwt-token')
  }
}));

describe('POST /api/auth/login', () => {
  let handler;
  let db;
  let bcrypt;

  beforeEach(async () => {
    // Dynamic imports for ES modules
    db = (await import('../../config/db.js')).default;
    bcrypt = (await import('bcryptjs')).default;
    handler = (await import('../../api/auth/login.js')).default;
  });

  const mockReq = (body = {}, method = 'POST') => ({
    method,
    body,
    headers: {}
  });

  const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  test('should return 405 for non-POST requests', async () => {
    const req = mockReq({}, 'GET');
    const res = mockRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  test('should return 400 if email is missing', async () => {
    const req = mockReq({ password: 'test123' });
    const res = mockRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('should return 400 if password is missing', async () => {
    const req = mockReq({ email: 'test@example.com' });
    const res = mockRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('should return 400 for invalid email format', async () => {
    const req = mockReq({ email: 'invalid-email', password: 'test123' });
    const res = mockRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('should return 401 if user not found', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const req = mockReq({ email: 'notfound@example.com', password: 'test123' });
    const res = mockRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Identifiants incorrects' });
  });

  test('should return 401 if account is disabled', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{
        ...global.testUtils.mockUser,
        is_active: false
      }]
    });

    const req = mockReq({ email: 'test@example.com', password: 'test123' });
    const res = mockRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Compte désactivé' });
  });

  test('should return 401 if password is incorrect', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{
        ...global.testUtils.mockUser,
        password_hash: 'hashed_password'
      }]
    });
    bcrypt.compare.mockResolvedValueOnce(false);

    const req = mockReq({ email: 'test@example.com', password: 'wrong_password' });
    const res = mockRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Identifiants incorrects' });
  });

  test('should return token and user on successful login', async () => {
    const mockUser = {
      ...global.testUtils.mockUser,
      password_hash: 'hashed_password',
      tenant_name: 'Test Company'
    };

    db.query
      .mockResolvedValueOnce({ rows: [mockUser] }) // Find user
      .mockResolvedValueOnce({ rows: [] }); // Update last_login

    bcrypt.compare.mockResolvedValueOnce(true);

    const req = mockReq({ email: 'test@example.com', password: 'correct_password' });
    const res = mockRes();

    await handler(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      token: 'mock-jwt-token',
      user: expect.objectContaining({
        email: 'test@example.com'
      })
    }));
  });
});
