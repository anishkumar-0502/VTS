const redis = require('redis');
const logger = require('../utils/logger');

class CacheService {
  constructor() {
    this.client = null;
    this.defaultTTL = 300;
    this.initialized = false;
  }

  async initialize() {
    try {
      this.client = redis.createClient({
        socket: {
          host: process.env.REDIS_HOST || '192.168.0.43',
          port: process.env.REDIS_PORT || 6379,
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              logger.loggerError('Redis reconnection failed after 10 attempts');
              return new Error('Redis max retries exceeded');
            }
            return retries * 100;
          }
        }
      });

      this.client.on('error', (err) => {
        logger.loggerError(`Redis client error: ${err.message}`);
      });

      this.client.on('connect', () => {
        logger.loggerInfo('Redis client connected');
      });

      await this.client.connect();
      this.initialized = true;
      logger.loggerInfo('Redis cache service initialized');
    } catch (error) {
      logger.loggerError(`Failed to initialize Redis: ${error.message}`);
      this.initialized = false;
    }
  }

  async set(key, value, ttl = this.defaultTTL) {
    if (!this.initialized || !this.client) {
      logger.loggerWarn(`Cache set skipped (not initialized): ${key}`);
      return false;
    }

    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await this.client.setEx(key, ttl, serialized);
      } else {
        await this.client.set(key, serialized);
      }
      logger.loggerDebug(`Cache set: ${key} (TTL: ${ttl}s)`);
      return true;
    } catch (error) {
      logger.loggerError(`Cache set error for ${key}: ${error.message}`);
      return false;
    }
  }

  async get(key) {
    if (!this.initialized || !this.client) {
      logger.loggerWarn(`Cache get skipped (not initialized): ${key}`);
      return null;
    }

    try {
      const cached = await this.client.get(key);
      if (cached) {
        logger.loggerDebug(`Cache hit: ${key}`);
        return JSON.parse(cached);
      }
      logger.loggerDebug(`Cache miss: ${key}`);
      return null;
    } catch (error) {
      logger.loggerError(`Cache get error for ${key}: ${error.message}`);
      return null;
    }
  }

  async delete(key) {
    if (!this.initialized || !this.client) {
      logger.loggerWarn(`Cache delete skipped (not initialized): ${key}`);
      return false;
    }

    try {
      await this.client.del(key);
      logger.loggerDebug(`Cache deleted: ${key}`);
      return true;
    } catch (error) {
      logger.loggerError(`Cache delete error for ${key}: ${error.message}`);
      return false;
    }
  }

  async clear(pattern = '*') {
    if (!this.initialized || !this.client) {
      logger.loggerWarn(`Cache clear skipped (not initialized)`);
      return false;
    }

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
        logger.loggerInfo(`Cleared ${keys.length} cache keys with pattern: ${pattern}`);
      }
      return true;
    } catch (error) {
      logger.loggerError(`Cache clear error: ${error.message}`);
      return false;
    }
  }

  async getOrSet(key, fetchFn, ttl = this.defaultTTL) {
    if (!this.initialized || !this.client) {
      logger.loggerWarn(`Cache getOrSet using direct fetch: ${key}`);
      return await fetchFn();
    }

    try {
      const cached = await this.get(key);
      if (cached !== null) {
        return cached;
      }

      const fresh = await fetchFn();
      if (fresh !== null) {
        await this.set(key, fresh, ttl);
      }
      return fresh;
    } catch (error) {
      logger.loggerError(`Cache getOrSet error for ${key}: ${error.message}`);
      return await fetchFn();
    }
  }

  async exists(key) {
    if (!this.initialized || !this.client) {
      return false;
    }

    try {
      return (await this.client.exists(key)) === 1;
    } catch (error) {
      logger.loggerError(`Cache exists error for ${key}: ${error.message}`);
      return false;
    }
  }

  async increment(key, value = 1) {
    if (!this.initialized || !this.client) {
      logger.loggerWarn(`Cache increment skipped (not initialized): ${key}`);
      return null;
    }

    try {
      const result = await this.client.incrBy(key, value);
      logger.loggerDebug(`Cache incremented: ${key} by ${value}`);
      return result;
    } catch (error) {
      logger.loggerError(`Cache increment error for ${key}: ${error.message}`);
      return null;
    }
  }

  async decrement(key, value = 1) {
    if (!this.initialized || !this.client) {
      logger.loggerWarn(`Cache decrement skipped (not initialized): ${key}`);
      return null;
    }

    try {
      const result = await this.client.decrBy(key, value);
      logger.loggerDebug(`Cache decremented: ${key} by ${value}`);
      return result;
    } catch (error) {
      logger.loggerError(`Cache decrement error for ${key}: ${error.message}`);
      return null;
    }
  }

  async setHash(key, field, value, ttl = this.defaultTTL) {
    if (!this.initialized || !this.client) {
      return false;
    }

    try {
      await this.client.hSet(key, field, JSON.stringify(value));
      if (ttl) {
        await this.client.expire(key, ttl);
      }
      logger.loggerDebug(`Cache hash set: ${key}.${field}`);
      return true;
    } catch (error) {
      logger.loggerError(`Cache hash set error for ${key}.${field}: ${error.message}`);
      return false;
    }
  }

  async getHash(key, field) {
    if (!this.initialized || !this.client) {
      return null;
    }

    try {
      const cached = await this.client.hGet(key, field);
      if (cached) {
        logger.loggerDebug(`Cache hash hit: ${key}.${field}`);
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      logger.loggerError(`Cache hash get error for ${key}.${field}: ${error.message}`);
      return null;
    }
  }

  async deleteHash(key, field) {
    if (!this.initialized || !this.client) {
      return false;
    }

    try {
      await this.client.hDel(key, field);
      logger.loggerDebug(`Cache hash deleted: ${key}.${field}`);
      return true;
    } catch (error) {
      logger.loggerError(`Cache hash delete error: ${error.message}`);
      return false;
    }
  }

  async getAllHash(key) {
    if (!this.initialized || !this.client) {
      return {};
    }

    try {
      const data = await this.client.hGetAll(key);
      const parsed = {};
      for (const [field, value] of Object.entries(data)) {
        try {
          parsed[field] = JSON.parse(value);
        } catch {
          parsed[field] = value;
        }
      }
      return parsed;
    } catch (error) {
      logger.loggerError(`Cache get all hash error for ${key}: ${error.message}`);
      return {};
    }
  }

  async pushToList(key, value, ttl = this.defaultTTL) {
    if (!this.initialized || !this.client) {
      return false;
    }

    try {
      await this.client.rPush(key, JSON.stringify(value));
      if (ttl) {
        await this.client.expire(key, ttl);
      }
      return true;
    } catch (error) {
      logger.loggerError(`Cache push to list error for ${key}: ${error.message}`);
      return false;
    }
  }

  async getList(key, start = 0, end = -1) {
    if (!this.initialized || !this.client) {
      return [];
    }

    try {
      const list = await this.client.lRange(key, start, end);
      return list.map(item => {
        try {
          return JSON.parse(item);
        } catch {
          return item;
        }
      });
    } catch (error) {
      logger.loggerError(`Cache get list error for ${key}: ${error.message}`);
      return [];
    }
  }

  async getStats() {
    if (!this.initialized || !this.client) {
      return { status: 'not initialized' };
    }

    try {
      const info = await this.client.info('stats');
      const dbSize = await this.client.dbSize();
      return {
        status: 'connected',
        info,
        dbSize
      };
    } catch (error) {
      logger.loggerError(`Cache stats error: ${error.message}`);
      return { status: 'error', error: error.message };
    }
  }

  async close() {
    if (this.client) {
      try {
        await this.client.quit();
        logger.loggerInfo('Redis cache service closed');
      } catch (error) {
        logger.loggerError(`Error closing Redis connection: ${error.message}`);
      }
    }
  }

  isInitialized() {
    return this.initialized && this.client;
  }
}

module.exports = new CacheService();
