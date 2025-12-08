/**
 * Simple in-memory LRU cache for database query results
 * Helps reduce redundant database queries for frequently accessed data
 */

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  hits: number;
}

class QueryCache {
  private cache: Map<string, CacheEntry<any>>;
  private maxSize: number;
  private ttl: number; // Time to live in milliseconds

  constructor(maxSize = 50, ttlSeconds = 60) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttlSeconds * 1000;
  }

  /**
   * Get a value from the cache
   * @param key Cache key
   * @returns Cached value or undefined if not found or expired
   */
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return undefined;
    }

    // Check if entry has expired
    const now = Date.now();
    if (now - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    // Update hit count
    entry.hits++;
    
    return entry.value as T;
  }

  /**
   * Set a value in the cache
   * @param key Cache key
   * @param value Value to cache
   */
  set<T>(key: string, value: T): void {
    // If cache is full, remove the least recently used (LRU) entry
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      hits: 0,
    });
  }

  /**
   * Invalidate a specific cache key
   * @param key Cache key to invalidate
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalidate all cache keys matching a pattern
   * @param pattern String pattern to match (simple includes check)
   */
  invalidatePattern(pattern: string): void {
    const keysToDelete: string[] = [];
    
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    let totalHits = 0;
    let expiredCount = 0;
    const now = Date.now();

    for (const entry of this.cache.values()) {
      totalHits += entry.hits;
      if (now - entry.timestamp > this.ttl) {
        expiredCount++;
      }
    }

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      totalHits,
      expiredCount,
      hitRate: totalHits > 0 ? (totalHits / this.cache.size).toFixed(2) : '0',
    };
  }

  /**
   * Evict the least recently used entry based on hit count and age
   * Uses a scoring algorithm that balances recency and frequency
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestScore = Infinity;

    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      // Calculate score: lower score = higher priority for eviction
      // Score = hits - (age_ratio), where age_ratio is 0-1 based on TTL
      // This favors keeping frequently accessed and recent entries
      const age = now - entry.timestamp;
      const ageRatio = Math.min(1, age / this.ttl);
      const score = entry.hits - ageRatio;

      if (score < oldestScore) {
        oldestScore = score;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Helper function to wrap a database query with caching
   * @param key Cache key
   * @param queryFn Async function that executes the database query
   * @returns Cached result or fresh query result
   */
  async cached<T>(key: string, queryFn: () => Promise<T>): Promise<T> {
    // Check cache first
    const cached = this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    // Execute query and cache result
    const result = await queryFn();
    this.set(key, result);
    return result;
  }
}

// Create singleton instances for different cache types
// Separate caches for different data types to allow targeted invalidation

// Analytics cache: Caches aggregate analytics data (60s TTL)
export const analyticsCache = new QueryCache(30, 60);

// Wallet cache: Caches wallet data and balances (30s TTL)
export const walletCache = new QueryCache(20, 30);

// Transaction cache: Caches transaction lists (15s TTL)
export const transactionCache = new QueryCache(20, 15);

/**
 * Invalidate all caches related to transactions
 * Call this after adding, updating, or deleting transactions
 */
export function invalidateTransactionCaches(): void {
  const timestamp = new Date().toISOString();
  console.log(`[Cache] Invalidating all transaction caches at ${timestamp}`);
  
  const analyticsStats = analyticsCache.getStats();
  const walletStats = walletCache.getStats();
  const transactionStats = transactionCache.getStats();
  
  console.log(`[Cache] Before clear - Analytics: ${analyticsStats.size} entries, Wallet: ${walletStats.size} entries, Transaction: ${transactionStats.size} entries`);
  
  analyticsCache.clear();
  walletCache.clear();
  transactionCache.clear();
  
  console.log(`[Cache] All caches cleared successfully`);
}

/**
 * Invalidate all caches related to wallets
 * Call this after adding, updating, or deleting wallets
 */
export function invalidateWalletCaches(): void {
  walletCache.clear();
  analyticsCache.clear();
}

/**
 * Generate a cache key from function name and parameters
 * @param functionName Name of the function
 * @param params Parameters passed to the function (should be primitives)
 * @returns Cache key string
 */
export function generateCacheKey(functionName: string, ...params: any[]): string {
  const paramStr = params.map(p => {
    if (typeof p === 'object' && p !== null) {
      // For objects, use sorted keys to ensure consistent serialization
      // WARNING: Only use with small objects; avoid using with large or deeply nested objects
      const sorted = Object.keys(p).sort().reduce((acc: any, key) => {
        acc[key] = p[key];
        return acc;
      }, {});
      return JSON.stringify(sorted);
    }
    return String(p);
  }).join('|');
  
  return `${functionName}:${paramStr}`;
}
