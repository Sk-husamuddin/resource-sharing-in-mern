/**
 * messages.test.js — Backend In-App Messaging & Privacy Tests
 * Tests message sending, retrieval, participant privacy, read status updates,
 * and recipient validation.
 */
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const Message = require('../src/models/Message');
const User = require('../src/models/User');
const { assertSafeDatabase, safeClearCollections } = require('./setup');

describe('Messages & Privacy Suite', () => {
  let userA, userB, userC;
  let agentA, agentB, agentC;

  beforeEach(async () => {
    assertSafeDatabase(mongoose.connection);
    await safeClearCollections();

    // User A
    agentA = request.agent(app);
    const resA = await agentA.post('/api/auth/register').send({
      username: 'msg_user_a',
      email: 'msga@example.com',
      password: 'Password123',
      confirmPassword: 'Password123',
    });
    userA = resA.body.user;

    // User B
    agentB = request.agent(app);
    const resB = await agentB.post('/api/auth/register').send({
      username: 'msg_user_b',
      email: 'msgb@example.com',
      password: 'Password123',
      confirmPassword: 'Password123',
    });
    userB = resB.body.user;

    // User C (unrelated third party)
    agentC = request.agent(app);
    const resC = await agentC.post('/api/auth/register').send({
      username: 'msg_user_c',
      email: 'msgc@example.com',
      password: 'Password123',
      confirmPassword: 'Password123',
    });
    userC = resC.body.user;
  });

  afterAll(async () => {
    assertSafeDatabase(mongoose.connection);
    await safeClearCollections();
  });

  describe('1. Sending Messages & Validation', () => {
    test('Authenticated user can send a message to another user', async () => {
      const res = await agentA.post('/api/messages').send({
        recipient: userB._id,
        content: 'Hi! Is the textbook still available for borrow?',
      });

      expect(res.status).toBe(201);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.content).toBe('Hi! Is the textbook still available for borrow?');
      expect(res.body.data.sender._id.toString()).toBe(userA._id.toString());
      expect(res.body.data.recipient._id.toString()).toBe(userB._id.toString());
      expect(res.body.data.isRead).toBe(false);

      // Verify persistence in MongoDB
      const dbMsg = await Message.findById(res.body.data._id);
      expect(dbMsg).toBeTruthy();
      expect(dbMsg.content).toBe('Hi! Is the textbook still available for borrow?');
    });

    test('Sending message to oneself is rejected with 400', async () => {
      const res = await agentA.post('/api/messages').send({
        recipient: userA._id,
        content: 'Note to self',
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/cannot message yourself/i);
    });

    test('Invalid recipient ObjectId format is rejected with 422/400', async () => {
      const res = await agentA.post('/api/messages').send({
        recipient: 'invalid-id-format',
        content: 'Hello',
      });

      expect([400, 422]).toContain(res.status);
    });

    test('Nonexistent recipient ObjectId returns 404', async () => {
      const fakeUserId = new mongoose.Types.ObjectId();
      const res = await agentA.post('/api/messages').send({
        recipient: fakeUserId,
        content: 'Hello ghost user',
      });

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/recipient not found/i);
    });

    test('Empty message content is rejected with 422', async () => {
      const res = await agentA.post('/api/messages').send({
        recipient: userB._id,
        content: '',
      });

      expect(res.status).toBe(422);
      expect(res.body.errors.some(e => e.field === 'content')).toBe(true);
    });

    test('Unauthenticated user cannot send messages (401)', async () => {
      const res = await request(app).post('/api/messages').send({
        recipient: userB._id,
        content: 'Unauthorized message',
      });

      expect(res.status).toBe(401);
    });
  });

  describe('2. Message Retrieval & Privacy Protection', () => {
    let messageDoc;

    beforeEach(async () => {
      const res = await agentA.post('/api/messages').send({
        recipient: userB._id,
        content: 'Private message between A and B',
      });
      messageDoc = res.body.data;
    });

    test('Sender (User A) can see the message in their conversation history', async () => {
      const res = await agentA.get('/api/messages');
      expect(res.status).toBe(200);
      expect(res.body.messages.some(m => m._id === messageDoc._id)).toBe(true);
    });

    test('Recipient (User B) can see the message in their inbox', async () => {
      const res = await agentB.get('/api/messages');
      expect(res.status).toBe(200);
      expect(res.body.messages.some(m => m._id === messageDoc._id)).toBe(true);
    });

    test('Unrelated user (User C) CANNOT see the message between User A and User B', async () => {
      const res = await agentC.get('/api/messages');
      expect(res.status).toBe(200);
      expect(res.body.messages.some(m => m._id === messageDoc._id)).toBe(false);
    });
  });

  describe('3. Message Read Status', () => {
    let messageDoc;

    beforeEach(async () => {
      const res = await agentA.post('/api/messages').send({
        recipient: userB._id,
        content: 'Check read status message',
      });
      messageDoc = res.body.data;
    });

    test('Recipient (User B) can mark incoming message as read', async () => {
      const res = await agentB.patch(`/api/messages/${messageDoc._id}/read`);
      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/marked as read/i);

      // Verify in DB
      const dbMsg = await Message.findById(messageDoc._id);
      expect(dbMsg.isRead).toBe(true);
    });

    test('Sender (User A) cannot mark their own outgoing message as read (403)', async () => {
      const res = await agentA.patch(`/api/messages/${messageDoc._id}/read`);
      expect(res.status).toBe(403);
    });

    test('Unrelated user (User C) cannot mark message as read (403)', async () => {
      const res = await agentC.patch(`/api/messages/${messageDoc._id}/read`);
      expect(res.status).toBe(403);
    });

    test('Marking non-existent message returns 404', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await agentB.patch(`/api/messages/${fakeId}/read`);
      expect(res.status).toBe(404);
    });
  });
});
