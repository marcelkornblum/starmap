import { describe, expect, it } from 'vitest';
import {
  DETAIL_BUCKET_CACHE_LIMIT,
  DETAIL_RECORD_CACHE_LIMIT,
  LAYER_ENTITY_BUCKET_CACHE_LIMIT,
  LAYER_MANIFEST_CACHE_LIMIT,
  SEARCH_SHARD_CACHE_LIMIT,
  SUMMARY_BUCKET_CACHE_LIMIT,
  SUMMARY_NODE_CACHE_LIMIT,
} from './cacheConfig';

describe('cacheConfig', () => {
  it('exports positive integer bounds for repository caches', () => {
    expect(DETAIL_RECORD_CACHE_LIMIT).toBe(100);
    expect(SUMMARY_NODE_CACHE_LIMIT).toBe(500);
    expect(SUMMARY_BUCKET_CACHE_LIMIT).toBe(36);
    expect(DETAIL_BUCKET_CACHE_LIMIT).toBe(36);
    expect(LAYER_MANIFEST_CACHE_LIMIT).toBe(200);
    expect(LAYER_ENTITY_BUCKET_CACHE_LIMIT).toBe(36);
    expect(SEARCH_SHARD_CACHE_LIMIT).toBe(50);
  });
});
