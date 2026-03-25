const { body, param, query, validationResult } = require('express-validator');
// Validation rules for different endpoints
const validationRules = {
  // Auth validation
  register: [
    body('name')
      .trim()
      .notEmpty().withMessage('Name is required')
      .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters')
      .matches(/^[a-zA-Z\s]+$/).withMessage('Name can only contain letters and spaces'),
    
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Please provide a valid email')
      .normalizeEmail(),
    
    body('password')
      .notEmpty().withMessage('Password is required')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
      .matches(/^(?=.*[A-Za-z])(?=.*\d)/).withMessage('Password must contain at least one letter and one number')
  ],

  login: [
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Please provide a valid email')
      .normalizeEmail(),
    
    body('password')
      .notEmpty().withMessage('Password is required')
  ],

  // Resume validation
  resumeUpload: [
    body('language')
      .optional()
      .isIn(['en', 'am']).withMessage('Language must be either en or am')
  ],

  // Job validation
  createJob: [
    body('title')
      .trim()
      .notEmpty().withMessage('Job title is required')
      .isLength({ min: 3, max: 100 }).withMessage('Title must be between 3 and 100 characters'),
    
    body('company')
      .trim()
      .notEmpty().withMessage('Company name is required')
      .isLength({ min: 2, max: 50 }).withMessage('Company name must be between 2 and 50 characters'),
    
    body('location')
      .trim()
      .notEmpty().withMessage('Location is required'),
    
    body('description')
      .trim()
      .notEmpty().withMessage('Job description is required')
      .isLength({ min: 50 }).withMessage('Description must be at least 50 characters'),
    
    body('jobType')
      .isIn(['Full-time', 'Part-time', 'Contract', 'Internship', 'Remote'])
      .withMessage('Invalid job type'),
    
    body('experienceLevel')
      .optional()
      .isIn(['Entry Level', 'Mid Level', 'Senior', 'Lead', 'Manager'])
      .withMessage('Invalid experience level'),
    
    body('requiredSkills')
      .isArray().withMessage('Required skills must be an array')
      .notEmpty().withMessage('At least one required skill is needed'),
    
    body('salary.min')
      .optional()
      .isNumeric().withMessage('Minimum salary must be a number')
      .custom((value, { req }) => {
        if (req.body.salary?.max && value > req.body.salary.max) {
          throw new Error('Minimum salary cannot be greater than maximum salary');
        }
        return true;
      }),
    
    body('salary.max')
      .optional()
      .isNumeric().withMessage('Maximum salary must be a number'),
    
    body('applicationUrl')
      .optional()
      .isURL().withMessage('Please provide a valid URL')
  ],

  // Search validation
  searchJobs: [
    query('page')
      .optional()
      .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
    
    query('search')
      .optional()
      .trim()
      .isLength({ max: 100 }).withMessage('Search term too long'),
    
    query('location')
      .optional()
      .trim()
      .isLength({ max: 50 }).withMessage('Location too long'),
    
    query('jobType')
      .optional()
      .isIn(['Full-time', 'Part-time', 'Contract', 'Internship', 'Remote'])
      .withMessage('Invalid job type'),
    
    query('experienceLevel')
      .optional()
      .isIn(['Entry Level', 'Mid Level', 'Senior', 'Lead', 'Manager'])
      .withMessage('Invalid experience level'),
    
    query('minSalary')
      .optional()
      .isInt({ min: 0 }).withMessage('Minimum salary must be a positive number'),
    
    query('maxSalary')
      .optional()
      .isInt({ min: 0 }).withMessage('Maximum salary must be a positive number')
  ],

  // Profile validation
  updateProfile: [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
    
    body('phone')
      .optional()
      .matches(/^(\+251|0)[1-9]\d{8}$/).withMessage('Invalid Ethiopian phone number'),
    
    body('location')
      .optional()
      .trim()
      .isLength({ max: 100 }).withMessage('Location too long'),
    
    body('bio')
      .optional()
      .trim()
      .isLength({ max: 500 }).withMessage('Bio must be less than 500 characters'),
    
    body('skills')
      .optional()
      .isArray().withMessage('Skills must be an array')
      .custom((skills) => {
        if (skills.some(skill => skill.length > 50)) {
          throw new Error('Each skill must be less than 50 characters');
        }
        return true;
      })
  ],

  // ID parameter validation
  validateId: [
    param('id')
      .isMongoId().withMessage('Invalid ID format')
  ],

  // Email validation
  validateEmail: [
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Please provide a valid email')
      .normalizeEmail()
  ],

  // Password validation
  validatePassword: [
    body('password')
      .notEmpty().withMessage('Password is required')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    
    body('confirmPassword')
      .notEmpty().withMessage('Please confirm your password')
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error('Passwords do not match');
        }
        return true;
      })
  ],

  // Contact form validation
  contactForm: [
    body('name')
      .trim()
      .notEmpty().withMessage('Name is required')
      .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
    
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Please provide a valid email')
      .normalizeEmail(),
    
    body('subject')
      .trim()
      .notEmpty().withMessage('Subject is required')
      .isLength({ min: 3, max: 100 }).withMessage('Subject must be between 3 and 100 characters'),
    
    body('message')
      .trim()
      .notEmpty().withMessage('Message is required')
      .isLength({ min: 10, max: 1000 }).withMessage('Message must be between 10 and 1000 characters')
  ]
};

// Validation middleware
const validate = (validationName) => {
  return async (req, res, next) => {
    // Run validations
    const validations = validationRules[validationName];
    if (!validations) {
      return next();
    }

    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    // Format errors
    const formattedErrors = errors.array().map(err => ({
      field: err.path,
      message: err.msg
    }));

    return res.status(400).json({
      success: false,
      errors: formattedErrors
    });
  };
};

// Custom validators
const customValidators = {
  // Validate Ethiopian phone number
  isEthiopianPhone: (phone) => {
    const regex = /^(\+251|0)[1-9]\d{8}$/;
    return regex.test(phone);
  },

  // Validate Ethiopian location
  isEthiopianLocation: (location) => {
    const cities = ['Addis Ababa', 'Adama', 'Bahir Dar', 'Gondar', 'Hawassa', 'Mekelle', 'Jimma', 'Dire Dawa'];
    return cities.some(city => location.toLowerCase().includes(city.toLowerCase()));
  },

  // Validate salary range
  isValidSalaryRange: (min, max) => {
    if (!min && !max) return true;
    if (min && max && min > max) return false;
    return true;
  },

  // Validate future date
  isFutureDate: (date) => {
    const inputDate = new Date(date);
    const now = new Date();
    return inputDate > now;
  },

  // Validate file type
  isPDF: (filename) => {
    const ext = path.extname(filename).toLowerCase();
    return ext === '.pdf';
  },

  // Validate Ethiopian skills
  isEthiopianJobRelevant: (skills) => {
    const commonSkills = [
      'Amharic', 'English', 'Excel', 'QuickBooks', 'Peachtree',
      'Accounting', 'Management', 'Sales', 'Marketing', 'Customer Service'
    ];
    return skills.some(skill => 
      commonSkills.some(common => 
        skill.toLowerCase().includes(common.toLowerCase())
      )
    );
  }
};

module.exports = {
  validate,
  customValidators,
  validationRules
};
