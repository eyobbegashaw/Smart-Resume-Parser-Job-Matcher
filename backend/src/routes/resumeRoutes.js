const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect } = require('../middleware/auth');
const {
  uploadResume,
  getResume,
  getUserResumes,
  deleteResume,
  analyzeSkillGap
} = require('../controllers/resumeController');

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// All routes require authentication
router.use(protect);

router.post('/upload', upload.single('resume'), uploadResume);
router.get('/', getUserResumes);
router.get('/:id', getResume);
router.delete('/:id', deleteResume);
router.post('/:id/analyze-gap/:jobId', analyzeSkillGap);

module.exports = router;
