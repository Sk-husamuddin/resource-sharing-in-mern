/**
 * claims.test.js — Backend Claims Lifecycle, Privacy & Review Tests
 * Tests claim submission, validation, duplicate prevention, ownership privacy,
 * authorized review transitions, and withdrawal logic.
 */
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const Claim = require('../src/models/Claim');
const LostFoundItem = require('../src/models/LostFoundItem');
const User = require('../src/models/User');
const { assertSafeDatabase, safeClearCollections } = require('./setup');

describe('Claims Lifecycle & Privacy Suite', () => {
  let userFinder, userClaimant, userOther, adminUser;
  let agentFinder, agentClaimant, agentOther, agentAdmin;
  let foundItem;

  beforeEach(async () => {
    assertSafeDatabase(mongoose.connection);
    await safeClearCollections();

    // 1. Finder (reporter of found item)
    agentFinder = request.agent(app);
    const resFinder = await agentFinder.post('/api/auth/register').send({
      username: 'finder_user',
      email: 'finder@example.com',
      password: 'Password123',
      confirmPassword: 'Password123',
    });
    userFinder = resFinder.body.user;

    // 2. Claimant
    agentClaimant = request.agent(app);
    const resClaimant = await agentClaimant.post('/api/auth/register').send({
      username: 'claimant_user',
      email: 'claimant@example.com',
      password: 'Password123',
      confirmPassword: 'Password123',
    });
    userClaimant = resClaimant.body.user;

    // 3. Other normal user
    agentOther = request.agent(app);
    const resOther = await agentOther.post('/api/auth/register').send({
      username: 'other_user',
      email: 'other@example.com',
      password: 'Password123',
      confirmPassword: 'Password123',
    });
    userOther = resOther.body.user;

    // 4. Administrator
    agentAdmin = request.agent(app);
    const resAdmin = await agentAdmin.post('/api/auth/register').send({
      username: 'admin_claim_user',
      email: 'adminclaims@example.com',
      password: 'Password123',
      confirmPassword: 'Password123',
    });
    await User.findByIdAndUpdate(resAdmin.body.user._id, { role: 'admin' });
    await agentAdmin.post('/api/auth/login').send({
      email: 'adminclaims@example.com',
      password: 'Password123',
    });
    const meRes = await agentAdmin.get('/api/auth/me');
    adminUser = meRes.body.user;

    // Create a found item by Finder
    const itemRes = await agentFinder.post('/api/lost-found').send({
      reportType: 'found',
      title: 'Found Silver Apple AirPods Pro',
      description: 'Found on grass near student center.',
      location: 'Student Center Lawn',
      incidentDate: '2026-10-21',
      status: 'open',
    });
    foundItem = itemRes.body.item;
  });

  afterAll(async () => {
    assertSafeDatabase(mongoose.connection);
    await safeClearCollections();
  });

  describe('1. Claim Creation & Eligibility Constraints', () => {
    test('Eligible user can submit a claim for an open found item', async () => {
      const res = await agentClaimant.post('/api/claims').send({
        item: foundItem._id,
        verificationDetails: 'Case has a small Pikachu sticker on the bottom left corner.',
        preferredPickupTime: 'Tomorrow afternoon',
      });

      expect(res.status).toBe(201);
      expect(res.body.claim).toBeDefined();
      expect(res.body.claim.status).toBe('pending');
      expect(res.body.claim.claimant._id.toString()).toBe(userClaimant._id.toString());

      // Confirm in MongoDB
      const dbClaim = await Claim.findById(res.body.claim._id);
      expect(dbClaim).toBeTruthy();
      expect(dbClaim.status).toBe('pending');
    });

    test('Required verificationDetails is validated (cannot be empty)', async () => {
      const res = await agentClaimant.post('/api/claims').send({
        item: foundItem._id,
        verificationDetails: '', // empty
      });

      expect(res.status).toBe(422);
      expect(res.body.errors.some(e => e.field === 'verificationDetails')).toBe(true);
    });

    test('Finder cannot claim their own found report (400)', async () => {
      const res = await agentFinder.post('/api/claims').send({
        item: foundItem._id,
        verificationDetails: 'Self claim',
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/cannot claim your own/i);
    });

    test('Cannot claim a "lost" report (only "found" items are claimable)', async () => {
      const lostItemRes = await agentFinder.post('/api/lost-found').send({
        reportType: 'lost',
        title: 'Lost Backpack',
        description: 'Black backpack',
        location: 'Lab 1',
        incidentDate: '2026-10-20',
      });

      const res = await agentClaimant.post('/api/claims').send({
        item: lostItemRes.body.item._id,
        verificationDetails: 'My backpack',
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/only be made on "found" items/i);
    });

    test('Duplicate claim on same item by same user is rejected with 409 Conflict', async () => {
      // First claim
      await agentClaimant.post('/api/claims').send({
        item: foundItem._id,
        verificationDetails: 'First claim submission details',
      });

      // Second claim by same user
      const res = await agentClaimant.post('/api/claims').send({
        item: foundItem._id,
        verificationDetails: 'Second duplicate claim submission',
      });

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/already submitted a claim/i);
    });
  });

  describe('2. Privacy & Verification Details Protection', () => {
    let claimDoc;

    beforeEach(async () => {
      const res = await agentClaimant.post('/api/claims').send({
        item: foundItem._id,
        verificationDetails: 'CONFIDENTIAL_ENGRAVED_SERIAL_NUMBER_XYZ123',
        preferredPickupTime: '3pm',
      });
      claimDoc = res.body.claim;
    });

    test('Claimant can view their own claims via GET /api/claims', async () => {
      const res = await agentClaimant.get('/api/claims');
      expect(res.status).toBe(200);
      expect(res.body.claims.length).toBe(1);
      expect(res.body.claims[0]._id.toString()).toBe(claimDoc._id.toString());
    });

    test('Unrelated user (User Other) cannot see Claimant claims in GET /api/claims', async () => {
      const res = await agentOther.get('/api/claims');
      expect(res.status).toBe(200);
      expect(res.body.claims.length).toBe(0);
    });

    test('Public query does not expose private verification details (select: false)', async () => {
      // Direct Mongoose query without .select('+verificationDetails')
      const publicQuery = await Claim.findById(claimDoc._id);
      expect(publicQuery.verificationDetails).toBeUndefined();
    });

    test('Authorized admin can access claims including verification details for review', async () => {
      const res = await agentAdmin.get('/api/admin/claims');
      expect(res.status).toBe(200);
      expect(res.body.claims.length).toBe(1);
      expect(res.body.claims[0].verificationDetails).toBe('CONFIDENTIAL_ENGRAVED_SERIAL_NUMBER_XYZ123');
    });
  });

  describe('3. Claim Review, Approval & State Transitions', () => {
    let claimDoc;

    beforeEach(async () => {
      const res = await agentClaimant.post('/api/claims').send({
        item: foundItem._id,
        verificationDetails: 'Identifying serial on charging case',
      });
      claimDoc = res.body.claim;
    });

    test('Unauthorized user cannot approve or reject claim (403)', async () => {
      const res = await agentOther.patch(`/api/claims/${claimDoc._id}`).send({
        status: 'approved',
      });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/not authorized/i);
    });

    test('Item reporter (Finder) CAN review and approve claim', async () => {
      const res = await agentFinder.patch(`/api/claims/${claimDoc._id}`).send({
        status: 'approved',
        reviewNote: 'Verification details matched the physical item.',
      });

      expect(res.status).toBe(200);
      expect(res.body.claim.status).toBe('approved');

      // Verify item status updated to "claimed"
      const freshItem = await LostFoundItem.findById(foundItem._id);
      expect(freshItem.status).toBe('claimed');
    });

    test('Admin CAN review and reject claim', async () => {
      const res = await agentAdmin.patch(`/api/claims/${claimDoc._id}`).send({
        status: 'rejected',
        reviewNote: 'Does not match.',
      });

      expect(res.status).toBe(200);
      expect(res.body.claim.status).toBe('rejected');
    });

    test('Invalid state transition: cannot re-review an already approved/rejected claim (400)', async () => {
      // Approve claim first
      await agentFinder.patch(`/api/claims/${claimDoc._id}`).send({
        status: 'approved',
      });

      // Attempt to reject already approved claim
      const res = await agentFinder.patch(`/api/claims/${claimDoc._id}`).send({
        status: 'rejected',
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/invalid state transition/i);
    });

    test('Invalid status value is rejected with 400', async () => {
      const res = await agentFinder.patch(`/api/claims/${claimDoc._id}`).send({
        status: 'invalid_status_string',
      });

      expect(res.status).toBe(400);
    });
  });

  describe('4. Claim Withdrawal', () => {
    let claimDoc;

    beforeEach(async () => {
      const res = await agentClaimant.post('/api/claims').send({
        item: foundItem._id,
        verificationDetails: 'Details to withdraw',
      });
      claimDoc = res.body.claim;
    });

    test('Claimant can withdraw their pending claim', async () => {
      const res = await agentClaimant.delete(`/api/claims/${claimDoc._id}`);
      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/claim withdrawn/i);

      const dbDoc = await Claim.findById(claimDoc._id);
      expect(dbDoc).toBeNull();
    });

    test('Other user cannot withdraw claimant claim (403)', async () => {
      const res = await agentOther.delete(`/api/claims/${claimDoc._id}`);
      expect(res.status).toBe(403);
    });

    test('Claimant cannot withdraw an already approved claim (400)', async () => {
      // Approve claim first
      await agentFinder.patch(`/api/claims/${claimDoc._id}`).send({
        status: 'approved',
      });

      // Attempt withdrawal
      const res = await agentClaimant.delete(`/api/claims/${claimDoc._id}`);
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/only pending claims can be withdrawn/i);
    });
  });
});
