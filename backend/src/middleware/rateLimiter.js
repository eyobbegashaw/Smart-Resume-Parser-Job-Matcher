const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const logger = require('../utils/logger');

// General API rate limiter
exports.apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    error: 'Too many requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.ip === '127.0.0.1' || req.ip === '::1',
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: 'Too many requests, please try again later.'
    });
  }
});

// Auth endpoints rate limiter (stricter)
exports.authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const ipKey = typeof ipKeyGenerator === 'function' ? ipKeyGenerator(req.ip) : req.ip;
    const email = req.body && typeof req.body.email === 'string'
      ? req.body.email.trim().toLowerCase()
      : '';
    return email ? `${ipKey}:${email}` : ipKey;
  }
});

// OTP verification & resend rate limiter
exports.otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,
  message: {
    success: false,
    error: 'Too many OTP requests. Please wait a few minutes and try again.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ipKey = typeof ipKeyGenerator === 'function' ? ipKeyGenerator(req.ip) : req.ip;
    const email = req.body && typeof req.body.email === 'string'
      ? req.body.email.trim().toLowerCase()
      : '';
    return email ? `${ipKey}:otp:${email}` : `${ipKey}:otp`;
  }
});

// Upload endpoints rate limiter
exports.uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: {
    success: false,
    error: 'Too many upload attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Job search rate limiter
exports.searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: {
    success: false,
    error: 'Too many search requests, please slow down.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Create custom rate limiter
exports.createRateLimiter = (options = {}) => {
  const { prefix: _prefix, store: _store, ...rest } = options;
  return rateLimit({
    windowMs: rest.windowMs || 15 * 60 * 1000,
    max: rest.max || 100,
    message: rest.message || {
      success: false,
      error: 'Too many requests, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    ...rest
  });
};
