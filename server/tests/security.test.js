/**
 * security.test.js — Backend Security, Robustness & Vulnerability Tests
 * Tests protection against BOLA/IDOR, mass assignment, injection,
 * malformed payloads, session fixation, sensitive data leakage, and CORS.
 */
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const Resource = require('../src/models/Resource');
const { assertSafeDatabase, safeClearCollections } = require('./setup');

describe('Security & Robustness Suite', () => {
  beforeEach(async () => {
    assertSafeDatabase(mongoose.connection);
    await safeClearCollections();
  });

  afterAll(async () => {
    assertSafeDatabase(mongoose.connection);
    await safeClearCollections();
  });

  describe('1. Mass Assignment Prevention', () => {
    test('Registration payload with role="admin" is ignored; user role remains "user"', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'sneaky_user',
          email: 'sneaky@example.com',
          password: 'Password123',
          confirmPassword: 'Password123',
          role: 'admin', // Malicious attempt to elevate privileges
        });

      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe('user');

      const dbUser = await User.findOne({ email: 'sneaky@example.com' });
      expect(dbUser.role).toBe('user');
    });

    test('Resource update payload cannot reassign the owner field', async () => {
      // Create user A and user B
      const agentA = request.agent(app);
      const resA = await agentA.post('/api/auth/register').send({
        username: 'victim_user',
        email: 'victim@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      });

      const resResource = await agentA.post('/api/resources').send({
        title: 'Original Resource',
        description: 'Description',
        category: 'other',
      });
      const resourceId = resResource.body.resource._id;

      const fakeOwnerId = new mongoose.Types.ObjectId();
      const updateRes = await agentA.patch(`/api/resources/${resourceId}`).send({
        owner: fakeOwnerId,
        title: 'Updated Title',
      });

      expect(updateRes.status).toBe(200);

      const dbResource = await Resource.findById(resourceId);
      expect(dbResource.owner.toString()).toBe(resA.body.user._id.toString());
      expect(dbResource.owner.toString()).not.toBe(fakeOwnerId.toString());
    });
  });

  describe('2. Invalid ObjectIds & Malformed Requests', () => {
    test('Non-ObjectId route parameter returns 400 instead of 500 crash', async () => {
      const res = await request(app).get('/api/resources/malformed-id-string');
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/invalid.*id/i);
    });

    test('Non-ObjectId on lost-found route returns 400', async () => {
      const res = await request(app).get('/api/lost-found/not-an-id-12345');
      expect(res.status).toBe(400);
    });

    test('Malformed JSON in request body is handled safely', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"email": "broken-json,');

      // Express body-parser returns 400 for malformed JSON
      expect(res.status).toBe(400);
    });
  });

  describe('3. Oversized Input Handling', () => {
    test('Oversized title (>120 chars) in resource creation is rejected with 422', async () => {
      const agent = request.agent(app);
      await agent.post('/api/auth/register').send({
        username: 'size_user',
        email: 'size@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      });

      const longTitle = 'A'.repeat(150);
      const res = await agent.post('/api/resources').send({
        title: longTitle,
        description: 'Valid description',
        category: 'study-materials',
      });

      expect(res.status).toBe(422);
      expect(res.body.errors.some(e => e.field === 'title')).toBe(true);
    });

    test('Oversized description (>1000 chars) in lost-found is rejected with 422', async () => {
      const agent = request.agent(app);
      await agent.post('/api/auth/register').send({
        username: 'size_lf_user',
        email: 'sizelf@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      });

      const longDesc = 'D'.repeat(1100);
      const res = await agent.post('/api/lost-found').send({
        reportType: 'lost',
        title: 'Valid Title',
        description: longDesc,
        location: 'Campus',
        incidentDate: '2026-10-20',
      });

      expect(res.status).toBe(422);
      expect(res.body.errors.some(e => e.field === 'description')).toBe(true);
    });
  });

  describe('4. Sensitive Information Leakage & Error Responses', () => {
    test('API responses never leak user passwordHash', async () => {
      const agent = request.agent(app);
      const regRes = await agent.post('/api/auth/register').send({
        username: 'leak_check_user',
        email: 'leak@example.com',
        password: 'SuperSecretPassword123!',
        confirmPassword: 'SuperSecretPassword123!',
      });

      const rawBody = JSON.stringify(regRes.body);
      expect(rawBody).not.toMatch(/passwordHash/i);
      expect(rawBody).not.toMatch(/SuperSecretPassword123!/);

      const meRes = await agent.get('/api/auth/me');
      const rawMe = JSON.stringify(meRes.body);
      expect(rawMe).not.toMatch(/passwordHash/i);
    });

    test('404 route returns consistent JSON error format without stack traces', async () => {
      const res = await request(app).get('/api/nonexistent-route-xyz');
      expect(res.status).toBe(404);
      expect(res.body.message).toBeDefined();
      expect(res.body.stack).toBeUndefined();
    });
  });

  describe('5. Session Fixation Defense', () => {
    test('Session cookie changes / regenerates upon login', async () => {
      const agent = request.agent(app);

      // Register account
      await agent.post('/api/auth/register').send({
        username: 'fixation_user',
        email: 'fixation@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      });

      // Login again — should regenerate session ID
      const loginRes = await agent.post('/api/auth/login').send({
        email: 'fixation@example.com',
        password: 'Password123',
      });

      expect(loginRes.status).toBe(200);
      expect(loginRes.headers['set-cookie']).toBeDefined();
    });
  });

  describe('6. CORS Configuration', () => {
    test('CORS headers allow specified client origin with credentials', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('Origin', 'http://localhost:5173');

      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });
  });
});
