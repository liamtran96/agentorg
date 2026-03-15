import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ResponseCache } from '@agentorg/optimizer';

describe('ResponseCache', () => {
  let cache: ResponseCache;

  beforeEach(() => {
    vi.useFakeTimers();
    cache = new ResponseCache({ maxSize: 3, ttlMs: 60_000 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should cache a response', () => {
    cache.set('prompt:hello', { text: 'Hello there!', model: 'haiku' });

    const result = cache.get('prompt:hello');
    expect(result).toBeDefined();
    expect(result!.text).toBe('Hello there!');
  });

  it('should return cached response on exact key match', () => {
    cache.set('prompt:weather', { text: 'It is sunny', model: 'haiku' });

    const hit1 = cache.get('prompt:weather');
    const hit2 = cache.get('prompt:weather');

    expect(hit1).toEqual(hit2);
    expect(hit1!.text).toBe('It is sunny');
  });

  it('should return undefined for cache miss', () => {
    const result = cache.get('nonexistent');
    expect(result).toBeUndefined();
  });

  it('should respect TTL expiration', () => {
    cache.set('prompt:temp', { text: 'Temporary response', model: 'haiku' });

    // Still valid before TTL
    vi.advanceTimersByTime(30_000);
    expect(cache.get('prompt:temp')).toBeDefined();

    // Expired after TTL
    vi.advanceTimersByTime(31_000);
    expect(cache.get('prompt:temp')).toBeUndefined();
  });

  it('should track cache hit rate', () => {
    cache.set('key1', { text: 'response1', model: 'haiku' });

    // 2 hits, 1 miss = 66.67% hit rate
    cache.get('key1'); // hit
    cache.get('key1'); // hit
    cache.get('key2'); // miss

    const hitRate = cache.getHitRate();
    expect(hitRate).toBeCloseTo(2 / 3, 2);
  });

  it('should return 0 hit rate with no lookups', () => {
    expect(cache.getHitRate()).toBe(0);
  });

  it('should evict oldest entries when full', () => {
    cache.set('key1', { text: 'first', model: 'haiku' });
    cache.set('key2', { text: 'second', model: 'haiku' });
    cache.set('key3', { text: 'third', model: 'haiku' });

    // Cache is full (maxSize: 3), adding a 4th should evict the oldest
    cache.set('key4', { text: 'fourth', model: 'haiku' });

    expect(cache.get('key1')).toBeUndefined(); // evicted
    expect(cache.get('key4')).toBeDefined();
    expect(cache.get('key4')!.text).toBe('fourth');
  });

  it('should overwrite existing key without increasing size', () => {
    cache.set('key1', { text: 'v1', model: 'haiku' });
    cache.set('key2', { text: 'v1', model: 'haiku' });
    cache.set('key3', { text: 'v1', model: 'haiku' });

    // Update existing key — should not trigger eviction
    cache.set('key1', { text: 'v2', model: 'haiku' });

    expect(cache.get('key1')!.text).toBe('v2');
    expect(cache.get('key2')).toBeDefined();
    expect(cache.get('key3')).toBeDefined();
  });
});
