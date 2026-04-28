/**
 * Input Validation Middleware
 * Uses express-validator to validate and sanitize user input
 */
const { body, param, query, validationResult } = require('express-validator');

// Helper to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

// Common validation rules
const validationRules = {
  // Username validation
  username: () => body('username')
    .trim()
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3, max: 50 }).withMessage('Username must be 3-50 characters')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),

  // Password validation
  password: () => body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),

  // Email validation
  email: () => body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),

  // Student admission number validation
  admNo: () => param('admNo')
    .trim()
    .notEmpty().withMessage('Admission number is required')
    .isAlphanumeric().withMessage('Admission number must be alphanumeric'),

  // Level validation
  level: (source = 'query') => (source === 'query' ? query : param)('level')
    .trim()
    .notEmpty().withMessage('Level is required')
    .isIn(['FORM I', 'FORM II', 'FORM III', 'FORM IV', 'FORM V', 'FORM VI', 'Form I', 'Form II', 'Form III', 'Form IV', 'Form V', 'Form VI'])
    .withMessage('Invalid level'),

  // Stream validation
  stream: (source = 'query') => (source === 'query' ? query : param)('stream')
    .trim()
    .notEmpty().withMessage('Stream is required'),

  // Year validation
  year: (source = 'query') => (source === 'query' ? query : param)('year')
    .notEmpty().withMessage('Year is required')
    .isInt({ min: 2000, max: 2100 }).withMessage('Year must be between 2000 and 2100')
    .toInt(),

  // Month validation
  month: (source = 'query') => (source === 'query' ? query : param)('month')
    .trim()
    .notEmpty().withMessage('Month is required'),

  // Subject code validation
  subjectCode: (source = 'query') => (source === 'query' ? query : param)('subject_code')
    .trim()
    .notEmpty().withMessage('Subject code is required'),

  // Score validation
  score: () => body('score')
    .notEmpty().withMessage('Score is required')
    .isFloat({ min: 0, max: 100 }).withMessage('Score must be between 0 and 100')
    .toFloat(),

  // Pagination validation
  pagination: () => [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer').toInt(),
    query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit must be between 1 and 1000').toInt()
  ],

  // Search validation
  search: () => query('search')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Search term must be less than 100 characters'),

  // Term validation
  term: (source = 'query') => (source === 'query' ? query : param)('term')
    .optional()
    .trim()
    .isIn(['I', 'II', 'III', '1', '2', '3']).withMessage('Invalid term'),

  // ID validation
  id: () => param('id')
    .notEmpty().withMessage('ID is required')
    .isUUID().withMessage('Invalid ID format')
};

// Pre-built validation chains for common operations
const validators = {
  // Login validation
  login: [
    validationRules.username(),
    validationRules.password(),
    handleValidationErrors
  ],

  // Student list validation
  studentList: [
    validationRules.level('query').optional(),
    validationRules.stream('query').optional(),
    validationRules.year('query').optional(),
    validationRules.search(),
    ...validationRules.pagination(),
    handleValidationErrors
  ],

  // Student detail validation
  studentDetail: [
    validationRules.admNo(),
    handleValidationErrors
  ],

  // Score entry validation
  scoreEntry: [
    validationRules.level('body'),
    validationRules.stream('body'),
    validationRules.year('body'),
    validationRules.month('body'),
    validationRules.subjectCode('body'),
    body('scores').isArray().withMessage('Scores must be an array'),
    handleValidationErrors
  ],

  // Report generation validation
  reportGeneration: [
    validationRules.level('query'),
    validationRules.stream('query'),
    validationRules.year('query'),
    validationRules.term('query').optional().trim(),
    handleValidationErrors
  ]
};

module.exports = {
  handleValidationErrors,
  validationRules,
  validators,
  body,
  param,
  query,
  validationResult
};
