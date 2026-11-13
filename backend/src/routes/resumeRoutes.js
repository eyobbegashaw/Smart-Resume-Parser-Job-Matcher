const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { uploadMemory, handleMulterError } = require('../middleware/upload');
const { uploadLimiter } = require('../middleware/rateLimiter');
const { validate } = require('../middleware/validation');
const {
  uploadResume,
  getResume,
  getUserResumes,
  deleteResume,
  analyzeSkillGap,
  getDailyQuota
} = require('../controllers/resumeController');

// All routes require authentication
router.use(protect);

router.get('/daily-quota', getDailyQuota);
router.post(
  '/upload',
  uploadLimiter,
  uploadMemory.single('resume'),
  handleMulterError,
  validate('resumeUpload'),
  uploadResume
);
router.get('/', getUserResumes);
router.get('/:id', validate('validateId'), getResume);
router.delete('/:id', validate('validateId'), deleteResume);
router.post('/:id/analyze-gap/:jobId', validate('validateId'), analyzeSkillGap);

module.exports = router;
