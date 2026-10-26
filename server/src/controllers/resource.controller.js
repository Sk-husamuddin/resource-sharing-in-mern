const mongoose = require('mongoose');
const Resource = require('../models/Resource');

const ALLOWED_FIELDS = ['title', 'description', 'category', 'location', 'availabilityDetails', 'status', 'imageUrl'];

// GET /api/resources
const getResources = async (req, res, next) => {
  try {
    const { category, status, location, search, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (category) filter.category = category;
    if (status) filter.status = status;
    if (location) filter.location = { $regex: location, $options: 'i' };
    if (search) filter.$text = { $search: search };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [items, total] = await Promise.all([
      Resource.find(filter)
        .populate('owner', 'username displayName avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Resource.countDocuments(filter),
    ]);

    return res.json({ items, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    next(err);
  }
};

// GET /api/resources/:id
const getResource = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid resource ID.' });
    }
    const resource = await Resource.findById(req.params.id)
      .populate('owner', 'username displayName avatar');
    if (!resource) return res.status(404).json({ message: 'Resource not found.' });
    return res.json({ resource });
  } catch (err) {
    next(err);
  }
};

// POST /api/resources
const createResource = async (req, res, next) => {
  try {
    const data = {};
    ALLOWED_FIELDS.forEach(f => { if (req.body[f] !== undefined) data[f] = req.body[f]; });
    data.owner = req.session.userId;

    const resource = await Resource.create(data);
    await resource.populate('owner', 'username displayName avatar');
    return res.status(201).json({ message: 'Resource created.', resource });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/resources/:id
const updateResource = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid resource ID.' });
    }
    const resource = await Resource.findById(req.params.id);
    if (!resource) return res.status(404).json({ message: 'Resource not found.' });

    const isOwner = resource.owner.toString() === req.session.userId;
    if (!isOwner) {
      return res.status(403).json({ message: 'Only the creator/owner can edit this resource.' });
    }

    const update = {};
    ALLOWED_FIELDS.forEach(f => { if (req.body[f] !== undefined) update[f] = req.body[f]; });

    const updated = await Resource.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true })
      .populate('owner', 'username displayName avatar');
    return res.json({ message: 'Resource updated.', resource: updated });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/resources/:id
const deleteResource = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid resource ID.' });
    }
    const resource = await Resource.findById(req.params.id);
    if (!resource) return res.status(404).json({ message: 'Resource not found.' });

    const isOwner = resource.owner.toString() === req.session.userId;
    const isAdmin = req.session.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'You are not authorized to delete this resource.' });
    }

    await resource.deleteOne();
    return res.json({ message: 'Resource deleted.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getResources, getResource, createResource, updateResource, deleteResource };
