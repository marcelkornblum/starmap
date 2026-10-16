import { describe, it, expect, vi, beforeEach } from 'vitest';
import React, { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import {
  GALACTIC_FRAME,
  SYSTEM_FRAME,
  PLANETARY_FRAME,
  SpatialFrameProvider,
  useSpatialFrame,
  CameraRig,
  CartographicInstrument,
  CartographicLighting,
} from '../src/components/canvas/instrument';
import { SpatialViewport } from '../src/components/canvas/viewport/SpatialViewport';
import { StoryCanvas } from '../.storybook/helpers/StoryCanvas';
import {
  FRAME_PRIORITY,
  ORBIT_CONTROLS_PRIORITY,
  REFERENCE_INSTRUMENT_FOOTPRINT,
  REFERENCE_FOV_DEG,
  SCREEN_HEIGHT_REFERENCE_SCALE,
} from '../src/components/canvas/engineConfig';
import {
  SpatialEntityProvider,
  useOcclusionManager,
} from '../src/components/canvas/entity/SpatialEntityContext';
import { CelestialOcclusionManager } from '../src/components/canvas/cartography/celestialOcclusionRegistry';

vi.mock('@react-three/drei', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@react-three/drei')>();
  return {
    ...actual,
    Html: ({ children }: { children: React.ReactNode }) => createElement('div', null, children),
  };
});

export const mockControls = {
  minDistance: 0,
  maxDistance: 1000,
};

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
      controls: mockControls,
    }),
  };
});

type FrameRef = ReturnType<typeof useSpatialFrame>['frameRef'];
type FrameCallback = (state: unknown, delta: number) => void;

function createProbe(sink: FrameRef[]): React.FC {
  return function FrameProbe() {
    sink.push(useSpatialFrame().frameRef);
    return null;
  };
}

describe('Spatial frame ownership (one provider per viewport)', () => {
  beforeEach(() => {
    vi.mocked(useFrame).mockClear();
  });

  it('throws when a frame consumer is rendered outside a SpatialFrameProvider', () => {
    const Probe = createProbe([]);
    expect(() => renderToString(createElement(Probe))).toThrow(/SpatialFrameProvider/);
  });

  it('CartographicInstrument consumes the enclosing provider instead of creating its own', () => {
    const refs: FrameRef[] = [];
    const Probe = createProbe(refs);
    renderToString(
      createElement(
        SpatialFrameProvider,
        { frame: SYSTEM_FRAME },
        createElement(Probe),
        createElement(CartographicInstrument, null, createElement(Probe)),
      ),
    );
    expect(refs).toHaveLength(2);
    expect(refs[1]).toBe(refs[0]);
    expect(refs[1].current.frame).toBe(SYSTEM_FRAME);
  });

  it('runs after OrbitControls and never updates controls itself', () => {
    const refs: FrameRef[] = [];
    const Probe = createProbe(refs);
    renderToString(createElement(SpatialFrameProvider, { frame: GALACTIC_FRAME }, createElement(Probe)));

    const providerCall = vi.mocked(useFrame).mock.calls[0];
    const [callback, priority] = providerCall as unknown as [FrameCallback, number];
    expect(priority).toBe(FRAME_PRIORITY.spatialFrame);
    expect(priority).toBeGreaterThan(ORBIT_CONTROLS_PRIORITY);
    expect(priority).toBeLessThan(0);

    const update = vi.fn();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.set(1, -28, 20);
    callback({ camera, controls: { target: new THREE.Vector3(1, 2, 0), update } }, 0.016);

    expect(update).not.toHaveBeenCalled();
    expect(refs[0].current.focusPoint.toArray()).toEqual([1, 2, 0]);
  });

  it('orders camera writers, controls, frame maths and camera rig deterministically', () => {
    expect(FRAME_PRIORITY.cameraTransition).toBeLessThan(ORBIT_CONTROLS_PRIORITY);
    expect(ORBIT_CONTROLS_PRIORITY).toBeLessThan(FRAME_PRIORITY.spatialFrame);
    expect(FRAME_PRIORITY.spatialFrame).toBeLessThan(FRAME_PRIORITY.cameraRig);
    expect(FRAME_PRIORITY.cameraRig).toBeLessThan(0);

    renderToString(createElement(SpatialFrameProvider, { frame: GALACTIC_FRAME }, createElement(CameraRig)));
    const rigCall = vi.mocked(useFrame).mock.calls[1];
    expect(rigCall[1]).toBe(FRAME_PRIORITY.cameraRig);
  });

  it('centralises screen-scale constants and dynamic evaluations in SpatialFrameState', () => {
    const refs: FrameRef[] = [];
    const Probe = createProbe(refs);
    renderToString(createElement(SpatialFrameProvider, { frame: GALACTIC_FRAME }, createElement(Probe)));

    const s = refs[0].current;
    expect(s.referenceFootprint).toBe(REFERENCE_INSTRUMENT_FOOTPRINT);
    expect(s.referenceFovDeg).toBe(REFERENCE_FOV_DEG);
    expect(s.screenHeightReferenceScale).toBe(SCREEN_HEIGHT_REFERENCE_SCALE);
    expect(s.fovFactor).toBe(1.0);
    expect(s.screenScale).toBeGreaterThan(0);

    // Call useFrame callback with camera at 2x reference distance
    const providerCall = vi.mocked(useFrame).mock.calls[0];
    const [callback] = providerCall as unknown as [FrameCallback, number];
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.set(0, -32.94, 0); // distance = 32.94 = 2 * 16.47
    callback({ camera }, 0.016);

    expect(s.screenScale).toBeCloseTo(2.0, 3);
    expect(s.fovFactor).toBeCloseTo(1.0, 3);
  });

  it('isolates occlusion managers per SpatialEntityProvider viewport', () => {
    let managerA: CelestialOcclusionManager | null = null;
    let managerB: CelestialOcclusionManager | null = null;

    const ProbeA = () => {
      managerA = useOcclusionManager();
      return null;
    };
    const ProbeB = () => {
      managerB = useOcclusionManager();
      return null;
    };

    renderToString(
      createElement(
        React.Fragment,
        null,
        createElement(SpatialEntityProvider, null, createElement(ProbeA)),
        createElement(SpatialEntityProvider, null, createElement(ProbeB)),
      ),
    );

    expect(managerA).not.toBeNull();
    expect(managerB).not.toBeNull();
    expect(managerA).not.toBe(managerB);

    // Registering in managerA must not appear in managerB
    managerA!.register({
      id: 'entity-a',
      state: 'active',
      screenX: 100,
      screenY: 100,
      reticleRadius: 20,
      starRadius: 2,
      hasReticle: true,
      visible: true,
      updatedAt: 1,
    });

    expect(managerA!.getFootprint('entity-a')).toBeDefined();
    expect(managerB!.getFootprint('entity-a')).toBeUndefined();
  });

  describe('Frame-driven camera rig and lighting (Task 8)', () => {
    it('defines frame-driven lighting across reference frames', () => {
      expect(GALACTIC_FRAME.lighting).toBeDefined();
      expect(GALACTIC_FRAME.lighting?.ambientIntensity).toBe(0.4);
      expect(GALACTIC_FRAME.lighting?.directionalIntensity).toBe(0.4);

      expect(SYSTEM_FRAME.lighting).toBeDefined();
      expect(SYSTEM_FRAME.lighting?.ambientIntensity).toBe(0.5);
      expect(SYSTEM_FRAME.lighting?.directionalIntensity).toBe(0.5);

      expect(PLANETARY_FRAME.lighting).toBeDefined();
      expect(PLANETARY_FRAME.lighting?.ambientIntensity).toBe(1.0);
      expect(PLANETARY_FRAME.lighting?.directionalIntensity).toBe(0.0);
    });

    it('CartographicLighting renders ambient and directional lights matching frame preset', () => {
      const htmlGalactic = renderToString(
        createElement(
          SpatialFrameProvider,
          { frame: GALACTIC_FRAME },
          createElement(CartographicLighting),
        ),
      );
      expect(htmlGalactic).toContain('ambientLight');
      expect(htmlGalactic).toContain('directionalLight');

      const htmlPlanetary = renderToString(
        createElement(
          SpatialFrameProvider,
          { frame: PLANETARY_FRAME },
          createElement(CartographicLighting),
        ),
      );
      expect(htmlPlanetary).toContain('ambientLight');
      expect(htmlPlanetary).not.toContain('directionalLight');
    });

    it('CameraRig dynamically synchronises controls.minDistance and maxDistance from frame.camera', () => {
      mockControls.minDistance = 0;
      mockControls.maxDistance = 1000;

      renderToString(
        createElement(
          SpatialFrameProvider,
          { frame: GALACTIC_FRAME },
          createElement(CameraRig),
        ),
      );

      expect(mockControls.minDistance).toBe(GALACTIC_FRAME.camera.minDistance);
      expect(mockControls.maxDistance).toBe(GALACTIC_FRAME.camera.maxDistance);

      renderToString(
        createElement(
          SpatialFrameProvider,
          { frame: SYSTEM_FRAME },
          createElement(CameraRig),
        ),
      );

      expect(mockControls.minDistance).toBe(SYSTEM_FRAME.camera.minDistance);
      expect(mockControls.maxDistance).toBe(SYSTEM_FRAME.camera.maxDistance);
    });

    it('SpatialViewport mounts CameraRig and CartographicLighting', () => {
      const html = renderToString(
        createElement(SpatialViewport, { frame: GALACTIC_FRAME, entities: [] }),
      );
      expect(html).toContain('ambientLight');
    });

    it('StoryCanvas mounts cleanly with shared canvas wrapper and overlay', () => {
      const html = renderToString(
        createElement(
          StoryCanvas,
          {
            frame: GALACTIC_FRAME,
            overlay: createElement('div', { 'data-testid': 'story-overlay' }, 'Overlay'),
          },
          createElement('div', { 'data-testid': 'story-child' }, 'Child'),
        ),
      );
      expect(html).toContain('story-overlay');
      expect(html).toContain('canvasContainer');
      expect(html).toContain('<canvas');
    });
  });
});
