const express = require('express');
const router = express.Router();
const {
  getLostFoundItems, getLostFoundItem, createLostFoundItem, updateLostFoundItem, deleteLostFoundItem,
} = require('../controllers/lostFound.controller');
const { lostFoundRules } = require('../validators/lostFound.validators');
const { validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');

router.get('/', getLostFoundItems);
router.get('/:id', getLostFoundItem);
router.post('/', requireAuth, lostFoundRules, validate, createLostFoundItem);
router.patch('/:id', requireAuth, updateLostFoundItem);
router.delete('/:id', requireAuth, deleteLostFoundItem);

module.exports = router;
