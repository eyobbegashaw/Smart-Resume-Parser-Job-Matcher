const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getJobs,
  getJob,
  createJob,
  updateJob,
  deleteJob,
  getRecommendedJobs
} = require('../controllers/jobController');

// Public routes
router.get('/', getJobs);
router.get('/recommended', protect, getRecommendedJobs);
router.get('/:id', getJob);

// Admin only routes
router.post('/', protect, authorize('admin'), createJob);
router.put('/:id', protect, authorize('admin'), updateJob);
router.delete('/:id', protect, authorize('admin'), deleteJob);

module.exports = router;
