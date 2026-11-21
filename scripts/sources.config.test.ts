import { describe, it, expect } from 'vitest';
import { DATA_SOURCES_REGISTRY, getDataSource, getDataSourcesByLayer } from './sources.config';

describe('Declarative Data Sources Registry', () => {
  it('defines all four agreed astronomical layers with valid metadata across 23 sources', () => {
    expect(DATA_SOURCES_REGISTRY.sources.length).toBe(23);
    const layers = new Set(DATA_SOURCES_REGISTRY.sources.map((s) => s.layer));
    expect(layers).toContain('stellar-neighborhood');
    expect(layers).toContain('exoplanetary-systems');
    expect(layers).toContain('galactic-structures');
    expect(layers).toContain('solar-system-bodies');
  });

  it('supports helper lookups by ID and Layer', () => {
    const hyg = getDataSource('stellar-hyg-database');
    expect(hyg?.status).toBe('integrated');
    const exoSources = getDataSourcesByLayer('exoplanetary-systems');
    expect(exoSources.length).toBeGreaterThanOrEqual(5);
  });
});
