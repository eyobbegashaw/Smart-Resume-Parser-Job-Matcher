const logger = require('../utils/logger');

exports.errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || err.status;

  // Log error
  logger.error(err);

  // Malformed JSON payload
  if (err instanceof SyntaxError && err.type === 'entity.parse.failed') {
    error = { message: 'Invalid JSON payload', statusCode: 400 };
  }

  // Multer upload errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      error = { message: 'File too large. Maximum size is 5MB.', statusCode: 400 };
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      error = { message: 'Too many files. Please upload only one file.', statusCode: 400 };
    } else {
      error = { message: err.message || 'File upload error', statusCode: 400 };
    }
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = { message, statusCode: 404 };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = { message, statusCode: 400 };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = { message, statusCode: 400 };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = { message, statusCode: 401 };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = { message, statusCode: 401 };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Server Error'
  });
};
