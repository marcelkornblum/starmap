import { describe, it, expect, vi } from 'vitest';
import ReactThreeTest from '@react-three/test-renderer';
import * as THREE from 'three';
import { SystemScene, type StarDossierData } from './SystemScene';
import { resolveSystemPlanetEntity, resolveCorpusPlanetEntity } from './systemPlanetResolver';
import { resolveTargetCoordsFromEntities } from './planetaryEntityResolver';
import { SYSTEM_FRAME } from '../../../config/referenceFrames';
import * as useSearchCorpusHook from '../../../hooks/useSearchCorpus';
import * as useSystemDataHook from '../../../hooks/useSystemData';
import * as galacticCameraHelpers from './galacticCameraHelpers';
import { useCameraStore } from '../../../stores/useCameraStore';
import type { ExoplanetRecord } from '../../../types/astro';
import type { CompactSearchEntry } from '../../../utils/compactDataTypes';

const mockSolSystem: StarDossierData = {
  id: 'sol',
  name: 'Sol',
  spectralType: 'G2V',
  planets: [
    {
      id: 'earth',
      name: 'Earth',
      letter: 'b',
      composition: 'terrestrial',
      orbit: {
        semiMajorAxis: 1.0,
        eccentricity: 0.017,
        inclination: 0,
        ascendingNode: 0,
        argumentOfPeriapsis: 0,
        meanAnomaly: 0,
        periodDays: 365.25,
      },
    },
    {
      id: 'jupiter',
      name: 'Jupiter',
      letter: 'c',
      composition: 'gas-giant',
      orbit: {
        semiMajorAxis: 5.2,
        eccentricity: 0.048,
        inclination: 1.3,
        ascendingNode: 100,
        argumentOfPeriapsis: 273,
        meanAnomaly: 45,
        periodDays: 4332.6,
      },
    },
  ],
};

describe('SystemScene Component Rendering', () => {
  it('renders SystemScene with central star and orbiting planets with Keplerian paths', async () => {
    const renderer = await ReactThreeTest.create(
      <SystemScene systemId="sol" system={mockSolSystem} />,
    );

    expect(renderer.scene.findByProps({ name: 'spatial-viewport' })).toBeDefined();
    expect(renderer.scene.findByProps({ name: 'cartographic-grid' })).toBeDefined();
    expect(renderer.scene.findByProps({ name: 'celestial-entity-sol' })).toBeDefined();
    expect(renderer.scene.findByProps({ name: 'celestial-entity-earth' })).toBeDefined();
    expect(renderer.scene.findByProps({ name: 'celestial-entity-jupiter' })).toBeDefined();
    expect(renderer.scene.findByProps({ name: 'orbital-ring-earth' })).toBeDefined();
    expect(renderer.scene.findByProps({ name: 'orbital-ring-jupiter' })).toBeDefined();

    await renderer.unmount();
  });

  it('resolves centerId target coords and centres via SystemCameraController inside SystemScene', async () => {
    useCameraStore.getState().reset();
    const jupiterEntity = resolveSystemPlanetEntity(mockSolSystem.planets![1]!, 1);
    const coords = resolveTargetCoordsFromEntities([jupiterEntity], 'jupiter');
    expect(coords[0]).not.toBe(0);

    const renderer = await ReactThreeTest.create(
      <SystemScene systemId="sol" system={mockSolSystem} centerId="jupiter" />,
    );

    expect(useCameraStore.getState().target[0]).toBeCloseTo(coords[0], 4);
    expect(useCameraStore.getState().target[1]).toBeCloseTo(coords[1], 4);
    expect(useCameraStore.getState().target[2]).toBeCloseTo(coords[2], 4);
    expect(renderer.scene.findByProps({ name: 'celestial-entity-jupiter' })).toBeDefined();

    await renderer.unmount();
  });

  it('is wrapped in React.memo and skips useSearchCorpus/useSystemData when resolvedEntities is passed', async () => {
    expect((SystemScene as unknown as { $$typeof?: symbol }).$$typeof).toBe(
      Symbol.for('react.memo'),
    );

    const searchCorpusSpy = vi.spyOn(useSearchCorpusHook, 'useSearchCorpus');
    const systemDataSpy = vi.spyOn(useSystemDataHook, 'useSystemData');

    const entities = [
      {
        id: 'sol',
        name: 'Sol',
        position: [0, 0, 0] as [number, number, number],
        classification: 'star' as const,
        spectralType: 'G2V',
      },
      resolveSystemPlanetEntity(mockSolSystem.planets![0]!, 0),
    ];

    const renderer = await ReactThreeTest.create(
      <SystemScene systemId="sol" system={mockSolSystem} resolvedEntities={entities} />,
    );

    expect(searchCorpusSpy).not.toHaveBeenCalled();
    expect(systemDataSpy).not.toHaveBeenCalled();
    expect(renderer.scene.findByProps({ name: 'celestial-entity-sol' })).toBeDefined();
    expect(renderer.scene.findByProps({ name: 'celestial-entity-earth' })).toBeDefined();

    searchCorpusSpy.mockRestore();
    systemDataSpy.mockRestore();
    await renderer.unmount();
  });

  it('passes SYSTEM_FRAME.camera.baseFov (35) to SystemCameraController so perspective camera fov aligns on mount', async () => {
    const applyPoseSpy = vi.spyOn(galacticCameraHelpers, 'applyImmediateCameraPose');
    const renderer = await ReactThreeTest.create(<SystemScene systemId="sol" system={mockSolSystem} />);
    const lastCall = applyPoseSpy.mock.calls.at(-1);
    expect(lastCall?.[6]).toBe(SYSTEM_FRAME.camera.baseFov);
    const cam = lastCall?.[0];
    if (cam instanceof THREE.PerspectiveCamera) expect(cam.fov).toBe(SYSTEM_FRAME.camera.baseFov);
    applyPoseSpy.mockRestore();
    await renderer.unmount();
  });
});

describe('SystemScene orbital element resolution (AUD-024 / DEC-R019)', () => {
  describe('resolveSystemPlanetEntity', () => {
    it('uses catalogued semi-major axis, defaults unmeasured angles to 0, and marks lineStyle as dashed', () => {
      const planet: ExoplanetRecord = {
        id: 'trappist-1-b',
        name: 'TRAPPIST-1 b',
        letter: 'b',
        orbit: {
          semiMajorAxis: 0.0115,
          eccentricity: 0.006,
          inclination: 89.7,
          ascendingNode: 0,
          argumentOfPeriapsis: 0,
          meanAnomaly: 45,
          periodDays: 1.51,
        },
      };

      const entity = resolveSystemPlanetEntity(planet, 0, 0.09);

      expect(entity.id).toBe('trappist-1-b');
      expect(entity.name).toBe('TRAPPIST-1 b');
      expect(entity.orbit?.semiMajorAxis).toBe(0.0115);
      expect(entity.orbit?.eccentricity).toBe(0.006);
      expect(entity.orbit?.inclination).toBe(89.7);
      expect(entity.orbit?.ascendingNode).toBe(0);
      expect(entity.orbit?.argumentOfPeriapsis).toBe(0);
      expect(entity.orbit?.meanAnomaly).toBe(45);
      expect(entity.orbit?.period).toBe(1.51);
      expect(entity.orbit?.lineStyle).toBe('dashed');
    });

    it('does not fabricate orbital angles when unmeasured and sets lineStyle dashed for catalogued a', () => {
      const planet: ExoplanetRecord = {
        id: 'kepler-999-b',
        name: 'Kepler-999 b',
        letter: 'b',
        orbit: {
          semiMajorAxis: 0.8,
          // Missing e, inc, node, peri, meanAnomaly
          eccentricity: undefined as unknown as number,
          inclination: undefined as unknown as number,
          ascendingNode: undefined as unknown as number,
          argumentOfPeriapsis: undefined as unknown as number,
          meanAnomaly: undefined as unknown as number,
          periodDays: 260,
        },
      };

      const entity = resolveSystemPlanetEntity(planet, 2, 1.0);

      expect(entity.orbit?.semiMajorAxis).toBe(0.8);
      expect(entity.orbit?.eccentricity).toBe(0);
      expect(entity.orbit?.inclination).toBe(0);
      expect(entity.orbit?.ascendingNode).toBe(0);
      expect(entity.orbit?.argumentOfPeriapsis).toBe(0);
      // Fallback mean anomaly distributes planets cleanly: (index * 60) % 360
      expect(entity.orbit?.meanAnomaly).toBe(120);
      expect(entity.orbit?.period).toBe(260);
      expect(entity.orbit?.lineStyle).toBe('dashed');
    });

    it('infers semi-major axis from periodDays via Kepler Third Law when a is missing/0 and marks lineStyle dotted', () => {
      const planet: ExoplanetRecord = {
        id: 'kepler-earth-analog',
        name: 'Kepler Earth Analog',
        letter: 'b',
        orbit: {
          semiMajorAxis: 0, // Missing / unmeasured
          periodDays: 365.25,
          eccentricity: 0,
          inclination: 0,
          ascendingNode: 0,
          argumentOfPeriapsis: 0,
          meanAnomaly: 0,
        },
      };

      // Star with 1.0 Msun and period of 365.25 days -> a = 1.0 AU
      const entity = resolveSystemPlanetEntity(planet, 0, 1.0);

      expect(entity.orbit?.semiMajorAxis).toBe(1);
      expect(entity.orbit?.lineStyle).toBe('dotted');
      expect(entity.orbit?.eccentricity).toBe(0);
      expect(entity.orbit?.inclination).toBe(0);
    });

    it('uses fallback spacing when both semiMajorAxis and periodDays are missing/0 and marks lineStyle dotted', () => {
      const planet: ExoplanetRecord = {
        id: 'unknown-orbit-planet',
        name: 'Unknown Orbit Planet',
        letter: 'c',
      };

      const entity = resolveSystemPlanetEntity(planet, 1, 1.0);

      // index 1: 0.4 + 1 * 0.6 = 1.0
      expect(entity.orbit?.semiMajorAxis).toBe(1.0);
      expect(entity.orbit?.lineStyle).toBe('dotted');
      expect(entity.orbit?.period).toBe(Math.round(Math.pow(1.0, 1.5) * 365.25));
    });

    it('uses planet.composition if present, otherwise defaults to terrestrial', () => {
      const planetWithComp: ExoplanetRecord = {
        id: 'gas-giant-planet',
        name: 'Gas Giant Planet',
        letter: 'b',
        composition: 'gas-giant',
      };
      const entityWithComp = resolveSystemPlanetEntity(planetWithComp, 0);
      expect(entityWithComp.classification).toBe('gas-giant');

      const planetWithoutComp: ExoplanetRecord = {
        id: 'default-planet',
        name: 'Default Planet',
        letter: 'c',
      };
      const entityWithoutComp = resolveSystemPlanetEntity(planetWithoutComp, 0);
      expect(entityWithoutComp.classification).toBe('terrestrial');
    });
  });

  describe('resolveCorpusPlanetEntity', () => {
    it('uses entry.A when present, respects entry.u composition, and marks lineStyle dashed', () => {
      const entry: CompactSearchEntry = {
        i: 'hd-106906-b',
        n: 'HD 106906 b',
        k: 2,
        s: 'hd-106906',
        A: 650,
        u: 'gas-giant',
      };

      const entity = resolveCorpusPlanetEntity(entry, 0);

      expect(entity.id).toBe('hd-106906-b');
      expect(entity.name).toBe('HD 106906 b');
      expect(entity.classification).toBe('gas-giant');
      expect(entity.orbit?.semiMajorAxis).toBe(650);
      expect(entity.orbit?.lineStyle).toBe('dashed');
      expect(entity.orbit?.eccentricity).toBe(0);
      expect(entity.orbit?.inclination).toBe(0);
      expect(entity.orbit?.ascendingNode).toBe(0);
      expect(entity.orbit?.argumentOfPeriapsis).toBe(0);
      expect(entity.orbit?.meanAnomaly).toBe(0);
    });

    it('falls back to spacing and marks lineStyle dotted when entry.A is missing', () => {
      const entry: CompactSearchEntry = {
        i: 'corpus-planet-fallback',
        n: 'Corpus Planet Fallback',
        k: 2,
        s: 'host-star',
      };

      const entity = resolveCorpusPlanetEntity(entry, 1);

      expect(entity.orbit?.semiMajorAxis).toBe(1.0); // 0.4 + 1 * 0.6
      expect(entity.orbit?.lineStyle).toBe('dotted');
      expect(entity.classification).toBe('terrestrial');
      expect(entity.orbit?.meanAnomaly).toBe(60); // (1 * 60) % 360
    });
  });

  describe('corpus dwarf planets and selected minor bodies in SystemScene', () => {
    it('includes system dwarf planets and selected minor bodies or fictional stations alongside sysManifest planets', async () => {
      const { SpatialEntityProvider, createSpatialEntityStore } = await import('../entity');

      const outerStore = createSpatialEntityStore({
        selectedIds: ['1p-halley', 'orbital-beacon'],
      });

      const corpusSpy = vi.spyOn(useSearchCorpusHook, 'useSearchCorpus').mockReturnValue({
        corpus: [
          {
            i: 'sol',
            n: 'Sol',
            k: 1,
            h: 1,
          },
          {
            i: '1-ceres',
            n: 'Ceres',
            k: 4,
            s: 'sol',
            A: 2.77,
          },
          {
            i: '1p-halley',
            n: 'Halley',
            k: 6,
            s: 'sol',
            A: 17.8,
          },
          {
            i: 'unselected-asteroid',
            n: 'Unselected Asteroid',
            k: 6,
            s: 'sol',
            A: 2.4,
          },
          {
            i: 'orbital-beacon',
            n: 'Orbital Beacon',
            k: 7,
            w: 'canon-layer',
            s: 'sol',
            A: 1.5,
          },
        ],
        isLoading: false,
      });

      const systemDataSpy = vi.spyOn(useSystemDataHook, 'useSystemData').mockReturnValue({
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
            stars: [
              {
                id: 'sol-a',
                name: 'Sol',
                componentDesignation: 'A',
                spectralType: 'G2V',
                mag: -26.74,
                absmag: 4.83,
                luminosityLsun: 1,
                massMsun: 1,
              },
            ],
            planets: mockSolSystem.planets!,
          },
        },
        focusedDetail: undefined,
        isLoading: false,
      });

      const renderer = await ReactThreeTest.create(
        <SpatialEntityProvider store={outerStore}>
          <SystemScene systemId="sol" />
        </SpatialEntityProvider>,
      );

      expect(renderer.scene.findByProps({ name: 'celestial-entity-earth' })).toBeDefined();
      expect(renderer.scene.findByProps({ name: 'celestial-entity-1-ceres' })).toBeDefined();
      expect(renderer.scene.findByProps({ name: 'celestial-entity-1p-halley' })).toBeDefined();
      expect(renderer.scene.findByProps({ name: 'celestial-entity-orbital-beacon' })).toBeDefined();
      expect(
        renderer.scene.findAllByProps({ name: 'celestial-entity-unselected-asteroid' }),
      ).toHaveLength(0);

      corpusSpy.mockRestore();
      systemDataSpy.mockRestore();
      await renderer.unmount();
    });
  });
});
