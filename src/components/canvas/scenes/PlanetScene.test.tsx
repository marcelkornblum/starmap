import { describe, it, expect } from 'vitest';
import ReactThreeTest from '@react-three/test-renderer';
import { PlanetScene } from './PlanetScene';

describe('PlanetScene Primitive', () => {
  it('renders PlanetScene with Planetary instrument frame, PlanetBody, and natural satellites', async () => {
    const renderer = await ReactThreeTest.create(
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

    expect(renderer.scene.findByProps({ name: 'spatial-viewport' })).toBeDefined();
    expect(renderer.scene.findByProps({ name: 'cartographic-grid' })).toBeDefined();
    expect(renderer.scene.findByProps({ name: 'planet-body-Earth' })).toBeDefined();
    expect(renderer.scene.findByProps({ name: 'celestial-entity-earth' })).toBeDefined();
    expect(renderer.scene.findByProps({ name: 'celestial-entity-moon' })).toBeDefined();
    expect(renderer.scene.findByProps({ name: 'orbital-ring-moon' })).toBeDefined();

    await renderer.unmount();
  });
});
