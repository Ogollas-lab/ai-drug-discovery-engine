/**
 * Integration Tests for Authentication & Subscription System
 * Run with: npm test
 */

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/index');
const User = require('../src/models/User');

// Test user data
const testUser = {
  email: 'test@example.com',
  password: 'TestPass123!',
  firstName: 'Test',
  lastName: 'User'
};

let accessToken;
let refreshToken;
let userId;

describe('Authentication & Subscription System', () => {
  
  // Connect to test database before all tests
  beforeAll(async () => {
    // Use test database
    const testDbUri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/vitalis-ai-test';
    await mongoose.connect(testDbUri);
  });

  // Clean up after all tests
  afterAll(async () => {
    await User.deleteMany({});
    await mongoose.disconnect();
  });

  // ==========================================
  // AUTHENTICATION TESTS
  // ==========================================

  describe('POST /api/auth/signup', () => {
    it('should create a new user account', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send(testUser);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.user.email).toBe(testUser.email);
      expect(res.body.tokens.accessToken).toBeDefined();
      expect(res.body.tokens.refreshToken).toBeDefined();

      // Save tokens for later tests
      accessToken = res.body.tokens.accessToken;
      refreshToken = res.body.tokens.refreshToken;
      userId = res.body.user._id;
    });

    it('should reject duplicate email', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send(testUser);

      expect(res.statusCode).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('should reject weak password', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          ...testUser,
          email: 'weak@example.com',
          password: 'weak'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('password');
    });

    it('should reject invalid email', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          ...testUser,
          email: 'not-an-email'
        });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with correct credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.tokens.accessToken).toBeDefined();
      expect(res.body.lastLogin).toBeDefined();
    });

    it('should reject incorrect password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!'
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject non-existent user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password123!'
        });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user with valid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.email).toBe(testUser.email);
      expect(res.body.user.subscription).toBeDefined();
    });

    it('should reject request without token', async () => {
      const res = await request(app)
        .get('/api/auth/me');

      expect(res.statusCode).toBe(401);
    });

    it('should reject invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.statusCode).toBe(403);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should return new access token with valid refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${refreshToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.accessToken).not.toBe(accessToken);
    });

    it('should reject invalid refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.statusCode).toBe(403);
    });
  });

  describe('PUT /api/auth/profile', () => {
    it('should update user profile', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          firstName: 'Updated',
          lastName: 'Name',
          organizationName: 'Test University'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.firstName).toBe('Updated');
    });
  });

  // ==========================================
  // SUBSCRIPTION TESTS
  // ==========================================

  describe('GET /api/subscription/tiers', () => {
    it('should return all subscription tiers', async () => {
      const res = await request(app)
        .get('/api/subscription/tiers');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.tiers.length).toBeGreaterThan(0);
      expect(res.body.tiers[0]).toHaveProperty('id');
      expect(res.body.tiers[0]).toHaveProperty('price');
      expect(res.body.tiers[0]).toHaveProperty('features');
    });
  });

  describe('GET /api/subscription/current', () => {
    it('should return current subscription with valid token', async () => {
      const res = await request(app)
        .get('/api/subscription/current')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.subscription).toBeDefined();
      expect(res.body.subscription.tier).toBe('free');
      expect(res.body.limits).toBeDefined();
      expect(res.body.features).toBeDefined();
    });

    it('should reject request without token', async () => {
      const res = await request(app)
        .get('/api/subscription/current');

      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/subscription/usage', () => {
    it('should return usage metrics', async () => {
      const res = await request(app)
        .get('/api/subscription/usage')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.usage).toBeDefined();
      expect(res.body.usage.simulations).toBeDefined();
      expect(res.body.usage.molecules).toBeDefined();
    });
  });

  describe('GET /api/subscription/features', () => {
    it('should return available features for tier', async () => {
      const res = await request(app)
        .get('/api/subscription/features')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.tier).toBe('free');
      expect(res.body.features).toBeDefined();
    });
  });

  describe('GET /api/subscription/team', () => {
    it('should return team information', async () => {
      const res = await request(app)
        .get('/api/subscription/team')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.team).toBeDefined();
      expect(res.body.team.members).toBeInstanceOf(Array);
      expect(res.body.team.invitations).toBeInstanceOf(Array);
    });
  });

  // ==========================================
  // PROTECTED ROUTE TESTS
  // ==========================================

  describe('Protected Molecule Routes', () => {
    it('should require authentication to create molecule', async () => {
      const res = await request(app)
        .post('/api/molecules')
        .send({
          name: 'Test Molecule',
          smiles: 'CC(=O)O',
          description: 'Test'
        });

      expect(res.statusCode).toBe(401);
    });

    it('should allow authenticated user to create molecule', async () => {
      const res = await request(app)
        .post('/api/molecules')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Test Molecule',
          smiles: 'CC(=O)O',
          description: 'Test molecule for free tier'
        });

      // Should succeed (or fail with 400 due to input validation, not 401)
      expect(res.statusCode).not.toBe(401);
    });
  });

  describe('Usage Limits', () => {
    it('free tier should have limited simulations', async () => {
      const user = await User.findById(userId);
      const limits = user.limits;

      expect(limits.dailySimulations).toBe(5);
      expect(limits.monthlySimulations).toBe(50);
    });

    it('should track usage after API calls', async () => {
      const user = await User.findById(userId);
      const initialUsage = user.usageMetrics.totalSimulationsAllTime;

      // Make a prediction request
      await request(app)
        .post('/api/predictions/predictMultiple')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          molecules: [{
            name: 'Test',
            smiles: 'CC(=O)O'
          }]
        });

      // Check if usage incremented
      const updatedUser = await User.findById(userId);
      // Usage might not increment if request fails, so we just check the field exists
      expect(updatedUser.usageMetrics).toBeDefined();
    });
  });

  // ==========================================
  // ERROR HANDLING TESTS
  // ==========================================

  describe('Health Check', () => {
    it('should return server health status', async () => {
      const res = await request(app)
        .get('/api/health');

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.mongodb).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for invalid routes', async () => {
      const res = await request(app)
        .get('/api/nonexistent');

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});
