const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const util = require('util');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

const execFileAsync = util.promisify(execFile);

class Database {
  constructor() {
    this.isConnected = false;
    this.listenersAttached = false;
  }

  /**
   * Connect to MongoDB (supports MongoDB Atlas mongodb+srv:// URIs)
   */
  async connect() {
    if (this.isConnected && mongoose.connection.readyState === 1) {
      logger.info('Using existing database connection');
      return mongoose.connection;
    }

    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error(
        'MONGODB_URI environment variable is required (e.g., MongoDB Atlas connection string in backend/.env)'
      );
    }

    if (/<(?:db_)?username>|<(?:db_)?password>|<cluster-url>/i.test(uri)) {
      throw new Error(
        'MONGODB_URI in backend/.env still contains placeholder text (such as <db_username>). Replace placeholders with your real MongoDB Atlas credentials.'
      );
    }

    try {
      const options = {
        autoIndex: process.env.NODE_ENV !== 'production',
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
        minPoolSize: 1,
        maxIdleTimeMS: 30000,
        retryWrites: true,
        retryReads: true
      };

      if (!this.listenersAttached) {
        mongoose.connection.on('error', (err) => {
          logger.error('MongoDB connection error:', err);
          this.isConnected = false;
        });

        mongoose.connection.on('disconnected', () => {
          logger.warn('MongoDB disconnected');
          this.isConnected = false;
        });

        mongoose.connection.on('reconnected', () => {
          logger.info('MongoDB reconnected');
          this.isConnected = true;
        });

        this.listenersAttached = true;
      }

      const conn = await mongoose.connect(uri, options);
      this.isConnected = true;

      logger.info(`MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);

      return conn;
    } catch (error) {
      this.isConnected = false;
      logger.error('MongoDB connection error:', error);
      throw error;
    }
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnect() {
    if (!this.isConnected && mongoose.connection.readyState === 0) {
      return;
    }

    try {
      await mongoose.disconnect();
      this.isConnected = false;
      logger.info('MongoDB disconnected through app termination');
    } catch (error) {
      logger.error('Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  /**
   * Check connection status
   */
  getConnectionStatus() {
    return {
      isConnected: mongoose.connection.readyState === 1,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      name: mongoose.connection.name
    };
  }

  /**
   * Create database indexes for all registered Mongoose models
   */
  async createIndexes() {
    if (mongoose.connection.readyState !== 1) {
      await this.connect();
    }

    try {
      const modelNames = mongoose.modelNames();
      for (const modelName of modelNames) {
        await mongoose.model(modelName).createIndexes();
      }

      logger.info('Database indexes created successfully');
    } catch (error) {
      logger.error('Error creating database indexes:', error);
      throw error;
    }
  }

  /**
   * Drop database (use with caution)
   */
  async dropDatabase() {
    if (process.env.NODE_ENV !== 'development') {
      throw new Error('Cannot drop database in production');
    }

    try {
      await mongoose.connection.dropDatabase();
      logger.warn('Database dropped successfully');
    } catch (error) {
      logger.error('Error dropping database:', error);
      throw error;
    }
  }

  /**
   * Backup database
   */
  async backupDatabase() {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is required');
    }

    const backupDir = path.resolve(__dirname, '../../backups');
    fs.mkdirSync(backupDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `backup-${timestamp}.gz`);

    try {
      const { stderr } = await execFileAsync('mongodump', [
        `--uri=${process.env.MONGODB_URI}`,
        `--archive=${backupPath}`,
        '--gzip'
      ]);

      if (stderr) {
        logger.info('Backup output:', stderr);
      }

      logger.info(`Database backup created: ${backupPath}`);
      return { success: true, path: backupPath };
    } catch (error) {
      logger.error('Error backing up database:', error);
      throw error;
    }
  }

  /**
   * Restore database from backup
   */
  async restoreDatabase(backupPath) {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is required');
    }

    try {
      const { stderr } = await execFileAsync('mongorestore', [
        `--uri=${process.env.MONGODB_URI}`,
        `--archive=${path.resolve(backupPath)}`,
        '--gzip',
        '--drop'
      ]);

      if (stderr) {
        logger.info('Restore output:', stderr);
      }

      logger.info(`Database restored from: ${backupPath}`);
      return { success: true };
    } catch (error) {
      logger.error('Error restoring database:', error);
      throw error;
    }
  }
}

module.exports = new Database();
