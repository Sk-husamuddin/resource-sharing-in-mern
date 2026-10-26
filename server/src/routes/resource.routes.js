const express = require('express');
const router = express.Router();
const {
  getResources, getResource, createResource, updateResource, deleteResource,
} = require('../controllers/resource.controller');
const { resourceRules, resourceUpdateRules } = require('../validators/resource.validators');
const { validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');

router.get('/', getResources);
router.get('/:id', getResource);
router.post('/', requireAuth, resourceRules, validate, createResource);
router.patch('/:id', requireAuth, resourceUpdateRules, validate, updateResource);
router.delete('/:id', requireAuth, deleteResource);

module.exports = router;
