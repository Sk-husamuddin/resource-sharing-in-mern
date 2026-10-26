const express = require('express');
const router = express.Router();
const { getMessages, sendMessage, markRead, getUnreadCount } = require('../controllers/message.controller');
const { requireAuth } = require('../middleware/auth');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');

const messageRules = [
  body('recipient').isMongoId().withMessage('Invalid recipient ID'),
  body('content').trim().notEmpty().withMessage('Content is required')
    .isLength({ max: 2000 }).withMessage('Message must be 2000 characters or fewer'),
];

router.get('/', requireAuth, getMessages);
router.get('/unread-count', requireAuth, getUnreadCount);
router.post('/', requireAuth, messageRules, validate, sendMessage);
router.patch('/:id/read', requireAuth, markRead);

module.exports = router;
