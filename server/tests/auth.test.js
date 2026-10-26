/**
 * auth.test.js — Backend authentication and session tests
 * Tests registration, login, session persistence, cookie security, and access control.
 * Connected strictly to isolated test database (resource_hub_test).
 */
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const { assertSafeDatabase, safeClearCollections } = require('./setup');

describe('Authentication & Session Suite', () => {
  beforeEach(async () => {
    assertSafeDatabase(mongoose.connection);
    await safeClearCollections();
  });

  afterAll(async () => {
    assertSafeDatabase(mongoose.connection);
    await safeClearCollections();
  });

  describe('1. User Registration', () => {
    test('A valid user can register successfully and auto-login', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'valid_user',
          email: 'valid@example.com',
          password: 'StrongPassword123',
          confirmPassword: 'StrongPassword123',
        });

      expect(res.status).toBe(201);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.username).toBe('valid_user');
      expect(res.body.user.email).toBe('valid@example.com');
      expect(res.body.user.role).toBe('user');
      // Passwords and hashes must NEVER be in response
      expect(res.body.user.passwordHash).toBeUndefined();
      expect(res.body.user.password).toBeUndefined();
      // Auto-login session cookie established
      expect(res.headers['set-cookie']).toBeDefined();
    });

    test('Missing required fields are rejected with 422', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: '',
          email: '',
          password: '',
          confirmPassword: '',
        });

      expect(res.status).toBe(422);
      expect(res.body.errors).toBeDefined();
      expect(res.body.errors.length).toBeGreaterThanOrEqual(3);
    });

    test('Invalid email addresses are rejected with 422', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'bademailuser',
          email: 'not-an-email',
          password: 'Password123',
          confirmPassword: 'Password123',
        });

      expect(res.status).toBe(422);
      expect(res.body.errors.some(e => e.field === 'email')).toBe(true);
    });

    test('Password confirmation mismatch is rejected with 422', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'mismatchuser',
          email: 'mismatch@example.com',
          password: 'Password123',
          confirmPassword: 'DifferentPassword123',
        });

      expect(res.status).toBe(422);
      expect(res.body.errors.some(e => e.field === 'confirmPassword')).toBe(true);
    });

    test('Weak passwords (< 8 characters) are rejected with 422', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'shortpassuser',
          email: 'short@example.com',
          password: '123',
          confirmPassword: '123',
        });

      expect(res.status).toBe(422);
      expect(res.body.errors.some(e => e.field === 'password')).toBe(true);
    });

    test('Duplicate email registration is rejected with 409 Conflict', async () => {
      // First registration
      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'user_one',
          email: 'duplicate@example.com',
          password: 'Password123',
          confirmPassword: 'Password123',
        });

      // Second registration with same email
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'user_two',
          email: 'DUPLICATE@example.com', // Case insensitive test
          password: 'Password123',
          confirmPassword: 'Password123',
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/already exists/i);
    });

    test('Passwords are encrypted/hashed with bcrypt and never plain text in MongoDB', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'hashuser',
          email: 'hash@example.com',
          password: 'SecretPlainPassword999',
          confirmPassword: 'SecretPlainPassword999',
        });

      const dbUser = await User.findOne({ email: 'hash@example.com' }).select('+passwordHash');
      expect(dbUser).toBeTruthy();
      expect(dbUser.passwordHash).not.toBe('SecretPlainPassword999');
      // bcrypt hashes start with $2a$ or $2b$
      expect(dbUser.passwordHash).toMatch(/^\$2[ab]\$\d+\$/);
    });
  });

  describe('2. User Login', () => {
    beforeEach(async () => {
      // Seed a test user
      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'login_tester',
          email: 'tester@example.com',
          password: 'CorrectPassword123',
          confirmPassword: 'CorrectPassword123',
        });
    });

    test('Correct credentials allow login and establish session', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'tester@example.com',
          password: 'CorrectPassword123',
        });

      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('tester@example.com');
      expect(res.body.user.passwordHash).toBeUndefined();
      expect(res.headers['set-cookie']).toBeDefined();
    });

    test('Incorrect password is rejected with 401', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'tester@example.com',
          password: 'WrongPassword456',
        });

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/invalid email or password/i);
    });

    test('Unknown email is rejected with 401', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'CorrectPassword123',
        });

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/invalid email or password/i);
    });

    test('Malformed login request (invalid email format) is rejected with 422', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'not-an-email',
          password: 'SomePassword',
        });

      expect(res.status).toBe(422);
      expect(res.body.errors).toBeDefined();
    });
  });

  describe('3. Sessions & Cookie Security', () => {
    test('Session cookie has HttpOnly and SameSite=Lax attributes', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'cookie_user',
          email: 'cookie@example.com',
          password: 'Password123',
          confirmPassword: 'Password123',
        });

      const setCookie = res.headers['set-cookie'];
      expect(setCookie).toBeDefined();
      const cookieStr = Array.isArray(setCookie) ? setCookie[0] : setCookie;
      expect(cookieStr).toMatch(/resource_hub\.sid=/);
      expect(cookieStr.toLowerCase()).toMatch(/httponly/);
      expect(cookieStr.toLowerCase()).toMatch(/samesite=lax/);
    });

    test('Session record is stored in MongoDB sessions collection', async () => {
      const agent = request.agent(app);
      await agent
        .post('/api/auth/register')
        .send({
          username: 'mongo_session_user',
          email: 'session@example.com',
          password: 'Password123',
          confirmPassword: 'Password123',
        });

      const sessionCollection = mongoose.connection.collection('sessions');
      const sessionCount = await sessionCollection.countDocuments();
      expect(sessionCount).toBeGreaterThan(0);
    });

    test('GET /api/auth/me restores authenticated user and session survives multiple requests', async () => {
      const agent = request.agent(app);
      await agent
        .post('/api/auth/register')
        .send({
          username: 'persist_user',
          email: 'persist@example.com',
          password: 'Password123',
          confirmPassword: 'Password123',
        });

      // 1st request with session
      const meRes1 = await agent.get('/api/auth/me');
      expect(meRes1.status).toBe(200);
      expect(meRes1.body.user.username).toBe('persist_user');

      // 2nd request with same session
      const meRes2 = await agent.get('/api/auth/me');
      expect(meRes2.status).toBe(200);
      expect(meRes2.body.user.username).toBe('persist_user');
    });

    test('Unauthenticated request to GET /api/auth/me returns 401', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    test('Logout destroys session in MongoDB and invalidates subsequent requests', async () => {
      const agent = request.agent(app);
      await agent
        .post('/api/auth/register')
        .send({
          username: 'logout_user',
          email: 'logout@example.com',
          password: 'Password123',
          confirmPassword: 'Password123',
        });

      // Confirm logged in
      const meBefore = await agent.get('/api/auth/me');
      expect(meBefore.status).toBe(200);

      // Perform logout
      const logoutRes = await agent.post('/api/auth/logout');
      expect(logoutRes.status).toBe(200);

      // Subsequent authenticated check must fail with 401
      const meAfter = await agent.get('/api/auth/me');
      expect(meAfter.status).toBe(401);
    });

    test('Invalid or forged session cookie is rejected with 401', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', ['resource_hub.sid=s%3Aforged_invalid_session_id.somefakehash']);

      expect(res.status).toBe(401);
    });
  });

  describe('4. Rate Limiting Headers', () => {
    test('Login endpoint returns standard rate-limit headers', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'rate@example.com', password: 'Password123' });

      // express-rate-limit standard headers
      expect(
        res.headers['ratelimit-limit'] || res.headers['x-ratelimit-limit']
      ).toBeDefined();
    });
  });
});
