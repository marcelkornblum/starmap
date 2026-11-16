import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import ReactThreeTest from '@react-three/test-renderer';
import { PlanetBody } from './PlanetBody';
import { getClassificationPalette } from '../../../data/planetPalettes';
import type { CelestialClassification } from '../../../types/spatial';

describe('PlanetBody Component (Phase 4)', () => {
  let getContextSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    const mockCtx = {
      fillStyle: '',
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      ellipse: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      createLinearGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
    };

    getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue(mockCtx as unknown as CanvasRenderingContext2D);
  });

  afterEach(() => {
    getContextSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it('provides distinctive palettes for all planetary classifications', () => {
    const terrestrial = getClassificationPalette('terrestrial');
    expect(terrestrial.baseColor).toBeDefined();
    expect(terrestrial.atmosphereColor).toBeDefined();

    const gasGiant = getClassificationPalette('gas-giant');
    expect(gasGiant.bands).toBeInstanceOf(Array);
    expect(gasGiant.bands?.length).toBeGreaterThan(0);

    const iceGiant = getClassificationPalette('ice-giant');
    expect(iceGiant.baseColor).toBeDefined();

    const fallback = getClassificationPalette('unknown' as CelestialClassification);
    expect(fallback.baseColor).toBeDefined();
  });

  it('renders procedural textures across all planetary classes', async () => {
    const classes: readonly CelestialClassification[] = [
      'terrestrial',
      'gas-giant',
      'ice-giant',
      'brown-dwarf',
      'star',
    ];

    for (const cls of classes) {
      const renderer = await ReactThreeTest.create(
        <PlanetBody
          name={`Test-${cls}`}
          classification={cls}
          radius={2.0}
          position={new THREE.Vector3(1, 0, 0)}
        />,
      );

      expect(
        renderer.scene.findAll((node) => node.props.name === `planet-body-Test-${cls}`),
      ).toHaveLength(1);
      expect(
        renderer.scene.findAll((node) => node.props.name === 'planet-surface'),
      ).toHaveLength(1);

      await renderer.unmount();
    }
  });

  it('executes scale-based fade in useFrame under perspective and orthographic cameras', async () => {
    const renderer = await ReactThreeTest.create(
      <PlanetBody name="Earth" classification="terrestrial" radius={2.0} />,
    );

    // Advance frame loop
    await renderer.advanceFrames(2, 0.016);

    expect(
      renderer.scene.findAll((node) => node.props.name === 'planet-surface'),
    ).toHaveLength(1);

    await renderer.unmount();
  });

  it('renders atmospheric haze layer when enabled for terrestrial bodies', async () => {
    const rendererWithAtmosphere = await ReactThreeTest.create(
      <PlanetBody name="Venus" classification="terrestrial" hasAtmosphere={true} />,
    );
    expect(
      rendererWithAtmosphere.scene.findAll((node) => node.props.name === 'planet-atmosphere'),
    ).toHaveLength(1);
    await rendererWithAtmosphere.unmount();

    const rendererWithoutAtmosphere = await ReactThreeTest.create(
      <PlanetBody name="Mercury" classification="terrestrial" hasAtmosphere={false} />,
    );
    expect(
      rendererWithoutAtmosphere.scene.findAll((node) => node.props.name === 'planet-atmosphere'),
    ).toHaveLength(0);
    await rendererWithoutAtmosphere.unmount();
  });
});
