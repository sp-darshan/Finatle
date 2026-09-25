import Redis from 'ioredis';
import { ENV } from '../config/env';

/**
 * High-Performance Dual-Tier Cache Service (Redis + In-Memory L1 Cache)
 * Provides sub-millisecond retrieval of user summaries, accounts, and financial records
 * with instantaneous cache invalidation upon any mutation.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class CacheService {
  private memoryStore = new Map<string, CacheEntry<any>>();
  private redisClient: Redis | null = null;
  private isRedisConnected = false;
  private defaultTTL = 60; // 60 seconds default TTL in seconds

  constructor() {
    this.initRedis();
  }

  private initRedis() {
    try {
      const redisUrl = ENV.REDIS_URL;
      if (redisUrl) {
        this.redisClient = new Redis(redisUrl, {
          maxRetriesPerRequest: 1,
          connectTimeout: 2000,
          lazyConnect: true,
          retryStrategy(times) {
            // Backoff exponentially up to 10s
            return Math.min(times * 200, 10000);
          },
        });

        this.redisClient.on('connect', () => {
          this.isRedisConnected = true;
          console.log('[Cache] Redis connected successfully.');
        });

        this.redisClient.on('error', (err) => {
          this.isRedisConnected = false;
          // Silent non-blocking fallback
        });

        this.redisClient.connect().catch(() => {
          this.isRedisConnected = false;
        });
      }
    } catch {
      this.isRedisConnected = false;
    }
  }

  /**
   * Get cached item by key
   */
  async get<T>(key: string): Promise<T | null> {
    // 1. Try In-Memory L1 Cache (instant 0ms)
    const entry = this.memoryStore.get(key);
    if (entry) {
      if (Date.now() > entry.expiresAt) {
        this.memoryStore.delete(key);
      } else {
        return entry.value as T;
      }
    }

    // 2. Try Redis L2 Cache if connected
    if (this.isRedisConnected && this.redisClient) {
      try {
        const raw = await this.redisClient.get(key);
        if (raw) {
          const parsed = JSON.parse(raw) as T;
          // Populate L1 cache for subsequent fast reads
          this.memoryStore.set(key, {
            value: parsed,
            expiresAt: Date.now() + this.defaultTTL * 1000,
          });
          return parsed;
        }
      } catch {
        // Fall through
      }
    }

    return null;
  }

  /**
   * Set item in cache with TTL (in seconds)
   */
  async set<T>(key: string, value: T, ttlSec: number = this.defaultTTL): Promise<void> {
    // 1. Write to L1 Memory Cache
    this.memoryStore.set(key, {
      value,
      expiresAt: Date.now() + ttlSec * 1000,
    });

    // 2. Write to Redis if connected
    if (this.isRedisConnected && this.redisClient) {
      try {
        await this.redisClient.set(key, JSON.stringify(value), 'EX', ttlSec);
      } catch {
        // Ignore redis write failure
      }
    }
  }

  /**
   * Delete specific key from cache
   */
  async delete(key: string): Promise<void> {
    this.memoryStore.delete(key);
    if (this.isRedisConnected && this.redisClient) {
      try {
        await this.redisClient.del(key);
      } catch {
        // Ignore
      }
    }
  }

  /**
   * Invalidate all keys matching a prefix or pattern (e.g. `finance:${userId}`)
   */
  async invalidatePattern(prefix: string): Promise<void> {
    // Invalidate L1 memory store
    for (const key of this.memoryStore.keys()) {
      if (key.startsWith(prefix)) {
        this.memoryStore.delete(key);
      }
    }

    // Invalidate Redis keys matching prefix
    if (this.isRedisConnected && this.redisClient) {
      try {
        const keys = await this.redisClient.keys(`${prefix}*`);
        if (keys.length > 0) {
          await this.redisClient.del(...keys);
        }
      } catch {
        // Ignore
      }
    }
  }

  /**
   * Invalidate all finance and accounts data for a specific user
   */
  async invalidateUserFinance(userId: string): Promise<void> {
    if (!userId) return;
    await this.invalidatePattern(`finance:${userId}`);
    await this.delete(`accounts:${userId}`);
    await this.delete(`user:profile:${userId}`);
  }
}

export const cacheService = new CacheService();

