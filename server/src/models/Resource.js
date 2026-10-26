const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema(
  {
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
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: ['study-materials', 'books-notes', 'tools-equipment', 'other'],
        message: 'Category must be one of: study-materials, books-notes, tools-equipment, other',
      },
    },
    location: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    availabilityDetails: {
      type: String,
      trim: true,
      maxlength: 300,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['available', 'borrowed', 'unavailable'],
      default: 'available',
    },
    imageUrl: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

resourceSchema.index({ owner: 1 });
resourceSchema.index({ category: 1 });
resourceSchema.index({ status: 1 });
resourceSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Resource', resourceSchema);
