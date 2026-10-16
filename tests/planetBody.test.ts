import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import * as THREE from 'three';
import { PlanetBody, getClassificationPalette } from '../src/components/canvas/entity/PlanetBody';
import { PlanetBody as PocPlanetBody } from '../src/components/poc/canvas/scenes/PlanetBody';

let capturedFrameCallback: ((state: any, delta: number) => void) | null = null;

vi.mock('@react-three/fiber', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@react-three/fiber')>();
  return {
    ...actual,
    useFrame: (cb: any) => {
      capturedFrameCallback = cb;
    },
    useThree: () => ({
      camera: new THREE.PerspectiveCamera(45, 1, 0.1, 1000),
      size: { width: 1920, height: 1080 },
    }),
  };
});

describe('PlanetBody Component (Phase 4)', () => {
  let originalDocument: any;

  beforeEach(() => {
    capturedFrameCallback = null;
    originalDocument = (globalThis as any).document;

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

    (globalThis as any).document = {
      createElement: (tag: string) => {
        if (tag === 'canvas') {
          return {
            width: 0,
            height: 0,
            getContext: () => mockCtx,
          };
        }
        return {};
      },
    };
  });

  afterEach(() => {
    (globalThis as any).document = originalDocument;
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

    const fallback = getClassificationPalette('unknown' as any);
    expect(fallback.baseColor).toBeDefined();
  });

  it('renders procedural textures across all planetary classes', () => {
    const classes = ['terrestrial', 'gas-giant', 'ice-giant', 'brown-dwarf', 'star'] as const;
    classes.forEach((cls) => {
      const html = renderToString(
        createElement(PlanetBody, {
          name: `Test-${cls}`,
          classification: cls,
          radius: 2.0,
          position: new THREE.Vector3(1, 0, 0),
        }),
      );
      expect(html).toContain(`name="planet-body-Test-${cls}"`);
      expect(html).toContain('name="planet-surface"');
    });
  });

  it('executes scale-based fade in useFrame under perspective and orthographic cameras', () => {
    renderToString(
      createElement(PlanetBody, {
        name: 'Earth',
        classification: 'terrestrial',
        radius: 2.0,
      }),
    );

    expect(capturedFrameCallback).toBeDefined();

    // 1. Perspective camera simulation
    const perspCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    perspCamera.position.set(0, 0, 50);
    capturedFrameCallback?.({ camera: perspCamera, size: { width: 1920, height: 1080 } }, 0.016);

    // Close approach
    perspCamera.position.set(0, 0, 5);
    capturedFrameCallback?.({ camera: perspCamera, size: { width: 1920, height: 1080 } }, 0.016);

    // 2. Orthographic camera simulation
    const orthoCamera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 1000);
    orthoCamera.position.set(0, 0, 20);
    capturedFrameCallback?.({ camera: orthoCamera, size: { width: 1920, height: 1080 } }, 0.016);
  });

  it('renders atmospheric haze layer when enabled for terrestrial bodies', () => {
    const htmlWithAtmosphere = renderToString(
      createElement(PlanetBody, {
        name: 'Venus',
        classification: 'terrestrial',
        hasAtmosphere: true,
      }),
    );
    expect(htmlWithAtmosphere).toContain('name="planet-atmosphere"');

    const htmlWithoutAtmosphere = renderToString(
      createElement(PlanetBody, {
        name: 'Mercury',
        classification: 'terrestrial',
        hasAtmosphere: false,
      }),
    );
    expect(htmlWithoutAtmosphere).not.toContain('name="planet-atmosphere"');
  });

  it('provides backwards-compatible re-export from POC canvas scenes', () => {
    expect(PocPlanetBody).toBe(PlanetBody);
  });
});
