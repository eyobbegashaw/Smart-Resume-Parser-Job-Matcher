const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect } = require('../middleware/auth');
const {
  getProfile,
  updateProfile,
  getUserResumes,
  getSavedJobs,
  saveJob,
  updateSavedJob,
  removeSavedJob,
  getUserStats,
  updatePreferences,
  deleteAccount
} = require('../controllers/userController');

// Validation rules
const profileValidation = [
  body('name').optional().notEmpty().withMessage('Name cannot be empty'),
  body('phone').optional().matches(/^(\+251|0)[1-9]\d{8}$/).withMessage('Invalid phone number'),
  body('email').optional().isEmail().withMessage('Invalid email'),
  body('location').optional().isString(),
  body('bio').optional().isString().isLength({ max: 500 })
];

const savedJobValidation = [
  body('status').optional().isIn(['saved', 'applied', 'interviewing', 'rejected', 'accepted']),
  body('notes').optional().isString().isLength({ max: 500 }),
  body('tags').optional().isArray()
];

const preferencesValidation = [
  body('language').optional().isIn(['en', 'am']),
  body('darkMode').optional().isBoolean(),
  body('emailNotifications').optional().isBoolean(),
  body('jobAlerts').optional().isBoolean()
];

// All routes require authentication
router.use(protect);

// Profile routes
router.get('/profile', getProfile);
router.put('/profile', profileValidation, updateProfile);

// Resume routes
router.get('/resumes', getUserResumes);

// Saved jobs routes
router.get('/saved-jobs', getSavedJobs);
router.post('/saved-jobs/:jobId', savedJobValidation, saveJob);
router.put('/saved-jobs/:jobId', savedJobValidation, updateSavedJob);
router.delete('/saved-jobs/:jobId', removeSavedJob);

// Stats routes
router.get('/stats', getUserStats);

// Preferences routes
router.put('/preferences', preferencesValidation, updatePreferences);

// Account routes
router.delete('/account', deleteAccount);

module.exports = router;