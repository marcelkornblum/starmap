import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import * as THREE from 'three';
import { SpatialViewport } from '../src/components/canvas/viewport/SpatialViewport';
import { SpatialViewport as PocSpatialViewport } from '../src/components/poc/canvas/SpatialViewport';
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
        entities: [sampleEntities[0]],
        debugHitarea: true,
      }),
    );
    expect(htmlDebug).toContain('name="celestial-hitarea"');
  });

  it('decouples planar footprints from instrument origin: instrument does not render rogue footprint', () => {
    const html = renderToString(
      createElement(SpatialViewport, {
        frame: GALACTIC_FRAME,
        entities: sampleEntities,
      }),
    );

    // Instrument planar grid is present, but instrument's rogue center footprint is disabled
    expect(html).toContain('name="planar-galactic-grid"');
    expect(html).not.toContain('name="planar-footprint"');
  });

  it('evaluates R_fin focal aperture: entities inside aperture are active, entities outside are passive, all interactive', () => {
    // GALACTIC_FRAME radius is 10. Sol is at (0,0,0) <= 10 -> active (reticle rendered)
    // Distant star at (50, 0, 0) > 10 -> passive (unreticled dot)
    const entitiesWithDistant: SpatialEntityDefinition[] = [
      {
        id: 'sol-local',
        name: 'Sol',
        classification: 'star',
        position: [0, 0, 0],
      },
      {
        id: 'distant-star',
        name: 'Distant Star',
        classification: 'star',
        position: [50, 0, 0],
      },
    ];

    const html = renderToString(
      createElement(SpatialViewport, {
        frame: GALACTIC_FRAME,
        entities: entitiesWithDistant,
      }),
    );

    // Sol is inside R_fin (10) -> active -> Reticle taxonomy frame rendered
    expect(html).toContain('name="celestial-entity-sol-local"');
    expect(html).toContain('name="reticle-sol-local"');

    // Distant star is outside R_fin (10) -> passive -> Reticle omitted
    expect(html).toContain('name="celestial-entity-distant-star"');
    expect(html).not.toContain('name="reticle-distant-star"');

    // Sol is inside R_fin (10) -> active -> maintains camera-facing interactive hitarea
    expect(html).toContain('name="hitarea-billboard-sol-local"');

    // Distant star is outside R_fin (10) -> passive -> zero hitarea (never handles click or rollover)
    expect(html).not.toContain('name="hitarea-billboard-distant-star"');
  });

  it('renders drop stalk and ground footprint attached to star upon selection', () => {
    const selectedStar: SpatialEntityDefinition[] = [
      {
        id: 'sirius',
        name: 'Sirius',
        classification: 'star',
        position: [-1.61, -2.13, -0.55],
      },
    ];

    const html = renderToString(
      createElement(SpatialViewport, {
        frame: GALACTIC_FRAME,
        entities: selectedStar,
        initialSelectedId: 'sirius',
      }),
    );

    // Star is selected: drop stalk and footprint render at the star's location
    expect(html).toContain('name="drop-stalk-sirius"');
    expect(html).toContain('name="stalk-line"');
    expect(html).toContain('name="stalk-footprint"');
  });

  it('accepts double-click and focus transition configuration props cleanly', () => {
    const onDblClick = vi.fn();
    const html = renderToString(
      createElement(SpatialViewport, {
        frame: GALACTIC_FRAME,
        entities: sampleEntities,
        enableFocusTransition: true,
        focusTransitionDuration: 0.6,
        onDoubleClick: onDblClick,
      }),
    );

    expect(html).toContain('name="spatial-viewport"');
    expect(html).toContain('name="celestial-entity-sol"');
  });

  it('maintains backwards-compatible re-exports from src/components/poc/canvas/SpatialViewport', () => {
    expect(PocSpatialViewport).toBe(SpatialViewport);
  });
});
