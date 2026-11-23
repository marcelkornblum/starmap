import { describe, it, expect, vi } from 'vitest';
import ReactThreeTest from '@react-three/test-renderer';
import * as planetPalettes from '../../../data/planetPalettes';
import { PlanetScene } from './PlanetScene';
import * as planetaryEntityResolver from './planetaryEntityResolver';
import type { SpatialEntityDefinition } from '../entity';

describe('PlanetScene Primitive', () => {
  it('renders PlanetScene with Planetary instrument frame, PlanetBody, and natural satellites', async () => {
    let renderer!: Awaited<ReturnType<typeof ReactThreeTest.create>>;
    await ReactThreeTest.act(async () => {
      renderer = await ReactThreeTest.create(
        <PlanetScene
          planetId="earth"
          planetName="Earth"
          classification="terrestrial"
          planet={{
            id: 'earth',
            name: 'Earth',
            letter: '',
            composition: 'terrestrial',
            satellites: [
              {
                id: 'moon',
                name: 'Luna',
                parentId: 'earth',
                composition: 'terrestrial',
                orbit: {
                  semiMajorAxis: 60.34,
                  eccentricity: 0.0549,
                  inclination: 5.14,
                  ascendingNode: 125.08,
                  argumentOfPeriapsis: 318.15,
                  meanAnomaly: 135.0,
                  periodDays: 27.32,
                },
              },
            ],
          }}
        />,
      );
    });

    expect(renderer.scene.findByProps({ name: 'spatial-viewport' })).toBeDefined();
    expect(renderer.scene.findByProps({ name: 'cartographic-grid' })).toBeDefined();
    expect(renderer.scene.findByProps({ name: 'planet-body-Earth' })).toBeDefined();
    expect(renderer.scene.findByProps({ name: 'celestial-entity-earth' })).toBeDefined();
    expect(renderer.scene.findByProps({ name: 'celestial-entity-moon' })).toBeDefined();
    expect(renderer.scene.findByProps({ name: 'orbital-ring-moon' })).toBeDefined();

    await renderer.unmount();
  });

  it('is wrapped in React.memo', () => {
    expect((PlanetScene as unknown as { $$typeof?: symbol }).$$typeof).toBe(
      Symbol.for('react.memo'),
    );
  });

  it('skips resolvePlanetaryEntitiesAndTarget when resolvedEntities is provided', async () => {
    const resolveSpy = vi.spyOn(planetaryEntityResolver, 'resolvePlanetaryEntitiesAndTarget');
    const preResolved: SpatialEntityDefinition[] = [
      {
        id: 'earth',
        name: 'Earth',
        classification: 'terrestrial',
        position: [0, 0, 0],
        bodyRadius: 1,
      },
    ];

    const renderer = await ReactThreeTest.create(
      <PlanetScene
        planetId="earth"
        planetName="Earth"
        resolvedEntities={preResolved}
        centerCoordinates={[0, 0, 0]}
      />,
    );

    expect(resolveSpy).not.toHaveBeenCalled();
    expect(renderer.scene.findByProps({ name: 'celestial-entity-earth' })).toBeDefined();

    resolveSpy.mockRestore();
    await renderer.unmount();
  });

  it('omits bodyRadius from mapped satellites while retaining it on the central planet entity', () => {
    const { allEntities } = planetaryEntityResolver.resolvePlanetaryEntitiesAndTarget({
      planetId: 'saturn',
      planetName: 'Saturn',
      classification: 'gas-giant',
      radius: 2,
      planet: {
        id: 'saturn',
        name: 'Saturn',
        letter: '',
        composition: 'gas-giant',
        satellites: [
          {
            id: 'titan',
            name: 'Titan',
            parentId: 'saturn',
            composition: 'terrestrial',
            radiusEarth: 0.404,
            orbit: {
              semiMajorAxis: 20.2,
              eccentricity: 0.0288,
              inclination: 0.348,
              ascendingNode: 28.06,
              argumentOfPeriapsis: 180.5,
              meanAnomaly: 163.3,
              periodDays: 15.945,
            },
          },
        ],
      },
    });

    const central = allEntities.find((e) => e.id === 'saturn');
    const titan = allEntities.find((e) => e.id === 'titan');

    expect(central?.bodyRadius).toBe(2);
    expect(titan).toBeDefined();
    expect(titan?.bodyRadius).toBeUndefined();
  });

  it('reactively mounts host-system satellites when useSystemData resolves systemDetail after mount', async () => {
    const detailsRepository = await import('../../../data/detailsRepository');
    const useSearchCorpusHook = await import('../../../hooks/useSearchCorpus');

    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => undefined)),
    );
    detailsRepository.clearDetailsRepositoryCache();
    const corpusSpy = vi.spyOn(useSearchCorpusHook, 'useSearchCorpus').mockReturnValue({
      corpus: [
        {
          i: 'saturn',
          n: 'Saturn',
          k: 2,
          s: 'sol',
          h: 1,
        },
      ],
      isLoading: false,
    });

    let renderer!: Awaited<ReturnType<typeof ReactThreeTest.create>>;
    await ReactThreeTest.act(async () => {
      renderer = await ReactThreeTest.create(
        <PlanetScene planetId="saturn" planetName="Saturn" classification="gas-giant" />,
      );
    });

    expect(renderer.scene.findAllByProps({ name: 'celestial-entity-titan' })).toHaveLength(0);

    await ReactThreeTest.act(async () => {
      detailsRepository.seedDetailRecord('sol', {
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
              id: 'saturn',
              name: 'Saturn',
              letter: 'f',
              composition: 'gas-giant',
              satellites: [
                {
                  id: 'titan',
                  name: 'Titan',
                  parentId: 'saturn',
                  composition: 'terrestrial',
                  orbit: {
                    semiMajorAxis: 20.2,
                    eccentricity: 0.0288,
                    inclination: 0.348,
                    ascendingNode: 28.06,
                    argumentOfPeriapsis: 180.5,
                    meanAnomaly: 163.3,
                    periodDays: 15.945,
                  },
                },
              ],
            },
          ],
        },
      });
    });

    expect(renderer.scene.findByProps({ name: 'celestial-entity-titan' })).toBeDefined();

    corpusSpy.mockRestore();
    await renderer.unmount();
    await ReactThreeTest.act(async () => {
      detailsRepository.clearDetailsRepositoryCache();
    });
    vi.unstubAllGlobals();
  });

  it('derives gas-giant classification from planet composition when classification prop is omitted', async () => {
    const paletteSpy = vi.spyOn(planetPalettes, 'getClassificationPalette');
    let renderer!: Awaited<ReturnType<typeof ReactThreeTest.create>>;
    await ReactThreeTest.act(async () => {
      renderer = await ReactThreeTest.create(
        <PlanetScene
          planetId="saturn"
          planetName="Saturn"
          planet={{
            id: 'saturn',
            name: 'Saturn',
            letter: 'f',
            composition: 'gas-giant',
          }}
        />,
      );
    });

    expect(paletteSpy).toHaveBeenCalledWith('gas-giant');
    paletteSpy.mockRestore();

    await renderer.unmount();
  });
});
