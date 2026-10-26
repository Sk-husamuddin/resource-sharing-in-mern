/**
 * Optional seed script for local testing.
 * Run manually: node src/utils/seed.js
 * Creates sample resources and lost/found reports associated with an existing user.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Resource = require('../models/Resource');
const LostFoundItem = require('../models/LostFoundItem');

(async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/resource_hub';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB for optional seeding...');

    // Find any user to own seeded items
    let user = await User.findOne();
    if (!user) {
      console.log('No user found. Please register at least one account via http://localhost:5173/signup first.');
      process.exit(1);
    }

    const sampleResources = [
      {
        title: 'Data Structures & Algorithms in Java (4th Edition)',
        description: 'Hardcover textbook in great condition. Available for semester-long borrowing.',
        category: 'books-notes',
        location: 'Central Library, 2nd Floor Reading Room',
        availabilityDetails: 'Mon-Fri 10am - 4pm',
        status: 'available',
        owner: user._id,
      },
      {
        title: 'Digital Multimeter & Breadboard Kit',
        description: 'Complete electronics kit with jumper wires, resistors, and basic sensors.',
        category: 'tools-equipment',
        location: 'Engineering Building Lab 3',
        availabilityDetails: 'Contact 24 hours in advance',
        status: 'available',
        owner: user._id,
      },
      {
        title: 'Operating Systems Lecture Notes & Exam Prep',
        description: 'Handwritten summarized notes covering processes, threads, concurrency, and virtual memory.',
        category: 'study-materials',
        location: 'CS Department Common Room',
        availabilityDetails: 'Flexible pickup',
        status: 'available',
        owner: user._id,
      },
    ];

    const sampleLostFound = [
      {
        reportType: 'found',
        title: 'Black HP Wireless Mouse',
        description: 'Found under desk row 4 after the afternoon discrete math lecture.',
        location: 'Room 204, Main Academic Block',
        incidentDate: new Date(),
        status: 'open',
        reporter: user._id,
      },
      {
        reportType: 'lost',
        title: 'Blue Water Bottle with Space Stickers',
        description: 'Hydroflask water bottle with NASA and anime stickers. Left near basketball court.',
        location: 'Sports Complex / Basketball Court',
        incidentDate: new Date(),
        status: 'open',
        reporter: user._id,
      },
    ];

    await Resource.insertMany(sampleResources);
    await LostFoundItem.insertMany(sampleLostFound);

    console.log(`✅ Seeded ${sampleResources.length} sample resources and ${sampleLostFound.length} lost & found items!`);
  } catch (err) {
    console.error('Seed error:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
})();
