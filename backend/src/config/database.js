const mongoose = require('mongoose');
const logger = require('../utils/logger');

class Database {
  constructor() {
    this.isConnected = false;
  }

  /**
   * Connect to MongoDB
   */
  async connect() {
    if (this.isConnected) {
      logger.info('Using existing database connection');
      return;
    }

    try {
      const options = {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        autoIndex: process.env.NODE_ENV === 'development',
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        family: 4,
        maxPoolSize: 10,
        minPoolSize: 2,
        maxIdleTimeMS: 10000,
        retryWrites: true,
        retryReads: true
      };

      const conn = await mongoose.connect(process.env.MONGODB_URI, options);
      
      this.isConnected = true;
      
      logger.info(`MongoDB Connected: ${conn.connection.host}`);

      // Handle connection events
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

      // Graceful shutdown
      process.on('SIGINT', async () => {
        await this.disconnect();
        process.exit(0);
      });

      return conn;

    } catch (error) {
      logger.error('MongoDB connection error:', error);
      throw error;
    }
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnect() {
    if (!this.isConnected) {
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
      isConnected: this.isConnected,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      name: mongoose.connection.name
    };
  }

  /**
   * Create database indexes
   */
  async createIndexes() {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const collections = await mongoose.connection.db.collections();

      for (let collection of collections) {
        await collection.createIndexes();
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
    const { exec } = require('child_process');
    const util = require('util');
    const execAsync = util.promisify(exec);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `./backups/backup-${timestamp}.gz`;
    
    try {
      const { stdout, stderr } = await execAsync(
        `mongodump --uri="${process.env.MONGODB_URI}" --archive=${backupPath} --gzip`
      );

      if (stderr) {
        logger.error('Backup stderr:', stderr);
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
    const { exec } = require('child_process');
    const util = require('util');
    const execAsync = util.promisify(exec);
    
    try {
      const { stdout, stderr } = await execAsync(
        `mongorestore --uri="${process.env.MONGODB_URI}" --archive=${backupPath} --gzip --drop`
      );

      if (stderr) {
        logger.error('Restore stderr:', stderr);
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
