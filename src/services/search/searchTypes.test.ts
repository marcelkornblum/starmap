import { describe, expect, it } from 'vitest';
import {
  isSearchCategoryFilter,
  normalizeSearchCategoryFilter,
} from './searchTypes';

describe('searchTypes', () => {
  it('validates search category filters correctly', () => {
    expect(isSearchCategoryFilter('all')).toBe(true);
    expect(isSearchCategoryFilter('stars')).toBe(true);
    expect(isSearchCategoryFilter('planets')).toBe(true);
    expect(isSearchCategoryFilter('structures')).toBe(true);
    expect(isSearchCategoryFilter('minor-bodies')).toBe(true);
    expect(isSearchCategoryFilter('layers')).toBe(true);
    expect(isSearchCategoryFilter('invalid')).toBe(false);
    expect(isSearchCategoryFilter(null)).toBe(false);
    expect(isSearchCategoryFilter(123)).toBe(false);
    expect(isSearchCategoryFilter(undefined)).toBe(false);
  });

  it('normalises search category filter', () => {
    expect(normalizeSearchCategoryFilter('stars')).toBe('stars');
    expect(normalizeSearchCategoryFilter('all')).toBe('all');
  });
});
