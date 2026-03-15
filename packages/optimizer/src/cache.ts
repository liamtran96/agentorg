/**
 * Configuration for the ResponseCache.
 */
export interface ResponseCacheConfig {
  maxSize: number;
  ttlMs: number;
}

/**
 * A cached response entry.
 */
export interface CachedResponse {
  text: string;
  model: string;
}

interface CacheEntry {
  value: CachedResponse;
  createdAt: number;
}

/**
 * LRU cache for LLM responses with TTL expiration and hit-rate tracking.
 */
export class ResponseCache {
  private config: ResponseCacheConfig;
  private entries: Map<string, CacheEntry> = new Map();
  private hits: number = 0;
  private misses: number = 0;

  constructor(config: ResponseCacheConfig) {
    this.config = config;
  }

  /**
   * Store a response in the cache.
   */
  set(key: string, value: CachedResponse): void {
    // If key already exists, delete and re-insert to update insertion order
    if (this.entries.has(key)) {
      this.entries.delete(key);
    } else if (this.entries.size >= this.config.maxSize) {
      // Evict oldest (first inserted)
      const firstKey = this.entries.keys().next().value as string;
      this.entries.delete(firstKey);
    }

    this.entries.set(key, {
      value,
      createdAt: Date.now(),
    });
  }

  /**
   * Retrieve a cached response by key.
   */
  get(key: string): CachedResponse | undefined {
    const entry = this.entries.get(key);

    if (!entry) {
      this.misses++;
      return undefined;
    }

    // Check TTL
    if (Date.now() - entry.createdAt > this.config.ttlMs) {
      this.entries.delete(key);
      this.misses++;
      return undefined;
    }

    // Move to end of Map iteration order (true LRU behavior)
    this.entries.delete(key);
    this.entries.set(key, entry);

    this.hits++;
    return entry.value;
  }

  /**
   * Get the cache hit rate (0-1).
   */
  getHitRate(): number {
    const total = this.hits + this.misses;
    if (total === 0) return 0;
    return this.hits / total;
  }
}
