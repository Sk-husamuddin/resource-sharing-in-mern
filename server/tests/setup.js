/**
 * setup.js — Jest global setup & database safety guard
 * Runs before any test files are imported.
 */

// 1. Enforce test environment variables BEFORE anything else loads
process.env.NODE_ENV = 'test';
process.env.TEST_MONGO_URI = process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/resource_hub_test';
// Ensure regular MONGO_URI is overridden in test process to prevent accidental fallback
process.env.MONGO_URI = process.env.TEST_MONGO_URI;

const mongoose = require('mongoose');

// 2. Strict Safety Validator
const assertSafeDatabase = (conn) => {
  const dbName = conn.name || (conn.db && conn.db.databaseName);
  if (!dbName) return;

  if (dbName === 'resource_hub') {
    throw new Error(
      'FATAL SAFETY EXCEPTION: Test suite is connected to development database "resource_hub"!\n' +
      'Tests MUST only use "resource_hub_test". Aborting execution immediately to protect development data.'
    );
  }

  if (dbName !== 'resource_hub_test') {
    throw new Error(
      `SAFETY VIOLATION: Unexpected test database name "${dbName}". Expected "resource_hub_test".`
    );
  }
};

// 3. Connect before all tests if not connected
beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.TEST_MONGO_URI);
  }
  assertSafeDatabase(mongoose.connection);
});

// 4. Safe cleanup helper: cleans collections ONLY in resource_hub_test
const safeClearCollections = async () => {
  assertSafeDatabase(mongoose.connection);
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
};

// 5. Global teardown
afterAll(async () => {
  try {
    assertSafeDatabase(mongoose.connection);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  } catch (err) {
    console.error('Error in test teardown:', err.message);
  }
});

module.exports = { assertSafeDatabase, safeClearCollections };
