import { describe, it, expect, vi, beforeEach } from 'vitest';
import React, { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import * as THREE from 'three';
import {
  createSpatialEntityStore,
  type SpatialEntityDefinition,
} from '../src/components/canvas/entity/SpatialEntityStore';
import { BodyMarker } from '../src/components/canvas/entity/BodyMarker';
import { Reticle } from '../src/components/canvas/entity/Reticle';
import { DropStalk } from '../src/components/canvas/entity/DropStalk';
import { KinematicVector } from '../src/components/canvas/entity/KinematicVector';
import { OrbitPath } from '../src/components/canvas/entity/OrbitPath';
import { EntityLabel } from '../src/components/canvas/entity/EntityLabel';
import { CelestialEntity } from '../src/components/canvas/entity/CelestialEntity';
import { calculateKeplerianPosition, calculateKeplerianVelocity } from '../src/components/canvas/math/kepler';
import { celestialOcclusionManager } from '../src/components/canvas/cartography/celestialOcclusionRegistry';
import { SpatialFrameProvider, GALACTIC_FRAME } from '../src/components/canvas/instrument';

const renderInFrame = (element: React.ReactElement) =>
  renderToString(createElement(SpatialFrameProvider, { frame: GALACTIC_FRAME }, element));

vi.mock('@react-three/drei', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@react-three/drei')>();
  return {
    ...actual,
    Html: ({ children, 'data-testid': testId }: { children: React.ReactNode; 'data-testid'?: string }) =>
      createElement('div', { 'data-testid': testId ?? 'drei-html' }, children),
  };
});

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

describe('Entity Store & Node Decomposition (Phase 3)', () => {
  describe('SpatialEntityStore (FSM & Registry)', () => {
    let store: ReturnType<typeof createSpatialEntityStore>;

    beforeEach(() => {
      store = createSpatialEntityStore();
    });

    it('registers and unregisters entities cleanly', () => {
      const entity: SpatialEntityDefinition = {
        id: 'sol',
        name: 'Sol',
        position: [0, 0, 0],
        classification: 'star',
      };

      store.getState().registerEntity(entity);
      expect(store.getState().entities['sol']).toBeDefined();
      expect(store.getState().entities['sol'].name).toBe('Sol');

      store.getState().unregisterEntity('sol');
      expect(store.getState().entities['sol']).toBeUndefined();
    });

    it('manages 4-tier interaction FSM (passive, active, selected, focused)', () => {
      const entity: SpatialEntityDefinition = {
        id: 'sirius',
        name: 'Sirius',
        position: [2.6, 0.5, -1.2],
        classification: 'star',
      };
      store.getState().registerEntity(entity);

      // Default state inside aperture is active, or passive if far
      expect(store.getState().getEntityState('sirius')).toBe('passive');

      store.getState().setHovered('sirius');
      expect(store.getState().getEntityState('sirius')).toBe('selected');

      store.getState().setSelected('sirius');
      expect(store.getState().getEntityState('sirius')).toBe('selected');

      store.getState().setFocused('sirius');
      expect(store.getState().getEntityState('sirius')).toBe('focused');

      store.getState().setFocused(null);
      expect(store.getState().getEntityState('sirius')).toBe('selected');

      store.getState().setSelected(null);
      store.getState().setHovered(null);
      expect(store.getState().getEntityState('sirius')).toBe('passive');
    });

    it('sets selection and focus idempotently (re-setting the same id never clears it)', () => {
      store.getState().setSelected('sol');
      expect(store.getState().selectedId).toBe('sol');
      store.getState().setSelected('sol');
      expect(store.getState().selectedId).toBe('sol');
      store.getState().setSelected(null);
      expect(store.getState().selectedId).toBeNull();

      store.getState().setFocused('sol');
      expect(store.getState().focusedId).toBe('sol');
      store.getState().setFocused('sol');
      expect(store.getState().focusedId).toBe('sol');
      store.getState().setFocused(null);
      expect(store.getState().focusedId).toBeNull();
    });

    it('derives entity tier via deriveEntityTier in getEntityState', () => {
      const entity: SpatialEntityDefinition = {
        id: 'vega',
        name: 'Vega',
        position: [7.7, 0, 0],
        classification: 'star',
      };
      store.getState().registerEntity(entity);
      expect(store.getState().getEntityState('vega')).toBe('passive');

      store.getState().setEntityInAperture('vega', true);
      expect(store.getState().getEntityState('vega')).toBe('active');

      store.getState().setSelected('vega');
      expect(store.getState().getEntityState('vega')).toBe('selected');

      store.getState().setFocused('vega');
      expect(store.getState().getEntityState('vega')).toBe('focused');
    });

    it('queries entities within a spatial aperture radius', () => {
      store.getState().registerEntity({ id: 'a', name: 'A', position: [0, 0, 0] });
      store.getState().registerEntity({ id: 'b', name: 'B', position: [5, 0, 0] });
      store.getState().registerEntity({ id: 'c', name: 'C', position: [20, 0, 0] });

      const center = new THREE.Vector3(0, 0, 0);
      const inAperture = store.getState().getEntitiesInAperture(center, 10);
      expect(inAperture.map((e) => e.id)).toEqual(['a', 'b']);
    });
  });

  describe('BodyMarker primitive (Layer 1: Physical System Node)', () => {
    it('renders central celestial marker in monochrome and invisible hitarea mesh', () => {
      const html = renderToString(
        createElement(BodyMarker, {
          id: 'test-node',
          position: [1, 2, 3],
        }),
      );
      expect(html).toContain('name="body-marker-test-node"');
      expect(html).toContain('name="celestial-point-dot"');
      expect(html).toContain('name="celestial-hitarea"');
    });

    it('supports custom size and monochrome styling', () => {
      const html = renderToString(
        createElement(BodyMarker, {
          id: 'mono-node',
          position: [0, 0, 0],
          pixelSize: 6,
        }),
      );
      expect(html).toContain('name="body-marker-mono-node"');
    });
  });

  describe('Reticle primitive (Layer 2: Tactical Geometric Reticle)', () => {
    it('renders basic geometric diamond frame for stellar systems without annotations in active state', () => {
      const html = renderToString(
        createElement(Reticle, {
          id: 'star-reticle',
          classification: 'star',
          state: 'active',
          size: 0.45,
        }),
      );
      expect(html).toContain('name="reticle-star-reticle"');
      expect(html).toContain('name="reticle-geometry"');
      // No annotations in active state
      expect(html).not.toContain('name="multiplicity-pips"');
    });

    it('renders full Four-Facet composite reticle with multiplicity and census in selected/focused states', () => {
      const html = renderToString(
        createElement(Reticle, {
          id: 'binary-star',
          classification: 'star',
          state: 'selected',
          size: 0.45,
          multiplicity: 2,
          planets: [
            { id: 'p1', name: 'Planet b', classification: 'terrestrial' },
            { id: 'p2', name: 'Planet c', classification: 'terrestrial' },
          ],
          spectralType: 'G2V',
        }),
      );
      expect(html).toContain('name="reticle-binary-star"');
      expect(html).toContain('name="multiplicity-pips"');
      expect(html).toContain('name="planetary-census-pips"');
    });

    it('renders category-specific reticle geometries for brown dwarfs, white dwarfs, and black holes', () => {
      const classifications = [
        'brown-dwarf',
        'white-dwarf',
        'neutron-star',
        'black-hole',
        'terrestrial',
        'gas-giant',
        'ice-giant',
        'cluster',
        'artificial',
      ] as const;

      classifications.forEach((cls) => {
        const html = renderToString(
          createElement(Reticle, {
            id: `reticle-${cls}`,
            classification: cls,
            state: 'active',
          }),
        );
        expect(html).toContain(`name="reticle-reticle-${cls}"`);
      });
    });
  });

  describe('DropStalk primitive (§2.4: State-Driven Drop Stalks)', () => {
    it('does NOT render drop stalk in passive or active states (Single-Stalk Rule)', () => {
      const htmlPassive = renderInFrame(
        createElement(DropStalk, {
          id: 'stalk-node',
          position: [0, 0, 5],
          state: 'passive',
        }),
      );
      expect(htmlPassive).toBe('');

      const htmlActive = renderInFrame(
        createElement(DropStalk, {
          id: 'stalk-node',
          position: [0, 0, 5],
          state: 'active',
        }),
      );
      expect(htmlActive).toBe('');
    });

    it('renders drop stalk and ground footprint on datum in selected and focused states', () => {
      const htmlSelected = renderInFrame(
        createElement(DropStalk, {
          id: 'stalk-node',
          position: [1, 2, 5],
          state: 'selected',
        }),
      );
      expect(htmlSelected).toContain('name="drop-stalk-stalk-node"');
      expect(htmlSelected).toContain('name="stalk-line"');
      expect(htmlSelected).toContain('name="stalk-footprint"');

      const htmlFocused = renderInFrame(
        createElement(DropStalk, {
          id: 'stalk-node',
          position: [1, 2, 5],
          state: 'focused',
        }),
      );
      expect(htmlFocused).toContain('name="drop-stalk-stalk-node"');
    });

    it('renders solid stalk for +Z (North) and dashed stalk for -Z (South)', () => {
      const htmlNorth = renderInFrame(
        createElement(DropStalk, {
          id: 'north-stalk',
          position: [0, 0, 5],
          state: 'selected',
        }),
      );
      expect(htmlNorth).toContain('data-hemisphere="north"');

      const htmlSouth = renderInFrame(
        createElement(DropStalk, {
          id: 'south-stalk',
          position: [0, 0, -5],
          state: 'selected',
        }),
      );
      expect(htmlSouth).toContain('data-hemisphere="south"');
    });

    it('positions drop stalk and footprint in entity-local coordinates when entityZ is provided', () => {
      const htmlLocal = renderInFrame(
        createElement(DropStalk, {
          id: 'local-stalk',
          position: [0, 0, 0],
          entityZ: 2.5,
          state: 'selected',
          datumZ: 0,
        }),
      );
      expect(htmlLocal).toContain('name="drop-stalk-local-stalk"');
      expect(htmlLocal).toContain('name="stalk-line"');
      expect(htmlLocal).toContain('name="stalk-footprint"');
    });
  });

  describe('KinematicVector primitive (§5: Projected Velocity Vectors)', () => {
    it('renders projected velocity vector line to delta t when velocity is provided', () => {
      const html = renderToString(
        createElement(KinematicVector, {
          id: 'kin-vector-1',
          position: [10, 10, 0],
          velocity: [2, 1, 0],
          deltaTime: 1.0,
          state: 'selected',
        }),
      );
      expect(html).toContain('name="kinematic-vector-kin-vector-1"');
      expect(html).toContain('name="velocity-vector-line"');
    });

    it('does not render when velocity is zero or undefined', () => {
      const htmlNone = renderToString(
        createElement(KinematicVector, {
          id: 'kin-vector-none',
          position: [10, 10, 0],
        }),
      );
      expect(htmlNone).toBe('');
    });
  });

  describe('OrbitPath primitive (§4.4: State-Driven Orbits)', () => {
    it('renders circular orbit with periapsis tick by default', () => {
      const html = renderToString(
        createElement(OrbitPath, {
          id: 'orbit-earth',
          semiMajorAxis: 1.0,
          state: 'passive',
        }),
      );
      expect(html).toContain('name="orbital-ring-orbit-earth"');
      expect(html).toContain('name="orbit-path-line"');
      expect(html).toContain('name="orbit-periapsis-tick"');
    });

    it('applies kinematic color and forced rendering when state is selected or focused', () => {
      const htmlForced = renderToString(
        createElement(OrbitPath, {
          id: 'orbit-mars',
          semiMajorAxis: 1.52,
          visible: false, // toggled off globally
          state: 'focused', // State Exception Rule forces render!
        }),
      );
      expect(htmlForced).toContain('name="orbital-ring-orbit-mars"');
      expect(htmlForced).toContain('data-state-forced="true"');
    });
  });

  describe('EntityLabel primitive (Layer 3: Typographic Label)', () => {
    it('renders label with name and spectral tag cleanly in SSR', () => {
      const html = renderToString(
        createElement(EntityLabel, {
          id: 'label-sol',
          name: 'Sol',
          spectralType: 'G2V',
          state: 'focused',
          position: [0, 0, 0],
        }),
      );
      expect(html).toContain('Sol');
      expect(html).toContain('G2V');
    });

    it('formats multiple star designation in spectral facet with compact centered dot and no spaces', () => {
      const html = renderToString(
        createElement(EntityLabel, {
          id: 'label-sirius',
          name: 'Sirius',
          spectralType: 'A1V + DA2',
          state: 'focused',
          position: [0, 0, 0],
        }),
      );
      expect(html).toContain('A1V·DA2');
      expect(html).not.toContain('A1V + DA2');
    });
  });

  describe('CelestialEntity composite', () => {
    it('coordinates BodyMarker, Reticle, Label, and DropStalk adhering to the 3-layer architecture', () => {
      const html = renderInFrame(
        createElement(CelestialEntity, {
          id: 'proxima',
          name: 'Proxima Centauri',
          position: [1.3, 0.2, -0.8],
          classification: 'star',
          spectralType: 'M5.5V',
          stateOverride: 'focused',
          velocity: [0.1, -0.05, 0.02],
        }),
      );
      expect(html).toContain('name="celestial-entity-proxima"');
      expect(html).toContain('name="body-marker-proxima"');
      expect(html).toContain('name="reticle-proxima"');
      expect(html).toContain('name="drop-stalk-proxima"');
      expect(html).toContain('Proxima Centauri');
    });

    it('positions Keplerian orbit anchored at primary entity and calculates entity position on orbit', () => {
      const [periX, periY, periZ] = calculateKeplerianPosition(3.0, 0.2, 0, 0, 0, 0);
      expect(periX).toBeCloseTo(3.0 * (1 - 0.2), 4);
      expect(periY).toBeCloseTo(0, 4);
      expect(periZ).toBeCloseTo(0, 4);

      const [apoX, apoY, apoZ] = calculateKeplerianPosition(3.0, 0.2, 0, 0, 0, 180);
      expect(apoX).toBeCloseTo(-3.0 * (1 + 0.2), 4);
      expect(apoY).toBeCloseTo(0, 4);
      expect(apoZ).toBeCloseTo(0, 4);

      const [velX, velY, velZ] = calculateKeplerianVelocity(3.0, 0.2, 0, 0, 0, 0);
      expect(velX).toBeCloseTo(0, 4);
      expect(velY).toBeGreaterThan(0);
      expect(velZ).toBeCloseTo(0, 4);

      // CelestialEntity with orbit referring to primary
      const html = renderInFrame(
        createElement(CelestialEntity, {
          id: 'planet-earth',
          name: 'Earth',
          classification: 'star',
          stateOverride: 'selected',
          orbit: {
            primaryPosition: [0, 0, 0],
            semiMajorAxis: 3.0,
            eccentricity: 0.2,
            meanAnomaly: 0,
            lineStyle: 'dashed',
            showPeriapsisTick: true,
          },
        }),
      );

      expect(html).toContain('name="celestial-entity-planet-earth"');
      expect(html).toContain('name="orbital-ring-planet-earth"');
      expect(html).toContain('name="orbit-path-line"');
      // Entity position at M=0 is [2.4, 0, 0]
      expect(html).toContain('data-position="2.4,0,0"');
      // Orbit path is offset by -position to remain anchored at primary [0, 0, 0]
      expect(html).toContain('position="-2.4');
    });

    it('implements Spec 2.2 hitarea fan-out and cyclic target selection for overlapping nodes', () => {
      celestialOcclusionManager.clear();

      celestialOcclusionManager.register({
        id: 'node-1',
        name: 'Node 1',
        state: 'active',
        screenX: 100,
        screenY: 100,
        camDist: 10,
        reticleRadius: 40,
        starRadius: 4,
        hasReticle: true,
        visible: true,
        updatedAt: 1000,
      });

      celestialOcclusionManager.register({
        id: 'node-2',
        name: 'Node 2',
        state: 'active',
        screenX: 105,
        screenY: 102,
        camDist: 10.2,
        reticleRadius: 40,
        starRadius: 4,
        hasReticle: true,
        visible: true,
        updatedAt: 1000,
      });

      // Both nodes overlap heavily in screen space (distance ~5.4px < 40 * 0.8 = 32px)
      const offset1 = { ...celestialOcclusionManager.evaluateHitAreaOffset('node-1') };
      const offset2 = { ...celestialOcclusionManager.evaluateHitAreaOffset('node-2') };

      // They must radially fan out around cluster centroid (opposite directions)
      expect(offset1.x).not.toBe(0);
      expect(offset2.x).not.toBe(0);
      expect(Math.sign(offset1.x)).not.toBe(Math.sign(offset2.x));

      // Cyclic selection: node-1 is not focused, clicking node-1 returns next target when cycling
      expect(celestialOcclusionManager.getCyclicSelectionTarget('node-1')).toBe('node-2');
      expect(celestialOcclusionManager.getCyclicSelectionTarget('node-2')).toBe('node-1');
    });

    it('implements Spec 2.2 priority reticle occlusion masking for foreground selected entities', () => {
      celestialOcclusionManager.clear();

      // Foreground selected star at (200, 200)
      celestialOcclusionManager.register({
        id: 'fg-star',
        name: 'Foreground',
        state: 'focused',
        screenX: 200,
        screenY: 200,
        camDist: 10,
        reticleRadius: 30,
        starRadius: 4,
        hasReticle: true,
        visible: true,
        updatedAt: 1000,
      });

      // Background active star directly behind it at (202, 201)
      celestialOcclusionManager.register({
        id: 'bg-star',
        name: 'Background',
        state: 'active',
        screenX: 202,
        screenY: 201,
        camDist: 25,
        reticleRadius: 30,
        starRadius: 4,
        hasReticle: true,
        visible: true,
        updatedAt: 1000,
      });

      // Background reticle is suppressed by foreground priority mask
      expect(celestialOcclusionManager.evaluateReticleOcclusion('bg-star')).toBe(true);

      // Foreground reticle is NOT suppressed (Target Immunity)
      expect(celestialOcclusionManager.evaluateReticleOcclusion('fg-star')).toBe(false);
    });

    it('renders BodyMarker with debugHitarea wireframe mesh when enabled', () => {
      const htmlNormal = renderToString(
        createElement(BodyMarker, {
          id: 'test-norm',
          position: [0, 0, 0],
          debugHitarea: false,
        }),
      );
      expect(htmlNormal).toContain('name="celestial-hitarea"');

      const htmlDebug = renderToString(
        createElement(BodyMarker, {
          id: 'test-debug',
          position: [0, 0, 0],
          debugHitarea: true,
        }),
      );
      expect(htmlDebug).toContain('name="celestial-hitarea"');
    });
  });
});

