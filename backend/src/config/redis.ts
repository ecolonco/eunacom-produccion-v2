import Redis from 'ioredis';
import { logger } from '../utils/logger';

// Redis configuration
const redisConfig: any = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
};

// Only add password if it's defined
if (process.env.REDIS_PASSWORD) {
  redisConfig.password = process.env.REDIS_PASSWORD;
}

// Create Redis instance
export const redis = new Redis(redisConfig);

// Event handlers
redis.on('connect', () => {
  logger.info('Redis connected successfully');
});

redis.on('error', (error) => {
  logger.error('Redis connection error:', error);
});

redis.on('close', () => {
  logger.warn('Redis connection closed');
});

// Cache TTL constants for dashboard metrics
export const CACHE_TTL = {
  USER_METRICS: 300, // 5 minutes
  ADMIN_AGGREGATES: 900, // 15 minutes
  SYSTEM_HEALTH: 60, // 1 minute
  CHART_DATA: 600, // 10 minutes
  RECOMMENDATIONS: 1800, // 30 minutes
} as const;

// Cache key patterns
export const CACHE_KEYS = {
  USER_METRICS: (userId: string) => `dashboard:user:${userId}:metrics`,
  USER_SPECIALTIES: (userId: string) => `dashboard:user:${userId}:specialties`,
  USER_PROGRESS: (userId: string) => `dashboard:user:${userId}:progress`,
  USER_RECOMMENDATIONS: (userId: string) => `dashboard:user:${userId}:recommendations`,
  ADMIN_PLATFORM_METRICS: 'dashboard:admin:platform:metrics',
  ADMIN_CONTENT_ANALYTICS: 'dashboard:admin:content:analytics',
  ADMIN_USER_MANAGEMENT: 'dashboard:admin:users:management',
  ADMIN_SYSTEM_HEALTH: 'dashboard:admin:system:health',
  CONTENT_ANALYTICS: (questionId: string) => `dashboard:content:${questionId}:analytics`,
} as const;

// Utility functions for caching
export class DashboardCache {
  /**
   * Get cached data with fallback to generator function
   */
  static async getOrSet<T>(
    key: string,
    ttl: number,
    generator: () => Promise<T>
  ): Promise<T> {
    try {
      const cached = await redis.get(key);
      if (cached) {
        return JSON.parse(cached);
      }

      const data = await generator();
      await redis.setex(key, ttl, JSON.stringify(data));
      return data;
    } catch (error) {
      logger.error('Cache operation failed:', error);
      // Return fresh data if cache fails
      return generator();
    }
  }

  /**
   * Set cached data with TTL
   */
  static async set(key: string, data: any, ttl: number): Promise<void> {
    try {
      await redis.setex(key, ttl, JSON.stringify(data));
    } catch (error) {
      logger.error('Cache set operation failed:', error);
    }
  }

  /**
   * Invalidate cache by pattern
   */
  static async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
        logger.info(`Invalidated ${keys.length} cache keys matching: ${pattern}`);
      }
    } catch (error) {
      logger.error('Cache invalidation failed:', error);
    }
  }

  /**
   * Invalidate user-specific cache
   */
  static async invalidateUserCache(userId: string): Promise<void> {
    await Promise.all([
      this.invalidatePattern(CACHE_KEYS.USER_METRICS(userId)),
      this.invalidatePattern(CACHE_KEYS.USER_SPECIALTIES(userId)),
      this.invalidatePattern(CACHE_KEYS.USER_PROGRESS(userId)),
      this.invalidatePattern(CACHE_KEYS.USER_RECOMMENDATIONS(userId)),
    ]);
  }

  /**
   * Invalidate admin cache
   */
  static async invalidateAdminCache(): Promise<void> {
    await Promise.all([
      this.invalidatePattern(CACHE_KEYS.ADMIN_PLATFORM_METRICS),
      this.invalidatePattern(CACHE_KEYS.ADMIN_CONTENT_ANALYTICS),
      this.invalidatePattern(CACHE_KEYS.ADMIN_USER_MANAGEMENT),
      this.invalidatePattern(CACHE_KEYS.ADMIN_SYSTEM_HEALTH),
    ]);
  }
}

// Health check function
export async function checkRedisHealth(): Promise<boolean> {
  try {
    await redis.ping();
    return true;
  } catch (error) {
    logger.error('Redis health check failed:', error);
    return false;
  }
}

// Graceful shutdown
export async function closeRedis(): Promise<void> {
  try {
    await redis.quit();
    logger.info('Redis connection closed gracefully');
  } catch (error) {
    logger.error('Error closing Redis connection:', error);
  }
}