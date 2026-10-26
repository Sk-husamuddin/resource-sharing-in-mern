const { body } = require('express-validator');

const lostFoundRules = [
  body('reportType')
    .isIn(['lost', 'found'])
    .withMessage('reportType must be "lost" or "found"'),

  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ max: 120 }).withMessage('Title must be 120 characters or fewer'),

  body('description')
    .trim()
    .notEmpty().withMessage('Description is required')
    .isLength({ max: 1000 }).withMessage('Description must be 1000 characters or fewer'),

  body('location')
    .trim()
    .notEmpty().withMessage('Location is required')
    .isLength({ max: 200 }).withMessage('Location must be 200 characters or fewer'),

  body('incidentDate')
    .isISO8601().withMessage('incidentDate must be a valid date (ISO 8601)'),
];

const claimRules = [
  body('item')
    .notEmpty().withMessage('Item ID is required')
    .isMongoId().withMessage('Invalid item ID'),

  body('verificationDetails')
    .trim()
    .notEmpty().withMessage('Verification details are required')
    .isLength({ max: 500 }).withMessage('Verification details must be 500 characters or fewer'),

  body('preferredPickupTime')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Pickup time must be 200 characters or fewer'),
];

module.exports = { lostFoundRules, claimRules };
