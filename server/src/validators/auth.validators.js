const { body } = require('express-validator');

const registerRules = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be 3–30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username may only contain letters, numbers and underscores'),

  body('email')
    .trim()
    .isEmail()
    .withMessage('A valid email address is required')
    .toLowerCase(),

  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),

  body('confirmPassword')
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Passwords do not match'),
];

const loginRules = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('A valid email is required')
    .toLowerCase(),

  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

module.exports = { registerRules, loginRules };
