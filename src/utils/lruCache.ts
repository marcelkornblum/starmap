/**
 * Bounded Least Recently Used (LRU) Cache (AUD-090 & DEC-R043).
 *
 * Provides a Map-like key-value storage structure with bounded capacity.
 * When the size limit is exceeded during an insertion, the least recently used
 * entry is evicted immediately.
 */
export class BoundedLruCache<K, V> {
  private readonly items = new Map<K, V>();
  readonly limit: number;

  constructor(limit: number) {
    if (!Number.isFinite(limit) || limit < 1) {
      throw new RangeError(`Cache limit must be a positive number, got ${limit}`);
    }
    this.limit = Math.floor(limit);
  }

  get(key: K): V | undefined {
    if (!this.items.has(key)) {
      return undefined;
    }
    const value = this.items.get(key)!;
    this.items.delete(key);
    this.items.set(key, value);
    return value;
  }

  set(key: K, value: V): this {
    if (this.items.has(key)) {
      this.items.delete(key);
    } else if (this.items.size >= this.limit) {
      const oldestKey = this.items.keys().next().value;
      if (oldestKey !== undefined) {
        this.items.delete(oldestKey);
      }
    }
    this.items.set(key, value);
    return this;
  }

  has(key: K): boolean {
    return this.items.has(key);
  }

  delete(key: K): boolean {
    return this.items.delete(key);
  }

  clear(): void {
    this.items.clear();
  }

  get size(): number {
    return this.items.size;
  }

  keys(): IterableIterator<K> {
    return this.items.keys();
  }

  values(): IterableIterator<V> {
    return this.items.values();
  }

  entries(): IterableIterator<[K, V]> {
    return this.items.entries();
  }

  [Symbol.iterator](): IterableIterator<[K, V]> {
    return this.items[Symbol.iterator]();
  }
}
