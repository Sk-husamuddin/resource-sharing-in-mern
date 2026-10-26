/**
 * resources.test.js — Backend Resources CRUD & Authorization Tests
 * Tests resource creation, retrieval, filtering, updating, deletion,
 * data persistence, and ownership enforcement.
 */
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const Resource = require('../src/models/Resource');
const User = require('../src/models/User');
const { assertSafeDatabase, safeClearCollections } = require('./setup');

describe('Resources CRUD & Authorization Suite', () => {
  let userA, userB, adminUser;
  let agentA, agentB, agentAdmin;

  beforeEach(async () => {
    assertSafeDatabase(mongoose.connection);
    await safeClearCollections();

    // Register User A
    agentA = request.agent(app);
    const resA = await agentA.post('/api/auth/register').send({
      username: 'user_a',
      email: 'usera@example.com',
      password: 'Password123',
      confirmPassword: 'Password123',
    });
    userA = resA.body.user;

    // Register User B
    agentB = request.agent(app);
    const resB = await agentB.post('/api/auth/register').send({
      username: 'user_b',
      email: 'userb@example.com',
      password: 'Password123',
      confirmPassword: 'Password123',
    });
    userB = resB.body.user;

    // Register & Promote Admin
    agentAdmin = request.agent(app);
    const resAdmin = await agentAdmin.post('/api/auth/register').send({
      username: 'admin_user',
      email: 'admin@example.com',
      password: 'Password123',
      confirmPassword: 'Password123',
    });
    await User.findByIdAndUpdate(resAdmin.body.user._id, { role: 'admin' });
    // Re-login as admin to update session role
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

  describe('1. Resource Creation', () => {
    test('Authenticated user can create a resource with valid data', async () => {
      const res = await agentA.post('/api/resources').send({
        title: 'Algorithms Textbook',
        description: 'Comprehensive guide to algorithms and data structures.',
        category: 'books-notes',
        location: 'Library 3rd floor',
        availabilityDetails: 'Mon-Fri 9am-5pm',
        status: 'available',
      });

      expect(res.status).toBe(201);
      expect(res.body.resource).toBeDefined();
      expect(res.body.resource.title).toBe('Algorithms Textbook');
      expect(res.body.resource.category).toBe('books-notes');
      expect(res.body.resource.owner._id.toString()).toBe(userA._id.toString());

      // Verify persistence in MongoDB
      const dbResource = await Resource.findById(res.body.resource._id);
      expect(dbResource).toBeTruthy();
      expect(dbResource.title).toBe('Algorithms Textbook');
    });

    test('Missing required fields are rejected with 422', async () => {
      const res = await agentA.post('/api/resources').send({
        // Missing title, description, category
        location: 'Campus Center',
      });

      expect(res.status).toBe(422);
      expect(res.body.errors).toBeDefined();
      expect(res.body.errors.some(e => e.field === 'title')).toBe(true);
      expect(res.body.errors.some(e => e.field === 'description')).toBe(true);
      expect(res.body.errors.some(e => e.field === 'category')).toBe(true);
    });

    test('Invalid category is rejected with 422', async () => {
      const res = await agentA.post('/api/resources').send({
        title: 'Valid Title',
        description: 'Valid Description',
        category: 'invalid-category-name',
      });

      expect(res.status).toBe(422);
      expect(res.body.errors.some(e => e.field === 'category')).toBe(true);
    });

    test('Unauthenticated user cannot create a resource (401)', async () => {
      const res = await request(app).post('/api/resources').send({
        title: 'Unauthenticated Resource',
        description: 'Should not be created',
        category: 'other',
      });

      expect(res.status).toBe(401);
    });
  });

  describe('2. Resource Retrieval & Filtering', () => {
    let createdResource;

    beforeEach(async () => {
      const res = await agentA.post('/api/resources').send({
        title: 'Physics Lab Multimeter',
        description: 'Fluke digital multimeter with test leads.',
        category: 'tools-equipment',
        location: 'Science Building Room 102',
        status: 'available',
      });
      createdResource = res.body.resource;

      // Create a second resource with different category and status
      await agentB.post('/api/resources').send({
        title: 'Chemistry Organic Notes',
        description: 'Handwritten organic chemistry reaction summaries.',
        category: 'study-materials',
        location: 'Library East Wing',
        status: 'borrowed',
      });
    });

    test('GET /api/resources returns all resources with pagination metadata', async () => {
      const res = await request(app).get('/api/resources');
      expect(res.status).toBe(200);
      expect(res.body.items).toBeDefined();
      expect(res.body.items.length).toBe(2);
      expect(res.body.total).toBe(2);
      expect(res.body.page).toBe(1);
    });

    test('GET /api/resources/:id returns single resource by valid ID', async () => {
      const res = await request(app).get(`/api/resources/${createdResource._id}`);
      expect(res.status).toBe(200);
      expect(res.body.resource).toBeDefined();
      expect(res.body.resource.title).toBe('Physics Lab Multimeter');
      expect(res.body.resource.owner.username).toBe('user_a');
    });

    test('GET /api/resources/:id with nonexistent ID returns 404', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/api/resources/${fakeId}`);
      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/not found/i);
    });

    test('GET /api/resources/:id with malformed ID returns 400', async () => {
      const res = await request(app).get('/api/resources/invalid-mongo-id');
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/invalid resource id/i);
    });

    test('Category filter returns only matching resources', async () => {
      const res = await request(app).get('/api/resources?category=tools-equipment');
      expect(res.status).toBe(200);
      expect(res.body.items.length).toBe(1);
      expect(res.body.items[0].title).toBe('Physics Lab Multimeter');
    });

    test('Status filter returns only matching availability status', async () => {
      const res = await request(app).get('/api/resources?status=borrowed');
      expect(res.status).toBe(200);
      expect(res.body.items.length).toBe(1);
      expect(res.body.items[0].title).toBe('Chemistry Organic Notes');
    });
  });

  describe('3. Resource Update & Forbidden Fields', () => {
    let resourceA;

    beforeEach(async () => {
      const res = await agentA.post('/api/resources').send({
        title: 'Original Title',
        description: 'Original Description',
        category: 'study-materials',
        status: 'available',
      });
      resourceA = res.body.resource;
    });

    test('Owner (User A) can update their resource details', async () => {
      const res = await agentA.patch(`/api/resources/${resourceA._id}`).send({
        description: 'Updated Description with more info',
        status: 'borrowed',
      });

      expect(res.status).toBe(200);
      expect(res.body.resource.description).toBe('Updated Description with more info');
      expect(res.body.resource.status).toBe('borrowed');

      // Verify persistence in fresh database query
      const freshDoc = await Resource.findById(resourceA._id);
      expect(freshDoc.description).toBe('Updated Description with more info');
      expect(freshDoc.status).toBe('borrowed');
    });

    test('Forbidden fields cannot be changed (e.g. attempting to change owner to User B)', async () => {
      const res = await agentA.patch(`/api/resources/${resourceA._id}`).send({
        owner: userB._id, // Attempt to reassign owner
        title: 'Title Attempt',
      });

      expect(res.status).toBe(200);
      // Owner must still be User A in database
      const freshDoc = await Resource.findById(resourceA._id);
      expect(freshDoc.owner.toString()).toBe(userA._id.toString());
    });

    test('User B CANNOT edit User A resource (403 Forbidden)', async () => {
      const res = await agentB.patch(`/api/resources/${resourceA._id}`).send({
        title: 'Hacked by User B',
      });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/not authorized/i);

      // Verify User A data remains unchanged
      const freshDoc = await Resource.findById(resourceA._id);
      expect(freshDoc.title).toBe('Original Title');
    });

    test('Admin CAN edit any resource', async () => {
      const res = await agentAdmin.patch(`/api/resources/${resourceA._id}`).send({
        title: 'Moderated Title by Admin',
      });

      expect(res.status).toBe(200);
      expect(res.body.resource.title).toBe('Moderated Title by Admin');
    });
  });

  describe('4. Resource Deletion & Authorization', () => {
    let resourceA;

    beforeEach(async () => {
      const res = await agentA.post('/api/resources').send({
        title: 'Resource To Delete',
        description: 'Will be deleted in tests',
        category: 'other',
      });
      resourceA = res.body.resource;
    });

    test('User B CANNOT delete User A resource (403 Forbidden)', async () => {
      const res = await agentB.delete(`/api/resources/${resourceA._id}`);
      expect(res.status).toBe(403);

      // Verify resource still exists
      const freshDoc = await Resource.findById(resourceA._id);
      expect(freshDoc).toBeTruthy();
    });

    test('Unauthenticated user cannot delete resource (401 Unauthorized)', async () => {
      const res = await request(app).delete(`/api/resources/${resourceA._id}`);
      expect(res.status).toBe(401);
    });

    test('Owner (User A) CAN delete their own resource', async () => {
      const res = await agentA.delete(`/api/resources/${resourceA._id}`);
      expect(res.status).toBe(200);

      // Verify deletion in database
      const freshDoc = await Resource.findById(resourceA._id);
      expect(freshDoc).toBeNull();
    });

    test('Admin CAN delete resource as moderator', async () => {
      // Create new resource as User A
      const createRes = await agentA.post('/api/resources').send({
        title: 'Resource for Admin Deletion',
        description: 'Desc',
        category: 'other',
      });

      const res = await agentAdmin.delete(`/api/resources/${createRes.body.resource._id}`);
      expect(res.status).toBe(200);

      const freshDoc = await Resource.findById(createRes.body.resource._id);
      expect(freshDoc).toBeNull();
    });
  });
});
