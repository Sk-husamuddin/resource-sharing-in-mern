const express = require('express');
const router = express.Router();
const {
  getStats, getUsers, updateUser, adminDeleteResource, adminDeleteLostFound, adminGetClaims,
} = require('../controllers/admin.controller');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// All admin routes require auth + admin role
router.use(requireAuth, requireAdmin);

router.get('/stats', getStats);
router.get('/users', getUsers);
router.patch('/users/:id', updateUser);
router.delete('/resources/:id', adminDeleteResource);
router.delete('/lost-found/:id', adminDeleteLostFound);
router.get('/claims', adminGetClaims);

module.exports = router;
