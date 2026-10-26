const express = require('express');
const router = express.Router();
const {
  getClaims, createClaim, updateClaimStatus, deleteClaim,
} = require('../controllers/lostFound.controller');
const { claimRules } = require('../validators/lostFound.validators');
const { validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, getClaims);
router.post('/', requireAuth, claimRules, validate, createClaim);
router.patch('/:id', requireAuth, updateClaimStatus);
router.delete('/:id', requireAuth, deleteClaim);

module.exports = router;
