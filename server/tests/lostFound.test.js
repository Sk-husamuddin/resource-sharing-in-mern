/**
 * lostFound.test.js — Backend Lost & Found CRUD & Authorization Tests
 * Tests report creation, field validation, filters, updating, status changes,
 * deletion, and cross-user authorization.
 */
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const LostFoundItem = require('../src/models/LostFoundItem');
const User = require('../src/models/User');
const { assertSafeDatabase, safeClearCollections } = require('./setup');

describe('Lost & Found CRUD & Authorization Suite', () => {
  let userA, userB, adminUser;
  let agentA, agentB, agentAdmin;

  beforeEach(async () => {
    assertSafeDatabase(mongoose.connection);
    await safeClearCollections();

    // Register User A
    agentA = request.agent(app);
    const resA = await agentA.post('/api/auth/register').send({
      username: 'reporter_a',
      email: 'reportera@example.com',
      password: 'Password123',
      confirmPassword: 'Password123',
    });
    userA = resA.body.user;

    // Register User B
    agentB = request.agent(app);
    const resB = await agentB.post('/api/auth/register').send({
      username: 'reporter_b',
      email: 'reporterb@example.com',
      password: 'Password123',
      confirmPassword: 'Password123',
    });
    userB = resB.body.user;

    // Register & Promote Admin
    agentAdmin = request.agent(app);
    const resAdmin = await agentAdmin.post('/api/auth/register').send({
      username: 'admin_lf',
      email: 'adminlf@example.com',
      password: 'Password123',
      confirmPassword: 'Password123',
    });
    await User.findByIdAndUpdate(resAdmin.body.user._id, { role: 'admin' });
    await agentAdmin.post('/api/auth/login').send({
      email: 'adminlf@example.com',
      password: 'Password123',
    });
    const meRes = await agentAdmin.get('/api/auth/me');
    adminUser = meRes.body.user;
  });

  afterAll(async () => {
    assertSafeDatabase(mongoose.connection);
    await safeClearCollections();
  });

  describe('1. Report Creation & Validation', () => {
    test('Authenticated user can create a "lost" report with valid fields', async () => {
      const res = await agentA.post('/api/lost-found').send({
        reportType: 'lost',
        title: 'Blue Hydroflask Water Bottle',
        description: '32oz blue bottle with stickers near gym entrance.',
        location: 'Gymnasium Entrance',
        incidentDate: '2026-10-20',
        status: 'open',
      });

      expect(res.status).toBe(201);
      expect(res.body.item).toBeDefined();
      expect(res.body.item.reportType).toBe('lost');
      expect(res.body.item.title).toBe('Blue Hydroflask Water Bottle');
      expect(res.body.item.reporter._id.toString()).toBe(userA._id.toString());

      // Confirm in MongoDB
      const dbDoc = await LostFoundItem.findById(res.body.item._id);
      expect(dbDoc).toBeTruthy();
      expect(dbDoc.reportType).toBe('lost');
    });

    test('Authenticated user can create a "found" report with valid fields', async () => {
      const res = await agentA.post('/api/lost-found').send({
        reportType: 'found',
        title: 'Keys with Red Keychain',
        description: 'Set of 3 keys found on bench near library.',
        location: 'Library Bench #2',
        incidentDate: '2026-10-21',
        status: 'open',
      });

      expect(res.status).toBe(201);
      expect(res.body.item.reportType).toBe('found');
    });

    test('Invalid reportType is rejected with 422', async () => {
      const res = await agentA.post('/api/lost-found').send({
        reportType: 'stolen', // invalid
        title: 'Bicycle',
        description: 'Missing bike',
        location: 'Bike rack',
        incidentDate: '2026-10-21',
      });

      expect(res.status).toBe(422);
      expect(res.body.errors.some(e => e.field === 'reportType')).toBe(true);
    });

    test('Missing required fields (title, location, date) are rejected with 422', async () => {
      const res = await agentA.post('/api/lost-found').send({
        reportType: 'lost',
        // missing title, description, location, incidentDate
      });

      expect(res.status).toBe(422);
      expect(res.body.errors.length).toBeGreaterThanOrEqual(3);
    });

    test('Invalid incidentDate format is rejected with 422', async () => {
      const res = await agentA.post('/api/lost-found').send({
        reportType: 'lost',
        title: 'Title',
        description: 'Description',
        location: 'Campus',
        incidentDate: 'not-a-valid-date',
      });

      expect(res.status).toBe(422);
      expect(res.body.errors.some(e => e.field === 'incidentDate')).toBe(true);
    });

    test('Unauthenticated user cannot create reports (401)', async () => {
      const res = await request(app).post('/api/lost-found').send({
        reportType: 'lost',
        title: 'Secret item',
        description: 'Desc',
        location: 'Location',
        incidentDate: '2026-10-20',
      });

      expect(res.status).toBe(401);
    });
  });

  describe('2. Report Retrieval & Filtering', () => {
    let lostItem, foundItem;

    beforeEach(async () => {
      const resLost = await agentA.post('/api/lost-found').send({
        reportType: 'lost',
        title: 'Lost Calculator TI-84',
        description: 'Black graphic calculator left in math hall.',
        location: 'Hall B',
        incidentDate: '2026-10-15',
        status: 'open',
      });
      lostItem = resLost.body.item;

      const resFound = await agentB.post('/api/lost-found').send({
        reportType: 'found',
        title: 'Found Smartwatch',
        description: 'Black fitness tracker smartwatch.',
        location: 'Cafeteria',
        incidentDate: '2026-10-18',
        status: 'claimed',
      });
      foundItem = resFound.body.item;
    });

    test('GET /api/lost-found returns all items', async () => {
      const res = await request(app).get('/api/lost-found');
      expect(res.status).toBe(200);
      expect(res.body.items.length).toBe(2);
      expect(res.body.total).toBe(2);
    });

    test('Filter by reportType returns matching reports only', async () => {
      const res = await request(app).get('/api/lost-found?reportType=found');
      expect(res.status).toBe(200);
      expect(res.body.items.length).toBe(1);
      expect(res.body.items[0].title).toBe('Found Smartwatch');
    });

    test('Filter by status returns matching reports only', async () => {
      const res = await request(app).get('/api/lost-found?status=claimed');
      expect(res.status).toBe(200);
      expect(res.body.items.length).toBe(1);
      expect(res.body.items[0].status).toBe('claimed');
    });

    test('GET /api/lost-found/:id returns item with reporter details', async () => {
      const res = await request(app).get(`/api/lost-found/${lostItem._id}`);
      expect(res.status).toBe(200);
      expect(res.body.item.title).toBe('Lost Calculator TI-84');
      expect(res.body.item.reporter.username).toBe('reporter_a');
    });

    test('GET /api/lost-found/:id with malformed ID returns 400', async () => {
      const res = await request(app).get('/api/lost-found/not-a-valid-id');
      expect(res.status).toBe(400);
    });

    test('GET /api/lost-found/:id with nonexistent ID returns 404', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/api/lost-found/${fakeId}`);
      expect(res.status).toBe(404);
    });
  });

  describe('3. Report Updating & Status Transitions', () => {
    let reportA;

    beforeEach(async () => {
      const res = await agentA.post('/api/lost-found').send({
        reportType: 'lost',
        title: 'Original Lost Item',
        description: 'Original description',
        location: 'Old Location',
        incidentDate: '2026-10-19',
        status: 'open',
      });
      reportA = res.body.item;
    });

    test('Owner (User A) can update report details and status', async () => {
      const res = await agentA.patch(`/api/lost-found/${reportA._id}`).send({
        location: 'Updated Building 4',
        status: 'resolved',
      });

      expect(res.status).toBe(200);
      expect(res.body.item.location).toBe('Updated Building 4');
      expect(res.body.item.status).toBe('resolved');

      // Verify DB persistence
      const freshDoc = await LostFoundItem.findById(reportA._id);
      expect(freshDoc.location).toBe('Updated Building 4');
      expect(freshDoc.status).toBe('resolved');
    });

    test('User B CANNOT edit User A report (403 Forbidden)', async () => {
      const res = await agentB.patch(`/api/lost-found/${reportA._id}`).send({
        title: 'Unauthorized Modification',
      });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/not authorized/i);

      // Verify report was not changed
      const freshDoc = await LostFoundItem.findById(reportA._id);
      expect(freshDoc.title).toBe('Original Lost Item');
    });

    test('Admin CAN edit any report', async () => {
      const res = await agentAdmin.patch(`/api/lost-found/${reportA._id}`).send({
        description: 'Admin moderated note',
      });

      expect(res.status).toBe(200);
      expect(res.body.item.description).toBe('Admin moderated note');
    });
  });

  describe('4. Report Deletion & Ownership', () => {
    let reportA;

    beforeEach(async () => {
      const res = await agentA.post('/api/lost-found').send({
        reportType: 'found',
        title: 'Item to Delete',
        description: 'Desc',
        location: 'Location',
        incidentDate: '2026-10-20',
      });
      reportA = res.body.item;
    });

    test('User B CANNOT delete User A report (403 Forbidden)', async () => {
      const res = await agentB.delete(`/api/lost-found/${reportA._id}`);
      expect(res.status).toBe(403);

      const freshDoc = await LostFoundItem.findById(reportA._id);
      expect(freshDoc).toBeTruthy();
    });

    test('Owner (User A) CAN delete their own report', async () => {
      const res = await agentA.delete(`/api/lost-found/${reportA._id}`);
      expect(res.status).toBe(200);

      const freshDoc = await LostFoundItem.findById(reportA._id);
      expect(freshDoc).toBeNull();
    });

    test('Admin CAN delete report as moderator', async () => {
      const res = await agentAdmin.delete(`/api/lost-found/${reportA._id}`);
      expect(res.status).toBe(200);

      const freshDoc = await LostFoundItem.findById(reportA._id);
      expect(freshDoc).toBeNull();
    });
  });
});
