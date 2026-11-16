import { describe, expect, it } from 'vitest';
import {
  isCatalogTag,
  KNOWN_SYSTEM_TAGS,
  normaliseTagKey,
  QUERY_CLEAN_KEY_TO_TAG_SLUG,
  toTagSlug,
} from './searchTagDefinitions';

describe('searchTagDefinitions', () => {
  it('converts PascalCase or tagged strings to kebab-case slugs', () => {
    expect(toTagSlug('HabitableCandidate')).toBe('habitable-candidate');
    expect(toTagSlug('tag:SolarNeighborhood10pc')).toBe('solar-neighborhood-10pc');
    expect(toTagSlug('ExoplanetHost')).toBe('exoplanet-host');
  });

  it('validates catalog tags', () => {
    expect(isCatalogTag('habitable-candidate')).toBe(true);
    expect(isCatalogTag('HabitableCandidate')).toBe(true);
    expect(isCatalogTag('tag:NakedEye')).toBe(true);
    expect(isCatalogTag('unknown-tag')).toBe(false);
    expect(isCatalogTag('')).toBe(false);
  });

  it('normalises tag keys', () => {
    expect(normaliseTagKey('tag:Habitable-Candidate')).toBe('habitablecandidate');
    expect(normaliseTagKey('Solar_Neighborhood_10pc')).toBe('solarneighborhood10pc');
  });

  it('exposes tag dictionary mappings and known system tags', () => {
    expect(KNOWN_SYSTEM_TAGS).toContain('HomeSystem');
    expect(KNOWN_SYSTEM_TAGS).toContain('HabitableCandidate');
    expect(QUERY_CLEAN_KEY_TO_TAG_SLUG['habitable']).toBe('habitable-candidate');
    expect(QUERY_CLEAN_KEY_TO_TAG_SLUG['nakedeye']).toBe('naked-eye');
  });
});
