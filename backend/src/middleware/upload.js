const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const logger = require('../utils/logger');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${uniqueSuffix}${ext}`);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['application/pdf'];
  const allowedExts = ['.pdf'];

  const ext = path.extname(file.originalname).toLowerCase();
  const mimetype = allowedMimes.includes(file.mimetype);
  const extension = allowedExts.includes(ext);

  if (mimetype && extension) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

// Create multer instance
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1 // Only 1 file at a time
  },
  fileFilter: fileFilter
});

// Memory storage for processing without saving
const memoryStorage = multer.memoryStorage();

const uploadMemory = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1
  },
  fileFilter: fileFilter
});

// Error handler for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large. Maximum size is 5MB.'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'Too many files. Please upload only one file.'
      });
    }
    return res.status(400).json({
      success: false,
      error: err.message
    });
  }
  
  if (err) {
    return res.status(400).json({
      success: false,
      error: err.message
    });
  }
  
  next();
};

// Clean up old files
const cleanupOldFiles = async (hours = 24) => {
  try {
    const files = fs.readdirSync(uploadDir);
    const now = Date.now();
    
    files.forEach(file => {
      const filePath = path.join(uploadDir, file);
      const stats = fs.statSync(filePath);
      const age = now - stats.mtimeMs;
      
      // Delete files older than specified hours
      if (age > hours * 60 * 60 * 1000) {
        fs.unlinkSync(filePath);
        logger.info(`Cleaned up old file: ${file}`);
      }
    });
  } catch (error) {
    logger.error('Error cleaning up old files:', error);
  }
};

// Run cleanup every day
setInterval(() => cleanupOldFiles(24), 24 * 60 * 60 * 1000);

module.exports = {
  upload,
  uploadMemory,
  handleMulterError,
  cleanupOldFiles
};