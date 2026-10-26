const mongoose = require('mongoose');

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const isTest = process.env.NODE_ENV === 'test';
  const uri = isTest
    ? (process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/resource_hub_test')
    : (process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/resource_hub');

  // CRITICAL SAFETY CHECK: Never allow test suite to connect to dev database
  if (isTest) {
    if (uri.includes('/resource_hub') && !uri.includes('resource_hub_test')) {
      throw new Error(
        'CRITICAL DATABASE SAFETY VIOLATION: Test suite attempted to connect to development database "resource_hub"!'
      );
    }
  }

  try {
    const conn = await mongoose.connect(uri);

    // Double-check connected database name
    if (isTest && conn.connection.name === 'resource_hub') {
      await mongoose.disconnect();
      throw new Error(
        'CRITICAL DATABASE SAFETY VIOLATION: Test suite connected to "resource_hub"! Disconnecting immediately.'
      );
    }

    if (process.env.NODE_ENV !== 'test') {
      console.log(`✅ MongoDB connected: ${conn.connection.host} / ${conn.connection.name}`);
    }
    return conn;
  } catch (err) {
    if (isTest) {
      throw err;
    }
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;

