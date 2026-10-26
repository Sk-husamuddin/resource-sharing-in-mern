const mongoose = require('mongoose');

const claimSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LostFoundItem',
      required: true,
    },
    claimant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Private verification details — never exposed publicly
    verificationDetails: {
      type: String,
      required: [true, 'Verification details are required'],
      maxlength: [500, 'Verification details must be 500 characters or fewer'],
      select: false,
    },
    preferredPickupTime: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewNote: {
      type: String,
      maxlength: 400,
      default: '',
    },
  },
  { timestamps: true }
);

// One claimant can only have one pending/active claim per item
claimSchema.index({ item: 1, claimant: 1 }, { unique: true });
claimSchema.index({ claimant: 1 });
claimSchema.index({ status: 1 });

module.exports = mongoose.model('Claim', claimSchema);
