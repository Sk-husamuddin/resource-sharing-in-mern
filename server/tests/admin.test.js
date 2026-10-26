/**
 * admin.test.js — Backend Administration, Moderation & Role Tests
 * Tests admin statistics, user management, role changes, resource and lost/found
 * moderation, and access restriction for non-admin users.
 */
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const Resource = require('../src/models/Resource');
const LostFoundItem = require('../src/models/LostFoundItem');
const { assertSafeDatabase, safeClearCollections } = require('./setup');

describe('Admin Privileges & Moderation Suite', () => {
  let normalUser, adminUser;
  let agentNormal, agentAdmin;

  beforeEach(async () => {
    assertSafeDatabase(mongoose.connection);
    await safeClearCollections();

    // Normal User
    agentNormal = request.agent(app);
    const resNormal = await agentNormal.post('/api/auth/register').send({
      username: 'normal_user',
      email: 'normal@example.com',
      password: 'Password123',
      confirmPassword: 'Password123',
    });
    normalUser = resNormal.body.user;

    // Admin User
    agentAdmin = request.agent(app);
    const resAdmin = await agentAdmin.post('/api/auth/register').send({
      username: 'super_admin',
      email: 'admin@example.com',
      password: 'Password123',
      confirmPassword: 'Password123',
    });
    await User.findByIdAndUpdate(resAdmin.body.user._id, { role: 'admin' });
    // Re-login to refresh session role
    await agentAdmin.post('/api/auth/login').send({
      email: 'admin@example.com',
      password: 'Password123',
    });
    const meRes = await agentAdmin.get('/api/auth/me');
    adminUser = meRes.body.user;
  });

  afterAll(async () => {
    assertSafeDatabase(mongoose.connection);
    await safeClearCollections();
  });

  describe('1. Access Control & Authorization Restrictions', () => {
    test('Unauthenticated user receives 401 on /api/admin/stats', async () => {
      const res = await request(app).get('/api/admin/stats');
      expect(res.status).toBe(401);
    });

    test('Normal user receives 403 Forbidden on /api/admin/stats', async () => {
      const res = await agentNormal.get('/api/admin/stats');
      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/administrator access required/i);
    });

    test('Normal user receives 403 Forbidden on /api/admin/users', async () => {
      const res = await agentNormal.get('/api/admin/users');
      expect(res.status).toBe(403);
    });

    test('Normal user receives 403 Forbidden when attempting to change user role', async () => {
      const res = await agentNormal.patch(`/api/admin/users/${normalUser._id}`).send({
        role: 'admin',
      });
      expect(res.status).toBe(403);

      // Verify role was not changed
      const dbUser = await User.findById(normalUser._id);
      expect(dbUser.role).toBe('user');
    });
  });

  describe('2. Admin Statistics & User Management', () => {
    test('Authorized admin can access platform statistics', async () => {
      const res = await agentAdmin.get('/api/admin/stats');
      expect(res.status).toBe(200);
      expect(res.body.userCount).toBeDefined();
      expect(res.body.resourceCount).toBeDefined();
      expect(res.body.lostFoundCount).toBeDefined();
      expect(res.body.pendingClaims).toBeDefined();
      expect(res.body.userCount).toBeGreaterThanOrEqual(2);
    });

    test('Authorized admin can list registered users without sensitive fields', async () => {
      const res = await agentAdmin.get('/api/admin/users');
      expect(res.status).toBe(200);
      expect(res.body.users).toBeDefined();
      expect(res.body.users.length).toBeGreaterThanOrEqual(2);

      // Sensitive fields must be excluded
      res.body.users.forEach((u) => {
        expect(u.passwordHash).toBeUndefined();
        expect(u.password).toBeUndefined();
        expect(u.phone).toBeUndefined();
      });
    });

    test('Authorized admin can update a user role', async () => {
      const res = await agentAdmin.patch(`/api/admin/users/${normalUser._id}`).send({
        role: 'admin',
      });

      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('admin');

      // Verify in DB
      const freshUser = await User.findById(normalUser._id);
      expect(freshUser.role).toBe('admin');
    });

    test('Updating user with invalid role value returns 400', async () => {
      const res = await agentAdmin.patch(`/api/admin/users/${normalUser._id}`).send({
        role: 'superpower_role',
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/role must be "user" or "admin"/i);
    });
  });

  describe('3. Admin Moderation Actions', () => {
    let testResource, testReport;

    beforeEach(async () => {
      // Create resource by normal user
      const resResource = await agentNormal.post('/api/resources').send({
        title: 'Spam / Inappropriate Resource',
        description: 'Should be moderated',
        category: 'other',
      });
      testResource = resResource.body.resource;

      // Create lost-found report by normal user
      const resReport = await agentNormal.post('/api/lost-found').send({
        reportType: 'lost',
        title: 'Spam / Fake Report',
        description: 'Should be moderated',
        location: 'Nowhere',
        incidentDate: '2026-10-20',
      });
      testReport = resReport.body.item;
    });

    test('Admin can delete inappropriate resource via moderation endpoint', async () => {
      const res = await agentAdmin.delete(`/api/admin/resources/${testResource._id}`);
      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/removed by admin/i);

      const dbDoc = await Resource.findById(testResource._id);
      expect(dbDoc).toBeNull();
    });

    test('Admin can delete inappropriate lost-found report via moderation endpoint', async () => {
      const res = await agentAdmin.delete(`/api/admin/lost-found/${testReport._id}`);
      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/removed by admin/i);

      const dbDoc = await LostFoundItem.findById(testReport._id);
      expect(dbDoc).toBeNull();
    });

    test('Non-admin cannot use moderation delete endpoints (403)', async () => {
      const res = await agentNormal.delete(`/api/admin/resources/${testResource._id}`);
      expect(res.status).toBe(403);

      const dbDoc = await Resource.findById(testResource._id);
      expect(dbDoc).toBeTruthy();
    });
  });
});
