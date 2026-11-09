// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSystemData } from './useSystemData';
import {
  clearDetailsRepositoryCache,
  seedDetailRecord,
  seedSummaryNode,
  type DecodedDetailRecord,
} from '../data/detailsRepository';
import type { SystemSummaryNode } from '../types/astro';

const makeSummaryNode = (id: string): SystemSummaryNode => ({
  id,
  name: `Star ${id}`,
  x: 1,
  y: 2,
  z: 3,
  dist: 3.74,
  mag: 5.5,
  absmag: 4.2,
  spect: 'G2V',
  ci: 0.65,
  starCount: 1,
  planetCount: 1,
  hasHabitableCandidate: false,
  sectorId: 'sector_0_0_0',
});

const makeSystemDetail = (id: string): DecodedDetailRecord => ({
  kind: 'system',
  record: {
    id,
    name: `System ${id}`,
    x: 1,
    y: 2,
    z: 3,
    dist: 3.74,
    sectorId: 'sector_0_0_0',
    stars: [
      {
        id,
        name: `Star ${id}`,
        componentDesignation: 'A',
        spectralType: 'G2V',
        mag: 5.5,
        absmag: 4.2,
      },
    ],
    planets: [{ id: `${id}-b`, name: `${id} b`, letter: 'b' }],
  },
});

const makePlanetDetail = (id: string): DecodedDetailRecord => ({
  kind: 'solar-body',
  record: {
    id,
    name: `Body ${id}`,
    classification: 'Planet',
    meanRadiusKm: 6371,
  },
});

describe('useSystemData (AUD-087 & DEC-R042)', () => {
  beforeEach(() => {
    clearDetailsRepositoryCache();
    vi.restoreAllMocks();
  });

  it('returns undefined details and isLoading: false when systemId is omitted', () => {
    const { result } = renderHook(() => useSystemData(null));

    expect(result.current.systemSummary).toBeUndefined();
    expect(result.current.systemDetail).toBeUndefined();
    expect(result.current.focusedDetail).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
  });

  it('resolves synchronously when system data is already cached', () => {
    seedSummaryNode('sol', makeSummaryNode('sol'));
    seedDetailRecord('sol', makeSystemDetail('sol'));

    const { result } = renderHook(() => useSystemData('sol'));

    expect(result.current.systemSummary?.id).toBe('sol');
    expect(result.current.systemDetail?.record.id).toBe('sol');
    expect(result.current.focusedDetail?.record.id).toBe('sol');
    expect(result.current.isLoading).toBe(false);
  });

  it('provides distinct focusedDetail when focusedEntityId is provided and different from systemId', () => {
    seedSummaryNode('sol', makeSummaryNode('sol'));
    seedDetailRecord('sol', makeSystemDetail('sol'));
    seedDetailRecord('earth', makePlanetDetail('earth'));

    const { result } = renderHook(() => useSystemData('sol', 'earth'));

    expect(result.current.systemSummary?.id).toBe('sol');
    expect(result.current.systemDetail?.record.id).toBe('sol');
    expect(result.current.focusedDetail?.record.id).toBe('earth');
    expect(result.current.isLoading).toBe(false);
  });

  it('updates reactively when external cache seeding occurs', () => {
    const { result } = renderHook(() => useSystemData('kepler-22', 'kepler-22-b'));

    expect(result.current.systemSummary).toBeUndefined();
    expect(result.current.systemDetail).toBeUndefined();

    act(() => {
      seedSummaryNode('kepler-22', makeSummaryNode('kepler-22'));
    });
    act(() => {
      seedDetailRecord('kepler-22', makeSystemDetail('kepler-22'));
    });
    act(() => {
      seedDetailRecord('kepler-22-b', makePlanetDetail('kepler-22-b'));
    });

    expect(result.current.systemSummary?.id).toBe('kepler-22');
    expect(result.current.systemDetail?.record.id).toBe('kepler-22');
    expect(result.current.focusedDetail?.record.id).toBe('kepler-22-b');
  });
});
