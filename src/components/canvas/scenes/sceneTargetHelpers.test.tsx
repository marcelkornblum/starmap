import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement, type ReactNode } from 'react';
import { renderHook } from '@testing-library/react';
import * as useSearchCorpusHook from '../../../hooks/useSearchCorpus';
import * as useSystemDataHook from '../../../hooks/useSystemData';
import { SpatialEntityStoreContext } from '../entity/SpatialEntityContext';
import { createSpatialEntityStore } from '../entity/SpatialEntityStore';
import {
  useResolvedPlanetaryEntitiesAndTarget,
  useResolvedSystemEntitiesAndTarget,
} from './sceneTargetHelpers';

describe('sceneTargetHelpers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves system entities and target coordinates from explicit system and corpus matches', () => {
    vi.spyOn(useSearchCorpusHook, 'useSearchCorpus').mockReturnValue({
      corpus: [
        {
          i: 'alpha-centauri',
          k: 1,
          n: 'Alpha Centauri',
          s: 'alpha-centauri',
          m: [0, 'G2V', 1],
        },
        {
          i: 'proxima-b',
          k: 2,
          n: 'Proxima b',
          s: 'alpha-centauri',
          u: 'terrestrial',
          A: 0.05,
        },
      ],
      isLoading: false,
    });
    vi.spyOn(useSystemDataHook, 'useSystemData').mockReturnValue({
      systemSummary: undefined,
      systemDetail: undefined,
      focusedDetail: undefined,
      isLoading: false,
    });

    const outerStore = createSpatialEntityStore();
    outerStore.getState().setSelectedIds(['proxima-b']);
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(SpatialEntityStoreContext.Provider, { value: outerStore }, children);

    const { result } = renderHook(
      () =>
        useResolvedSystemEntitiesAndTarget(
          'alpha-centauri',
          undefined,
          'proxima-b',
          undefined,
        ),
      { wrapper },
    );

    expect(result.current.entities.map((e) => e.id)).toEqual([
      'alpha-centauri',
      'proxima-b',
    ]);
    expect(result.current.targetCoords).not.toEqual([0, 0, 0]);
  });

  it('derives planetary resolvedClassification from corpusReticleClassification and systemDetail', () => {
    vi.spyOn(useSearchCorpusHook, 'useSearchCorpus').mockReturnValue({
      corpus: [
        {
          i: 'jupiter',
          k: 2,
          n: 'Jupiter',
          s: 'sol',
          u: 'gas-giant',
        },
      ],
      isLoading: false,
    });
    vi.spyOn(useSystemDataHook, 'useSystemData').mockReturnValue({
      systemSummary: undefined,
      systemDetail: {
        kind: 'system',
        record: {
          id: 'sol',
          name: 'Sol',
          x: 0,
          y: 0,
          z: 0,
          dist: 0,
          sectorId: 'sector_0_0_0',
          stars: [],
          planets: [
            {
              id: 'jupiter',
              name: 'Jupiter',
              letter: 'e',
              composition: 'gas-giant',
              satellites: [
                {
                  id: 'europa',
                  name: 'Europa',
                  parentId: 'jupiter',
                  composition: 'terrestrial',
                  orbit: {
                    semiMajorAxis: 9.4,
                    eccentricity: 0.009,
                    inclination: 0.47,
                    ascendingNode: 219,
                    argumentOfPeriapsis: 88,
                    meanAnomaly: 171,
                    periodDays: 3.55,
                  },
                },
              ],
            },
          ],
        },
      },
      focusedDetail: undefined,
      isLoading: false,
    });

    const { result } = renderHook(() =>
      useResolvedPlanetaryEntitiesAndTarget({
        planetId: 'jupiter',
        planetName: 'Jupiter',
      }),
    );

    expect(result.current.resolvedName).toBe('Jupiter');
    expect(result.current.resolvedClassification).toBe('gas-giant');
    expect(result.current.allEntities.map((e) => e.id)).toEqual(['jupiter', 'europa']);
    expect(result.current.allEntities[0]?.classification).toBe('gas-giant');
  });

  it('uses corpusReticleClassification when systemDetail is still loading', () => {
    vi.spyOn(useSearchCorpusHook, 'useSearchCorpus').mockReturnValue({
      corpus: [
        {
          i: 'neptune',
          k: 2,
          n: 'Neptune',
          s: 'sol',
          u: 'ice-giant',
        },
      ],
      isLoading: false,
    });
    vi.spyOn(useSystemDataHook, 'useSystemData').mockReturnValue({
      systemSummary: undefined,
      systemDetail: undefined,
      focusedDetail: undefined,
      isLoading: true,
    });

    const { result } = renderHook(() =>
      useResolvedPlanetaryEntitiesAndTarget({
        planetId: 'neptune',
        planetName: 'Neptune',
      }),
    );

    expect(result.current.resolvedClassification).toBe('ice-giant');
    expect(result.current.allEntities[0]?.classification).toBe('ice-giant');
  });
});
