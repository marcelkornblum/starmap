import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGalaxyPanels, type UseGalaxyPanelsParams } from './useGalaxyPanels';
import {
  clearDetailsRepositoryCache,
  seedDetailRecord,
  seedSummaryNode,
} from '../data/detailsRepository';
import type { SystemManifest, SystemSummaryNode } from '../types/astro';
import type { GalacticInstrumentApertureResult } from '../services/details/detailsNavigationTypes';

const TAU_CETI_FIXTURE: SystemManifest = {
  id: 'gaia-2452378776434477184',
  name: 'Tau Ceti',
  x: 3.156,
  y: 1.54,
  z: -1.003,
  dist: 3.65,
  sectorId: 'sector_+000_+000_-025',
  stars: [
    {
      id: '2452378776434477184-A',
      name: 'Tau Ceti',
      componentDesignation: 'A',
      spectralType: 'G8V',
      mag: 3.5,
      absmag: 5.68,
      massMsun: 0.783,
      radiusRsun: 0.793,
      luminosityLsun: 0.52,
      effectiveTempK: 5344,
    },
  ],
  planets: [
    {
      id: 'tau-ceti-e',
      name: 'Tau Ceti e',
      letter: 'e',
      massMearth: 3.93,
      radiusRearth: 1.81,
      equilibriumTempK: 282,
      surfaceGravityG: 1.2,
      composition: 'super-earth',
      isHabitableCandidate: true,
      orbit: {
        semiMajorAxis: 0.538,
        periodDays: 162.87,
        eccentricity: 0.18,
        inclination: 0,
        ascendingNode: 0,
        argumentOfPeriapsis: 22.3,
        meanAnomaly: 0,
      },
    },
  ],
};

const TAU_CETI_SUMMARY: SystemSummaryNode = {
  id: 'tau-ceti',
  name: 'Tau Ceti',
  x: 3.156,
  y: 1.54,
  z: -1.003,
  dist: 3.65,
  mag: 3.5,
  absmag: 5.68,
  spect: 'G8V',
  starCount: 1,
  planetCount: 1,
  hasHabitableCandidate: true,
  sectorId: 'sector_+000_+000_-025',
};

const dummyAperture: GalacticInstrumentApertureResult = {
  centerId: 'sol',
  centerName: 'Sol',
  centerCoordinatesPc: [0, 0, 0],
  rawAperturePc: 50,
  apertureRadiusPc: 50,
  apertureRadiusLy: 163,
  apertureIds: new Set<string>(),
  systemsById: new Map(),
};

describe('useGalaxyPanels', () => {
  beforeEach(() => {
    clearDetailsRepositoryCache();
  });

  const baseParams: UseGalaxyPanelsParams = {
    focusedEntity: null,
    apertureCorpus: [],
    targetSystemId: '',
    urlFocusSlug: null,
    hasExplicitFocus: false,
    pathname: '/galaxy',
    search: '',
    activeCorpus: [],
    loadedLayers: [],
    layerParam: null,
    cameraState: {},
    centerEntity: null,
    selectedEntities: [],
    instrumentAperture: dummyAperture,
  };

  it('computes empty panels safely when no entity is focused', async () => {
    let hookResult!: ReturnType<typeof renderHook<ReturnType<typeof useGalaxyPanels>, unknown>>;
    await act(async () => {
      hookResult = renderHook(() => useGalaxyPanels(baseParams));
    });

    expect(hookResult.result.current.focusedDetails).toBeNull();
    expect(hookResult.result.current.focusedPreview).toBeNull();
    expect(hookResult.result.current.galaxyBodies.systems).toEqual([]);
    expect(hookResult.result.current.activeJourney).toBeNull();
    expect(hookResult.result.current.orbitalSchematic).toBeNull();
    expect(hookResult.result.current.activeLayerCard).toBeNull();
  });

  it('resolves focusedDetails and preview when system is focused and cached', async () => {
    seedDetailRecord('tau-ceti', { kind: 'system', record: TAU_CETI_FIXTURE });
    seedSummaryNode('tau-ceti', TAU_CETI_SUMMARY);

    let hookResult!: ReturnType<typeof renderHook<ReturnType<typeof useGalaxyPanels>, unknown>>;
    await act(async () => {
      hookResult = renderHook(() =>
        useGalaxyPanels({
          ...baseParams,
          targetSystemId: 'tau-ceti',
          focusedEntity: {
            id: 'tau-ceti',
            name: 'Tau Ceti',
            classification: 'stellar-system',
            position: [3.156, 1.54, -1.003],
          },
          hasExplicitFocus: true,
        }),
      );
    });

    expect(hookResult.result.current.focusedDetails).toBeTruthy();
    expect(hookResult.result.current.focusedDetails?.id).toBe('tau-ceti');
    expect(hookResult.result.current.focusedPreview).toBeTruthy();
    expect(hookResult.result.current.minimapOrientation).toBeTruthy();
  });

  it('builds activeJourney when route query is supplied', async () => {
    let hookResult!: ReturnType<typeof renderHook<ReturnType<typeof useGalaxyPanels>, unknown>>;
    await act(async () => {
      hookResult = renderHook(() =>
        useGalaxyPanels({
          ...baseParams,
          route: 'sol,tau-ceti',
        }),
      );
    });

    expect(hookResult.result.current.routeStops).toEqual(['sol', 'tau-ceti']);
    expect(hookResult.result.current.activeJourney).toBeTruthy();
    expect(hookResult.result.current.activeJourney?.steps.length).toBe(1);
  });
});
