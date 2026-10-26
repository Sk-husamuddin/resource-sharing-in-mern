const mongoose = require('mongoose');

const lostFoundSchema = new mongoose.Schema(
  {
    reportType: {
      type: String,
      required: true,
      enum: {
        values: ['lost', 'found'],
        message: 'reportType must be "lost" or "found"',
      },
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [120, 'Title must be 120 characters or fewer'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [1000, 'Description must be 1000 characters or fewer'],
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
      maxlength: 200,
    },
    incidentDate: {
      type: Date,
      required: [true, 'Incident date is required'],
    },
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['open', 'claimed', 'resolved', 'closed'],
      default: 'open',
    },
    imageUrl: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

lostFoundSchema.index({ reporter: 1 });
lostFoundSchema.index({ reportType: 1 });
lostFoundSchema.index({ status: 1 });
lostFoundSchema.index({ title: 'text', description: 'text', location: 'text' });

module.exports = mongoose.model('LostFoundItem', lostFoundSchema);
