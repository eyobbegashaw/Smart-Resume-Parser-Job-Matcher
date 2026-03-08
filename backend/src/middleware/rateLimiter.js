const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('ioredis');
const logger = require('../utils/logger');

// Create Redis client if available
let redisClient;
try {
  redisClient = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1
  });

  redisClient.on('error', (err) => {
    logger.warn('Redis connection error:', err.message);
    redisClient = null;
  });
} catch (error) {
  logger.warn('Redis not available, using memory store');
  redisClient = null;
}

// General API rate limiter
exports.apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: redisClient ? new RedisStore({
    client: redisClient,
    prefix: 'rl:api:'
  }) : undefined,
  skip: (req) => req.ip === '127.0.0.1' || req.ip === '::1', // Skip localhost
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
  max: 5, // Limit each IP to 5 login/register attempts per hour
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later.'
  },
  skipSuccessfulRequests: true, // Don't count successful requests
  store: redisClient ? new RedisStore({
    client: redisClient,
    prefix: 'rl:auth:'
  }) : undefined,
  keyGenerator: (req) => {
    // Use email as key for login attempts if provided
    return req.body.email || req.ip;
  }
});

// Upload endpoints rate limiter
exports.uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 uploads per hour
  message: {
    success: false,
    error: 'Too many upload attempts, please try again later.'
  },
  store: redisClient ? new RedisStore({
    client: redisClient,
    prefix: 'rl:upload:'
  }) : undefined
});

// Job search rate limiter
exports.searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 searches per minute
  message: {
    success: false,
    error: 'Too many search requests, please slow down.'
  },
  store: redisClient ? new RedisStore({
    client: redisClient,
    prefix: 'rl:search:'
  }) : undefined
});

// Create custom rate limiter
exports.createRateLimiter = (options) => {
  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000,
    max: options.max || 100,
    message: options.message || {
      success: false,
      error: 'Too many requests, please try again later.'
    },
    store: redisClient ? new RedisStore({
      client: redisClient,
      prefix: options.prefix || 'rl:custom:'
    }) : undefined,
    ...options
  });
};