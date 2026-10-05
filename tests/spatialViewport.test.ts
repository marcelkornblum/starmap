import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import * as THREE from 'three';
import { SpatialViewport } from '../src/components/canvas/SpatialViewport';
import { GALACTIC_FRAME, SYSTEM_FRAME, PLANETARY_FRAME } from '../src/components/canvas/instrument/referenceFrame';
import type { SpatialEntityDefinition } from '../src/components/canvas/entity/SpatialEntityStore';
import { useUIStore } from '../src/stores/useUIStore';

vi.mock('@react-three/fiber', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@react-three/fiber')>();
  return {
    ...actual,
    useFrame: vi.fn(),
    useThree: () => ({
      camera: new THREE.PerspectiveCamera(45, 1, 0.1, 1000),
      gl: { setClearColor: vi.fn() },
      scene: new THREE.Scene(),
      size: { width: 1920, height: 1080 },
    }),
  };
});

describe('SpatialViewport Composition Root (Phase 4)', () => {
  beforeEach(() => {
    useUIStore.getState().resetUI();
  });

  const sampleEntities: SpatialEntityDefinition[] = [
    {
      id: 'sol',
      name: 'Sol',
      classification: 'star',
      position: [0, 0, 0],
      spectralType: 'G2V',
      multiplicity: 1,
    },
    {
      id: 'proxima',
      name: 'Proxima Centauri',
      classification: 'star',
      position: [1.3, 0.2, -0.5],
      spectralType: 'M5.5V',
      multiplicity: 1,
    },
  ];

  it('renders spatial viewport root with Galactic reference frame and celestial entities', () => {
    const html = renderToString(
      createElement(SpatialViewport, {
        frame: GALACTIC_FRAME,
        entities: sampleEntities,
        mode: 'explore',
      }),
    );

    expect(html).toContain('name="spatial-viewport"');
    expect(html).toContain('data-mode="explore"');
    expect(html).toContain('name="cartographic-grid"');
    expect(html).toContain('name="celestial-entity-sol"');
    expect(html).toContain('name="celestial-entity-proxima"');
  });

  it('renders spatial viewport with System frame and Planetary frame configurations', () => {
    const htmlSystem = renderToString(
      createElement(SpatialViewport, {
        frame: SYSTEM_FRAME,
        entities: [sampleEntities[0]],
        mode: 'focus',
      }),
    );
    expect(htmlSystem).toContain('name="spatial-viewport"');
    expect(htmlSystem).toContain('data-mode="focus"');
    expect(htmlSystem).toContain('name="celestial-entity-sol"');

    const htmlPlanetary = renderToString(
      createElement(SpatialViewport, {
        frame: PLANETARY_FRAME,
        entities: [],
        showInstrument: false,
      }),
    );
    expect(htmlPlanetary).toContain('name="spatial-viewport"');
    expect(htmlPlanetary).not.toContain('name="cartographic-grid"');
  });

  it('renders custom children (e.g. PlanetBody or bespoke visuals) alongside entities', () => {
    const htmlWithChildren = renderToString(
      createElement(
        SpatialViewport,
        {
          frame: PLANETARY_FRAME,
          entities: [],
        },
        createElement('mesh', { name: 'bespoke-planet-child' }),
      ),
    );

    expect(htmlWithChildren).toContain('name="bespoke-planet-child"');
  });

  it('supports debugHitarea flag for hit boundary inspection', () => {
    const htmlDebug = renderToString(
      createElement(SpatialViewport, {
        frame: SYSTEM_FRAME,
        entities: [{ ...sampleEntities[0], state: 'active' }],
        debugHitarea: true,
      }),
    );
    expect(htmlDebug).toContain('name="celestial-hitarea"');
  });
});
