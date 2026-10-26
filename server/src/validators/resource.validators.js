const { body } = require('express-validator');

const resourceRules = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ max: 120 }).withMessage('Title must be 120 characters or fewer'),

  body('description')
    .trim()
    .notEmpty().withMessage('Description is required')
    .isLength({ max: 1000 }).withMessage('Description must be 1000 characters or fewer'),

  body('category')
    .isIn(['study-materials', 'books-notes', 'tools-equipment', 'other'])
    .withMessage('Category must be one of: study-materials, books-notes, tools-equipment, other'),

  body('location')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Location must be 200 characters or fewer'),

  body('availabilityDetails')
    .optional()
    .trim()
    .isLength({ max: 300 }).withMessage('Availability details must be 300 characters or fewer'),

  body('status')
    .optional()
    .isIn(['available', 'borrowed', 'unavailable'])
    .withMessage('Status must be available, borrowed, or unavailable'),
];

const resourceUpdateRules = [
  body('title')
    .optional()
    .trim()
    .notEmpty().withMessage('Title cannot be empty')
    .isLength({ max: 120 }).withMessage('Title must be 120 characters or fewer'),

  body('description')
    .optional()
    .trim()
    .notEmpty().withMessage('Description cannot be empty')
    .isLength({ max: 1000 }).withMessage('Description must be 1000 characters or fewer'),

  body('category')
    .optional()
    .isIn(['study-materials', 'books-notes', 'tools-equipment', 'other'])
    .withMessage('Category must be one of: study-materials, books-notes, tools-equipment, other'),

  body('location')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Location must be 200 characters or fewer'),

  body('availabilityDetails')
    .optional()
    .trim()
    .isLength({ max: 300 }).withMessage('Availability details must be 300 characters or fewer'),

  body('status')
    .optional()
    .isIn(['available', 'borrowed', 'unavailable'])
    .withMessage('Status must be available, borrowed, or unavailable'),
];

module.exports = { resourceRules, resourceUpdateRules };

