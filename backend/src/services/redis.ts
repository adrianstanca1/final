import Redis from 'redis';
import { config } from '../config/environment';
import { logger } from '../utils/logger';

class RedisService {
  private client: Redis.RedisClientType | null = null;
  private _isReady = false;

  get isReady(): boolean {
    return this._isReady;
  }

  async connect(): Promise<void> {
    try {
      this.client = Redis.createClient({
        url: config.REDIS_URL,
        retry_unfulfilled_commands: true,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              logger.error('Redis: Maximum reconnection attempts reached');
              return false;
            }
            return Math.min(retries * 50, 1000);
          },
        },
      });

      this.client.on('error', (err) => {
        logger.error('Redis Client Error:', err);
        this._isReady = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis Client connecting...');
      });

      this.client.on('ready', () => {
        logger.info('Redis Client ready');
        this._isReady = true;
      });

      this.client.on('reconnecting', () => {
        logger.info('Redis Client reconnecting...');
        this._isReady = false;
      });

      this.client.on('end', () => {
        logger.info('Redis Client connection ended');
        this._isReady = false;
      });

      await this.client.connect();
      
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      this._isReady = false;
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this._isReady = false;
      logger.info('Redis disconnected');
    }
  }

  // Cache operations
  async get<T>(key: string): Promise<T | null> {
    if (!this.client || !this._isReady) {
      logger.warn('Redis not ready, cache miss for key:', key);
      return null;
    }

    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Redis GET error:', { key, error });
      return null;
    }
  }

  async set<T>(key: string, value: T, expireInSeconds?: number): Promise<boolean> {
    if (!this.client || !this._isReady) {
      logger.warn('Redis not ready, cannot set key:', key);
      return false;
    }

    try {
      const stringValue = JSON.stringify(value);
      
      if (expireInSeconds) {
        await this.client.setEx(key, expireInSeconds, stringValue);
      } else {
        await this.client.set(key, stringValue);
      }
      
      return true;
    } catch (error) {
      logger.error('Redis SET error:', { key, error });
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    if (!this.client || !this._isReady) {
      return false;
    }

    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error('Redis DEL error:', { key, error });
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.client || !this._isReady) {
      return false;
    }

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Redis EXISTS error:', { key, error });
      return false;
    }
  }

  // Session operations
  async getSession(sessionId: string): Promise<any> {
    return this.get(`session:${sessionId}`);
  }

  async setSession(sessionId: string, data: any, expireInSeconds = 86400): Promise<boolean> {
    return this.set(`session:${sessionId}`, data, expireInSeconds);
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    return this.del(`session:${sessionId}`);
  }

  // Rate limiting
  async checkRateLimit(key: string, limit: number, windowMs: number): Promise<{ allowed: boolean; remaining: number }> {
    if (!this.client || !this._isReady) {
      return { allowed: true, remaining: limit - 1 };
    }

    try {
      const multi = this.client.multi();
      const windowStart = Math.floor(Date.now() / windowMs) * windowMs;
      const rateLimitKey = `rate_limit:${key}:${windowStart}`;

      multi.incr(rateLimitKey);
      multi.expire(rateLimitKey, Math.ceil(windowMs / 1000));
      
      const results = await multi.exec();
      const currentCount = results?.[0] as number || 0;

      return {
        allowed: currentCount <= limit,
        remaining: Math.max(0, limit - currentCount),
      };
    } catch (error) {
      logger.error('Redis rate limit check error:', { key, error });
      return { allowed: true, remaining: limit - 1 };
    }
  }

  // Health check
  async healthCheck(): Promise<{ status: string; latency?: number }> {
    if (!this.client || !this._isReady) {
      return { status: 'disconnected' };
    }

    try {
      const startTime = Date.now();
      await this.client.ping();
      const latency = Date.now() - startTime;
      
      return { status: 'healthy', latency };
    } catch (error) {
      logger.error('Redis health check failed:', error);
      return { status: 'unhealthy' };
    }
  }
}

export const redisClient = new RedisService();