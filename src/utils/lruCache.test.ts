import { describe, expect, it } from 'vitest';
import { BoundedLruCache } from './lruCache';

describe('BoundedLruCache', () => {
  it('throws RangeError if limit is less than 1', () => {
    expect(() => new BoundedLruCache(0)).toThrow(RangeError);
    expect(() => new BoundedLruCache(-5)).toThrow(RangeError);
  });

  it('stores and retrieves items within capacity', () => {
    const cache = new BoundedLruCache<string, number>(3);
    cache.set('a', 1);
    cache.set('b', 2);

    expect(cache.size).toBe(2);
    expect(cache.get('a')).toBe(1);
    expect(cache.get('b')).toBe(2);
    expect(cache.has('a')).toBe(true);
    expect(cache.has('c')).toBe(false);
  });

  it('evicts least recently used item when capacity is exceeded on set', () => {
    const cache = new BoundedLruCache<string, number>(3);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);

    // Cache is full: a (oldest), b, c (newest)
    // Inserting d should evict a
    cache.set('d', 4);

    expect(cache.size).toBe(3);
    expect(cache.has('a')).toBe(false);
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe(2);
    expect(cache.get('c')).toBe(3);
    expect(cache.get('d')).toBe(4);
  });

  it('refreshes recency on get', () => {
    const cache = new BoundedLruCache<string, number>(3);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);

    // Access 'a' so 'b' becomes the oldest
    expect(cache.get('a')).toBe(1);

    // Inserting 'd' should evict 'b' (not 'a')
    cache.set('d', 4);

    expect(cache.has('b')).toBe(false);
    expect(cache.has('a')).toBe(true);
    expect(cache.has('c')).toBe(true);
    expect(cache.has('d')).toBe(true);
  });

  it('refreshes recency when updating an existing key via set', () => {
    const cache = new BoundedLruCache<string, number>(3);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);

    // Update 'a' so 'b' becomes the oldest
    cache.set('a', 10);

    // Inserting 'd' should evict 'b'
    cache.set('d', 4);

    expect(cache.has('b')).toBe(false);
    expect(cache.get('a')).toBe(10);
    expect(cache.has('c')).toBe(true);
    expect(cache.has('d')).toBe(true);
  });

  it('supports delete, clear, keys, values, and iteration', () => {
    const cache = new BoundedLruCache<string, string>(2);
    cache.set('k1', 'v1');
    cache.set('k2', 'v2');

    expect(cache.delete('k1')).toBe(true);
    expect(cache.delete('k1')).toBe(false);
    expect(cache.size).toBe(1);

    cache.set('k3', 'v3');
    expect(Array.from(cache.keys())).toEqual(['k2', 'k3']);
    expect(Array.from(cache.values())).toEqual(['v2', 'v3']);
    expect(Array.from(cache)).toEqual([
      ['k2', 'v2'],
      ['k3', 'v3'],
    ]);

    cache.clear();
    expect(cache.size).toBe(0);
    expect(cache.get('k2')).toBeUndefined();
    expect(Array.from(cache.keys())).toEqual([]);
  });
});
