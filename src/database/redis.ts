import Redis from 'ioredis';
import { createClient } from 'redis';
import { config } from '../config';
import logger from '../utils/logger';

class RedisConnection {
  public client: Redis;
  public subscriber: Redis;
  public publisher: Redis;
  public redisClient: ReturnType<typeof createClient> | null = null;

  constructor() {
    // If REDIS_URL is provided (e.g., Upstash), configure for TLS
    if (config.database.redis.url) {
      this.initializeRedisClient();
      
      // Check if using TLS (rediss://)
      const useTLS = config.database.redis.url.startsWith('rediss://');
      const ioredisConfig = useTLS
        ? {
            tls: {
              rejectUnauthorized: false, // Required for Upstash
            },
            retryStrategy: (times: number) => {
              const delay = Math.min(times * 50, 2000);
              return delay;
            },
            maxRetriesPerRequest: 3,
          }
        : {
            retryStrategy: (times: number) => {
              const delay = Math.min(times * 50, 2000);
              return delay;
            },
            maxRetriesPerRequest: 3,
          };
      
      // Initialize ioredis for backward compatibility with TLS config
      this.client = new Redis(config.database.redis.url, ioredisConfig);
      this.subscriber = new Redis(config.database.redis.url, ioredisConfig);
      this.publisher = new Redis(config.database.redis.url, ioredisConfig);
    } else {
      // Use ioredis with individual config
      const redisConfig = {
        host: config.database.redis.host,
        port: config.database.redis.port,
        password: config.database.redis.password,
        retryStrategy: (times: number) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3,
      };

      this.client = new Redis(redisConfig);
      this.subscriber = new Redis(redisConfig);
      this.publisher = new Redis(redisConfig);
    }

    this.client.on('connect', () => {
      logger.info('Redis client connected');
    });

    this.client.on('error', (err) => {
      logger.error('Redis client error', err);
    });

    this.subscriber.on('connect', () => {
      logger.info('Redis subscriber connected');
    });

    this.publisher.on('connect', () => {
      logger.info('Redis publisher connected');
    });
  }

  private async initializeRedisClient() {
    try {
      this.redisClient = createClient({
        url: config.database.redis.url,
      });

      this.redisClient.on('error', (err) => {
        logger.error('Redis URL client error', err);
      });

      this.redisClient.on('connect', () => {
        logger.info('Redis URL client connected');
      });

      await this.redisClient.connect();
    } catch (error) {
      logger.error('Failed to initialize Redis client', error);
    }
  }

  async set(key: string, value: string, expirySeconds?: number): Promise<void> {
    if (expirySeconds) {
      await this.client.setex(key, expirySeconds, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async publish(channel: string, message: string): Promise<void> {
    await this.publisher.publish(channel, message);
  }

  async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    await this.subscriber.subscribe(channel);
    this.subscriber.on('message', (ch, msg) => {
      if (ch === channel) {
        callback(msg);
      }
    });
  }

  async close(): Promise<void> {
    await this.client.quit();
    await this.subscriber.quit();
    await this.publisher.quit();
    if (this.redisClient) {
      await this.redisClient.disconnect();
    }
    logger.info('Redis connections closed');
  }
}

export const redisClient = new RedisConnection();
