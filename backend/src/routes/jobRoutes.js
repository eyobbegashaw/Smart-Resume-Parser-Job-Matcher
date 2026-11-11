const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { searchLimiter } = require('../middleware/rateLimiter');
const { validate } = require('../middleware/validation');
const {
  getJobs,
  getJob,
  createJob,
  updateJob,
  deleteJob,
  getRecommendedJobs
} = require('../controllers/jobController');

// Public & user routes
router.get('/', searchLimiter, validate('searchJobs'), getJobs);
router.get('/recommended', protect, getRecommendedJobs);
router.get('/:id', validate('validateId'), getJob);

// Admin only routes
router.post('/', protect, authorize('admin'), validate('createJob'), createJob);
router.put('/:id', protect, authorize('admin'), validate('validateId'), updateJob);
router.delete('/:id', protect, authorize('admin'), validate('validateId'), deleteJob);

module.exports = router;
