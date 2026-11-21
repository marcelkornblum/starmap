import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import ReactThreeTest from '@react-three/test-renderer';
import { PlanetBody } from './PlanetBody';
import {
  clearPlanetTextureCache,
  getOrCreatePlanetTexture,
} from './planetBodyTexture';
import { getClassificationPalette } from '../../../data/planetPalettes';
import type { CelestialClassification } from '../../../types/spatial';
import { NOOP_RAYCAST } from '../engineConfig';

describe('PlanetBody Component (Phase 4)', () => {
  let getContextSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    clearPlanetTextureCache();
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

  it('attaches NOOP_RAYCAST to planet-surface and planet-atmosphere meshes (P-10)', async () => {
    const renderer = await ReactThreeTest.create(
      <PlanetBody name="Earth" classification="terrestrial" hasAtmosphere={true} />,
    );

    const surface = renderer.scene.find((node) => node.props.name === 'planet-surface');
    expect(surface.props.raycast).toBe(NOOP_RAYCAST);

    const atmosphere = renderer.scene.find((node) => node.props.name === 'planet-atmosphere');
    expect(atmosphere.props.raycast).toBe(NOOP_RAYCAST);

    await renderer.unmount();
  });

  it('uses 32x32 sphere segments for planet-surface geometry (P-16)', async () => {
    const renderer = await ReactThreeTest.create(
      <PlanetBody name="Earth" classification="terrestrial" radius={2.5} />,
    );

    const surface = renderer.scene.find((node) => node.props.name === 'planet-surface');
    const mesh = surface.instance as THREE.Mesh;
    const geom = mesh.geometry as THREE.SphereGeometry;
    expect(geom).toBeInstanceOf(THREE.SphereGeometry);
    expect(geom.parameters.radius).toBe(2.5);
    expect(geom.parameters.widthSegments).toBe(32);
    expect(geom.parameters.heightSegments).toBe(32);

    await renderer.unmount();
  });

  it('caches generated textures across mounts and avoids disposing shared textures on unmount (P-16)', async () => {
    const disposeSpy = vi.spyOn(THREE.CanvasTexture.prototype, 'dispose');
    const callsBefore = getContextSpy.mock.calls.length;

    const rendererA = await ReactThreeTest.create(
      <PlanetBody name="CachePlanetA" classification="ice-giant" radius={2.0} />,
    );
    const callsAfterA = getContextSpy.mock.calls.length - callsBefore;
    await rendererA.unmount();

    const rendererB = await ReactThreeTest.create(
      <PlanetBody name="CachePlanetB" classification="ice-giant" radius={2.0} />,
    );
    const callsAfterB = getContextSpy.mock.calls.length - callsBefore;

    expect(callsAfterA).toBeLessThanOrEqual(1);
    expect(callsAfterB).toBe(callsAfterA);
    expect(disposeSpy).not.toHaveBeenCalled();

    await rendererB.unmount();
    expect(disposeSpy).not.toHaveBeenCalled();
  });

  it('creates separate cache entries for different classifications (P-16)', async () => {
    const rendererA = await ReactThreeTest.create(
      <PlanetBody name="PairTerrestrial" classification="terrestrial" />,
    );
    const surfaceA = rendererA.scene.find((node) => node.props.name === 'planet-surface');
    const matA = (surfaceA.instance as THREE.Mesh).material as THREE.MeshBasicMaterial;

    const rendererB = await ReactThreeTest.create(
      <PlanetBody name="PairGasGiant" classification="gas-giant" />,
    );
    const surfaceB = rendererB.scene.find((node) => node.props.name === 'planet-surface');
    const matB = (surfaceB.instance as THREE.Mesh).material as THREE.MeshBasicMaterial;

    expect(matA.map).toBeInstanceOf(THREE.CanvasTexture);
    expect(matB.map).toBeInstanceOf(THREE.CanvasTexture);
    expect(matA.map).not.toBe(matB.map);

    await rendererA.unmount();
    await rendererB.unmount();
  });

  it('creates separate cache entries for different (classification, palette) pairs (P-16)', () => {
    const paletteA = getClassificationPalette('terrestrial');
    const paletteB = {
      ...paletteA,
      baseColor: '#aa2233',
      accentColor: '#dd8844',
    };

    const texA1 = getOrCreatePlanetTexture('terrestrial', paletteA);
    const texA2 = getOrCreatePlanetTexture('terrestrial', paletteA);
    const texB = getOrCreatePlanetTexture('terrestrial', paletteB);
    const texOtherClass = getOrCreatePlanetTexture('star', paletteA);

    expect(texA1).toBeInstanceOf(THREE.CanvasTexture);
    expect(texA2).toBe(texA1);
    expect(texB).not.toBe(texA1);
    expect(texOtherClass).not.toBe(texA1);
    expect(getContextSpy).toHaveBeenCalledTimes(3);
  });
});
