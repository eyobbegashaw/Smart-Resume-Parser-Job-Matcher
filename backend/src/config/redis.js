const Redis = require('ioredis');
const logger = require('../utils/logger');

class RedisClient {
  constructor() {
    this.client = null;
    this.subscriber = null;
    this.isConnected = false;
  }

  /**
   * Connect to Redis
   */
  async connect() {
    if (this.isConnected) {
      logger.info('Using existing Redis connection');
      return this.client;
    }

    try {
      const options = {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: true
      };

      // Create main client
      this.client = new Redis(options);

      // Create subscriber client
      this.subscriber = new Redis(options);

      // Event handlers
      this.client.on('connect', () => {
        logger.info('Redis client connecting');
      });

      this.client.on('ready', () => {
        this.isConnected = true;
        logger.info('Redis client ready');
      });

      this.client.on('error', (error) => {
        logger.error('Redis client error:', error);
        this.isConnected = false;
      });

      this.client.on('close', () => {
        logger.warn('Redis connection closed');
        this.isConnected = false;
      });

      this.client.on('reconnecting', () => {
        logger.info('Redis reconnecting');
      });

      // Wait for connection
      await this.client.connect();
      await this.subscriber.connect();

      // Test connection
      await this.client.ping();

      logger.info('Redis connected successfully');
      return this.client;

    } catch (error) {
      logger.error('Redis connection failed:', error);
      this.isConnected = false;
      return null;
    }
  }

  /**
   * Get Redis client
   */
  getClient() {
    return this.client;
  }

  /**
   * Get subscriber client
   */
  getSubscriber() {
    return this.subscriber;
  }

  /**
   * Set value
   */
  async set(key, value, ttl = null) {
    try {
      const serialized = typeof value === 'object' 
        ? JSON.stringify(value) 
        : value;

      if (ttl) {
        return await this.client.set(key, serialized, 'EX', ttl);
      }
      
      return await this.client.set(key, serialized);
    } catch (error) {
      logger.error('Redis set error:', error);
      return null;
    }
  }

  /**
   * Get value
   */
  async get(key) {
    try {
      const value = await this.client.get(key);
      
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (error) {
      logger.error('Redis get error:', error);
      return null;
    }
  }

  /**
   * Delete key
   */
  async del(key) {
    try {
      return await this.client.del(key);
    } catch (error) {
      logger.error('Redis del error:', error);
      return 0;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key) {
    try {
      return await this.client.exists(key);
    } catch (error) {
      logger.error('Redis exists error:', error);
      return false;
    }
  }

  /**
   * Set expiry
   */
  async expire(key, seconds) {
    try {
      return await this.client.expire(key, seconds);
    } catch (error) {
      logger.error('Redis expire error:', error);
      return false;
    }
  }

  /**
   * Get TTL
   */
  async ttl(key) {
    try {
      return await this.client.ttl(key);
    } catch (error) {
      logger.error('Redis ttl error:', error);
      return -2;
    }
  }

  /**
   * Increment value
   */
  async incr(key) {
    try {
      return await this.client.incr(key);
    } catch (error) {
      logger.error('Redis incr error:', error);
      return null;
    }
  }

  /**
   * Add to set
   */
  async sadd(key, ...members) {
    try {
      return await this.client.sadd(key, ...members);
    } catch (error) {
      logger.error('Redis sadd error:', error);
      return 0;
    }
  }

  /**
   * Get set members
   */
  async smembers(key) {
    try {
      return await this.client.smembers(key);
    } catch (error) {
      logger.error('Redis smembers error:', error);
      return [];
    }
  }

  /**
   * Add to sorted set
   */
  async zadd(key, score, member) {
    try {
      return await this.client.zadd(key, score, member);
    } catch (error) {
      logger.error('Redis zadd error:', error);
      return 0;
    }
  }

  /**
   * Get sorted set range
   */
  async zrange(key, start, stop) {
    try {
      return await this.client.zrange(key, start, stop);
    } catch (error) {
      logger.error('Redis zrange error:', error);
      return [];
    }
  }

  /**
   * Publish message
   */
  async publish(channel, message) {
    try {
      const serialized = typeof message === 'object'
        ? JSON.stringify(message)
        : message;
      
      return await this.client.publish(channel, serialized);
    } catch (error) {
      logger.error('Redis publish error:', error);
      return 0;
    }
  }

  /**
   * Subscribe to channel
   */
  async subscribe(channel, callback) {
    try {
      await this.subscriber.subscribe(channel);
      
      this.subscriber.on('message', (ch, message) => {
        if (ch === channel) {
          try {
            const parsed = JSON.parse(message);
            callback(parsed);
          } catch {
            callback(message);
          }
        }
      });

      return true;
    } catch (error) {
      logger.error('Redis subscribe error:', error);
      return false;
    }
  }

  /**
   * Unsubscribe from channel
   */
  async unsubscribe(channel) {
    try {
      return await this.subscriber.unsubscribe(channel);
    } catch (error) {
      logger.error('Redis unsubscribe error:', error);
      return false;
    }
  }

  /**
   * Get cache or set if not exists
   */
  async remember(key, ttl, callback) {
    try {
      // Try to get from cache
      const cached = await this.get(key);
      
      if (cached !== null) {
        return cached;
      }

      // Execute callback and cache result
      const value = await callback();
      
      await this.set(key, value, ttl);
      
      return value;
    } catch (error) {
      logger.error('Redis remember error:', error);
      return callback(); // Fallback to callback
    }
  }

  /**
   * Flush all keys
   */
  async flushall() {
    if (process.env.NODE_ENV !== 'development') {
      throw new Error('Cannot flush Redis in production');
    }

    try {
      return await this.client.flushall();
    } catch (error) {
      logger.error('Redis flushall error:', error);
      return false;
    }
  }

  /**
   * Get Redis info
   */
  async getInfo() {
    try {
      const info = await this.client.info();
      return info;
    } catch (error) {
      logger.error('Redis info error:', error);
      return null;
    }
  }

  /**
   * Disconnect
   */
  async disconnect() {
    try {
      await this.client.quit();
      await this.subscriber.quit();
      this.isConnected = false;
      logger.info('Redis disconnected');
    } catch (error) {
      logger.error('Redis disconnect error:', error);
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const ping = await this.client.ping();
      return ping === 'PONG';
    } catch (error) {
      return false;
    }
  }
}

module.exports = new RedisClient();