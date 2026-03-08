const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const passport = require('passport');
const path = require('path');
const fs = require('fs');

const logger = require('./utils/logger');
const database = require('./config/database');
const redisClient = require('./config/redis');
const { apiLimiter } = require('./middleware/rateLimiter');
const { errorHandler } = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/authRoutes');
const resumeRoutes = require('./routes/resumeRoutes');
const jobRoutes = require('./routes/jobRoutes');
const userRoutes = require('./routes/userRoutes');

class App {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 5000;
  }

  /**
   * Initialize application
   */
  async initialize() {
    try {
      // Connect to database
      await database.connect();

      // Connect to Redis (optional)
      try {
        await redisClient.connect();
      } catch (error) {
        logger.warn('Redis connection failed, continuing without Redis');
      }

      // Setup middleware
      this.setupMiddleware();

      // Setup routes
      this.setupRoutes();

      // Setup error handling
      this.setupErrorHandling();

      logger.info('Application initialized successfully');
      
      return this.app;
    } catch (error) {
      logger.error('Failed to initialize application:', error);
      throw error;
    }
  }

  /**
   * Setup middleware
   */
  setupMiddleware() {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // CORS
    this.app.use(cors({
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
      optionsSuccessStatus: 200
    }));

    // Compression
    this.app.use(compression());

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Logging
    if (process.env.NODE_ENV === 'development') {
      this.app.use(morgan('dev'));
    } else {
      // Create a write stream for access logs
      const accessLogStream = fs.createWriteStream(
        path.join(__dirname, '../logs/access.log'),
        { flags: 'a' }
      );
      this.app.use(morgan('combined', { stream: accessLogStream }));
    }

    // Rate limiting
    this.app.use('/api', apiLimiter);

    // Passport
    this.app.use(passport.initialize());
    require('./config/passport');

    // Static files
    this.app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

    // Request ID
    this.app.use((req, res, next) => {
      req.id = require('crypto').randomBytes(16).toString('hex');
      res.setHeader('X-Request-ID', req.id);
      next();
    });

    // Response time
    this.app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        logger.debug(`${req.method} ${req.originalUrl} - ${duration}ms`, {
          requestId: req.id,
          duration
        });
      });
      next();
    });
  }

  /**
   * Setup routes
   */
  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
        database: database.getConnectionStatus(),
        redis: redisClient.isConnected ? 'connected' : 'disconnected'
      });
    });

    // API routes
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/resumes', resumeRoutes);
    this.app.use('/api/jobs', jobRoutes);
    this.app.use('/api/users', userRoutes);

    // API documentation
    if (process.env.NODE_ENV === 'development') {
      this.app.use('/api-docs', express.static(path.join(__dirname, '../docs')));
    }

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: 'Route not found',
        path: req.originalUrl
      });
    });
  }

  /**
   * Setup error handling
   */
  setupErrorHandling() {
    this.app.use(errorHandler);
  }

  /**
   * Start server
   */
  async start() {
    try {
      await this.initialize();

      const server = this.app.listen(this.port, () => {
        logger.info(`
          ################################################
          🚀 Server listening on port: ${this.port}
          🌍 Environment: ${process.env.NODE_ENV || 'development'}
          📝 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}
          ################################################
        `);
      });

      // Graceful shutdown
      const shutdown = async (signal) => {
        logger.info(`${signal} received. Starting graceful shutdown...`);

        server.close(async () => {
          logger.info('HTTP server closed');

          try {
            await database.disconnect();
            await redisClient.disconnect();
            logger.info('Database connections closed');
            process.exit(0);
          } catch (error) {
            logger.error('Error during shutdown:', error);
            process.exit(1);
          }
        });

        // Force close after timeout
        setTimeout(() => {
          logger.error('Could not close connections in time, forcefully shutting down');
          process.exit(1);
        }, 10000);
      };

      process.on('SIGTERM', () => shutdown('SIGTERM'));
      process.on('SIGINT', () => shutdown('SIGINT'));

      return server;
    } catch (error) {
      logger.error('Failed to start server:', error);
      throw error;
    }
  }
}

module.exports = App;