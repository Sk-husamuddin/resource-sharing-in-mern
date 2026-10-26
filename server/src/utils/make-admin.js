/**
 * make-admin.js
 * ─────────────────────────────────────────────────────────────────────
 * Safe, local-only script to promote an existing user to the admin role.
 * Run from inside the server/ directory:
 *
 *   node src/utils/make-admin.js user@example.com
 *
 * This script NEVER creates users or changes passwords.
 * It requires the user to already exist in the database.
 * ─────────────────────────────────────────────────────────────────────
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const email = process.argv[2];
if (!email) {
  console.error('Usage: node src/utils/make-admin.js <email>');
  process.exit(1);
}

(async () => {
    const mongoUri = process.env.NODE_ENV === 'test'
      ? (process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/resource_hub_test')
      : (process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/resource_hub');
    await mongoose.connect(mongoUri);
    const user = await User.findOneAndUpdate(
      { email: email.toLowerCase() },
      { role: 'admin' },
      { new: true }
    ).select('-passwordHash');

    if (!user) {
      console.error(`❌ No user found with email: ${email}`);
      process.exit(1);
    }

    console.log(`✅ User "${user.username}" (${user.email}) promoted to admin.`);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await mongoose.disconnect();
  }
})();
