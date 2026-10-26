const User = require('../models/User');
const Resource = require('../models/Resource');
const LostFoundItem = require('../models/LostFoundItem');
const Claim = require('../models/Claim');

// GET /api/admin/stats
const getStats = async (req, res, next) => {
  try {
    const [userCount, resourceCount, lostFoundCount, claimCount] = await Promise.all([
      User.countDocuments(),
      Resource.countDocuments(),
      LostFoundItem.countDocuments(),
      Claim.countDocuments({ status: 'pending' }),
    ]);
    return res.json({ userCount, resourceCount, lostFoundCount, pendingClaims: claimCount });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/users
const getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 30 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [users, total] = await Promise.all([
      User.find().select('-passwordHash -phone').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      User.countDocuments(),
    ]);
    return res.json({ users, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/users/:id  — change role or soft-ban
const updateUser = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (role && !['user', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'role must be "user" or "admin".' });
    }
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { ...(role && { role }) },
      { new: true, runValidators: true }
    ).select('-passwordHash -phone');
    if (!user) return res.status(404).json({ message: 'User not found.' });
    return res.json({ message: 'User updated.', user });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/admin/resources/:id
const adminDeleteResource = async (req, res, next) => {
  try {
    const doc = await Resource.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Resource not found.' });
    return res.json({ message: 'Resource removed by admin.' });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/admin/lost-found/:id
const adminDeleteLostFound = async (req, res, next) => {
  try {
    const doc = await LostFoundItem.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Item not found.' });
    return res.json({ message: 'Item removed by admin.' });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/claims
const adminGetClaims = async (req, res, next) => {
  try {
    const claims = await Claim.find()
      .select('+verificationDetails')
      .populate('item', 'title reportType status')
      .populate('claimant', 'username email')
      .populate('reviewer', 'username')
      .sort({ createdAt: -1 })
      .limit(100);
    return res.json({ claims });
  } catch (err) {
    next(err);
  }
};

module.exports = { getStats, getUsers, updateUser, adminDeleteResource, adminDeleteLostFound, adminGetClaims };
