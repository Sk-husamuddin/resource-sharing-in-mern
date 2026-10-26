const mongoose = require('mongoose');
const LostFoundItem = require('../models/LostFoundItem');
const Claim = require('../models/Claim');

const ALLOWED_LF_FIELDS = ['reportType', 'title', 'description', 'location', 'incidentDate', 'status', 'imageUrl'];
const ALLOWED_CLAIM_FIELDS = ['item', 'verificationDetails', 'preferredPickupTime'];

// ─── Lost & Found ────────────────────────────────────────────────────────────

// GET /api/lost-found
const getLostFoundItems = async (req, res, next) => {
  try {
    const { reportType, status, search, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (reportType) filter.reportType = reportType;
    if (status) filter.status = status;
    if (search) filter.$text = { $search: search };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [items, total] = await Promise.all([
      LostFoundItem.find(filter)
        .populate('reporter', 'username displayName avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      LostFoundItem.countDocuments(filter),
    ]);

    return res.json({ items, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    next(err);
  }
};

// GET /api/lost-found/:id
const getLostFoundItem = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid item ID.' });
    }
    const item = await LostFoundItem.findById(req.params.id)
      .populate('reporter', 'username displayName avatar');
    if (!item) return res.status(404).json({ message: 'Item not found.' });
    return res.json({ item });
  } catch (err) {
    next(err);
  }
};

// POST /api/lost-found
const createLostFoundItem = async (req, res, next) => {
  try {
    const data = {};
    ALLOWED_LF_FIELDS.forEach(f => { if (req.body[f] !== undefined) data[f] = req.body[f]; });
    data.reporter = req.session.userId;

    const item = await LostFoundItem.create(data);
    await item.populate('reporter', 'username displayName avatar');
    return res.status(201).json({ message: 'Report submitted.', item });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/lost-found/:id
const updateLostFoundItem = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid item ID.' });
    }
    const item = await LostFoundItem.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found.' });

    const isOwner = item.reporter.toString() === req.session.userId;
    if (!isOwner) {
      return res.status(403).json({ message: 'Only the original reporter can edit this report.' });
    }

    const update = {};
    ALLOWED_LF_FIELDS.forEach(f => { if (req.body[f] !== undefined) update[f] = req.body[f]; });

    const updated = await LostFoundItem.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true })
      .populate('reporter', 'username displayName avatar');
    return res.json({ message: 'Report updated.', item: updated });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/lost-found/:id
const deleteLostFoundItem = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid item ID.' });
    }
    const item = await LostFoundItem.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found.' });

    const isOwner = item.reporter.toString() === req.session.userId;
    const isAdmin = req.session.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to delete this report.' });
    }

    await item.deleteOne();
    return res.json({ message: 'Report deleted.' });
  } catch (err) {
    next(err);
  }
};

// ─── Claims ──────────────────────────────────────────────────────────────────

// GET /api/claims
const getClaims = async (req, res, next) => {
  try {
    const { type } = req.query;
    const filter = {};
    if (req.session.role !== 'admin') {
      if (type === 'received') {
        const myItemIds = await LostFoundItem.find({ reporter: req.session.userId }).distinct('_id');
        filter.item = { $in: myItemIds };
      } else if (type === 'all') {
        const myItemIds = await LostFoundItem.find({ reporter: req.session.userId }).distinct('_id');
        filter.$or = [{ claimant: req.session.userId }, { item: { $in: myItemIds } }];
      } else {
        // Regular users see only their own claims by default
        filter.claimant = req.session.userId;
      }
    }

    const claims = await Claim.find(filter)
      .populate('item', 'title reportType status reporter')
      .populate('claimant', 'username displayName')
      .populate('reviewer', 'username')
      .sort({ createdAt: -1 });

    return res.json({ claims });
  } catch (err) {
    next(err);
  }
};

// POST /api/claims
const createClaim = async (req, res, next) => {
  try {
    // Verify item exists and is a "found" item
    const { item, verificationDetails, preferredPickupTime } = req.body;
    if (!mongoose.Types.ObjectId.isValid(item)) {
      return res.status(400).json({ message: 'Invalid item ID.' });
    }
    const lfItem = await LostFoundItem.findById(item);
    if (!lfItem) return res.status(404).json({ message: 'Item not found.' });
    if (lfItem.reportType !== 'found') {
      return res.status(400).json({ message: 'Claims can only be made on "found" items.' });
    }
    if (lfItem.status !== 'open') {
      return res.status(400).json({ message: 'This item is no longer accepting claims.' });
    }

    // Cannot claim your own found report
    if (lfItem.reporter.toString() === req.session.userId) {
      return res.status(400).json({ message: 'You cannot claim your own found report.' });
    }

    const claim = await Claim.create({
      item,
      claimant: req.session.userId,
      verificationDetails,
      preferredPickupTime,
    });

    const populated = await Claim.findById(claim._id)
      .populate('item', 'title reportType status')
      .populate('claimant', 'username displayName');

    return res.status(201).json({ message: 'Claim submitted.', claim: populated });
  } catch (err) {
    // Duplicate key = already claimed
    if (err.code === 11000) {
      return res.status(409).json({ message: 'You have already submitted a claim for this item.' });
    }
    next(err);
  }
};

// PATCH /api/claims/:id  (approve/reject — reporter or admin)
const updateClaimStatus = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid claim ID.' });
    }
    const claim = await Claim.findById(req.params.id).populate('item');
    if (!claim) return res.status(404).json({ message: 'Claim not found.' });

    const isItemOwner = claim.item.reporter.toString() === req.session.userId;
    const isAdmin = req.session.role === 'admin';
    if (!isItemOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to review this claim.' });
    }

    const { status, reviewNote } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'status must be "approved" or "rejected".' });
    }

    if (claim.status !== 'pending') {
      return res.status(400).json({ message: `Invalid state transition: claim is already ${claim.status}.` });
    }

    claim.status = status;
    claim.reviewer = req.session.userId;
    if (reviewNote) claim.reviewNote = reviewNote;

    // If approved, mark item as claimed
    if (status === 'approved') {
      await LostFoundItem.findByIdAndUpdate(claim.item._id, { status: 'claimed' });
    }

    await claim.save();
    const updated = await Claim.findById(claim._id)
      .populate('item', 'title reportType status')
      .populate('claimant', 'username displayName')
      .populate('reviewer', 'username');

    return res.json({ message: 'Claim updated.', claim: updated });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/claims/:id (claimant can withdraw pending claim)
const deleteClaim = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid claim ID.' });
    }
    const claim = await Claim.findById(req.params.id);
    if (!claim) return res.status(404).json({ message: 'Claim not found.' });

    const isOwner = claim.claimant.toString() === req.session.userId;
    const isAdmin = req.session.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized.' });
    }
    if (claim.status !== 'pending' && !isAdmin) {
      return res.status(400).json({ message: 'Only pending claims can be withdrawn.' });
    }

    await claim.deleteOne();
    return res.json({ message: 'Claim withdrawn.' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getLostFoundItems, getLostFoundItem, createLostFoundItem, updateLostFoundItem, deleteLostFoundItem,
  getClaims, createClaim, updateClaimStatus, deleteClaim,
};
