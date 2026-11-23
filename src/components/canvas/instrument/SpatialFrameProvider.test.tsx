import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import ReactThreeTest from '@react-three/test-renderer';
import {
  GALACTIC_FRAME,
  SYSTEM_FRAME,
  PLANETARY_FRAME,
  SpatialFrameProvider,
  useSpatialFrame,
  CartographicInstrument,
  CartographicLighting,
} from './index';
import {
  setCrossScaleInstrumentFade,
  resetCrossScaleInstrumentFade,
} from './crossScaleFadeState';
import { SpatialViewport } from '../viewport/SpatialViewport';
import {
  FRAME_PRIORITY,
  ORBIT_CONTROLS_PRIORITY,
  REFERENCE_INSTRUMENT_FOOTPRINT,
  REFERENCE_FOV_DEG,
  SCREEN_HEIGHT_REFERENCE_SCALE,
} from '../engineConfig';
import {
  SpatialEntityProvider,
  useOcclusionManager,
  ApertureEvaluator,
} from '../entity';
import { createSpatialEntityStore } from '../entity/SpatialEntityStore';
import { useActiveStarsStore } from '../../../stores/useActiveStarsStore';

describe('Spatial frame ownership (one provider per viewport)', () => {
  beforeEach(() => {
    useActiveStarsStore.getState().clear();
    resetCrossScaleInstrumentFade();
  });

  afterEach(() => {
    resetCrossScaleInstrumentFade();
  });

  it('throws when a frame consumer is rendered outside a SpatialFrameProvider', () => {
    expect(() => {
      renderHook(() => useSpatialFrame());
    }).toThrow(/SpatialFrameProvider/);
  });

  it('CartographicInstrument consumes the enclosing provider instead of creating its own', async () => {
    let capturedFrame: typeof SYSTEM_FRAME | null = null;
    const Probe = () => {
      capturedFrame = useSpatialFrame().frameRef.current.frame;
      return null;
    };

    const renderer = await ReactThreeTest.create(
      <SpatialFrameProvider frame={SYSTEM_FRAME}>
        <CartographicInstrument>
          <Probe />
        </CartographicInstrument>
      </SpatialFrameProvider>,
    );

    expect(capturedFrame).toBe(SYSTEM_FRAME);
    await renderer.unmount();
  });

  it('orders camera writers, controls, frame maths and camera rig deterministically', () => {
    expect(FRAME_PRIORITY.cameraTransition).toBeLessThan(ORBIT_CONTROLS_PRIORITY);
    expect(ORBIT_CONTROLS_PRIORITY).toBeLessThan(FRAME_PRIORITY.spatialFrame);
    expect(FRAME_PRIORITY.spatialFrame).toBeLessThan(FRAME_PRIORITY.cameraRig);
    expect(FRAME_PRIORITY.cameraRig).toBeLessThan(0);
  });

  it('centralises screen-scale constants and dynamic evaluations in SpatialFrameState', async () => {
    let capturedState: ReturnType<typeof useSpatialFrame>['frameRef']['current'] | null = null;
    const Probe = () => {
      capturedState = useSpatialFrame().frameRef.current;
      return null;
    };

    const renderer = await ReactThreeTest.create(
      <SpatialFrameProvider frame={GALACTIC_FRAME}>
        <Probe />
      </SpatialFrameProvider>,
    );

    expect(capturedState).not.toBeNull();
    const s = capturedState!;
    expect(s.referenceFootprint).toBe(REFERENCE_INSTRUMENT_FOOTPRINT);
    expect(s.referenceFovDeg).toBe(REFERENCE_FOV_DEG);
    expect(s.screenHeightReferenceScale).toBe(SCREEN_HEIGHT_REFERENCE_SCALE);
    expect(s.fovFactor).toBe(1.0);
    expect(s.screenScale).toBeGreaterThan(0);
    expect(s.instrumentFade).toBe(1.0);

    setCrossScaleInstrumentFade(0.35);
    await renderer.advanceFrames(1, 0.016);
    expect(s.instrumentFade).toBeCloseTo(0.35);

    resetCrossScaleInstrumentFade();
    await renderer.advanceFrames(1, 0.016);
    expect(s.instrumentFade).toBe(1.0);

    await renderer.unmount();
  });

  it('isolates occlusion managers per SpatialEntityProvider viewport', () => {
    const { result: resultA } = renderHook(() => useOcclusionManager(), {
      wrapper: ({ children }) => <SpatialEntityProvider>{children}</SpatialEntityProvider>,
    });

    const { result: resultB } = renderHook(() => useOcclusionManager(), {
      wrapper: ({ children }) => <SpatialEntityProvider>{children}</SpatialEntityProvider>,
    });

    const managerA = resultA.current;
    const managerB = resultB.current;

    expect(managerA).not.toBe(managerB);

    managerA.register({
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

    expect(managerA.getFootprint('entity-a')).toBeDefined();
    expect(managerB.getFootprint('entity-a')).toBeUndefined();
  });

  describe('Frame-driven camera rig and lighting', () => {
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

    it('CartographicLighting renders ambient and directional lights matching frame preset', async () => {
      const rendererGalactic = await ReactThreeTest.create(
        <SpatialFrameProvider frame={GALACTIC_FRAME}>
          <CartographicLighting />
        </SpatialFrameProvider>,
      );
      expect(rendererGalactic.scene.findAll((node) => node.type === 'AmbientLight')).toHaveLength(1);
      expect(rendererGalactic.scene.findAll((node) => node.type === 'DirectionalLight')).toHaveLength(1);
      await rendererGalactic.unmount();

      const rendererPlanetary = await ReactThreeTest.create(
        <SpatialFrameProvider frame={PLANETARY_FRAME}>
          <CartographicLighting />
        </SpatialFrameProvider>,
      );
      expect(rendererPlanetary.scene.findAll((node) => node.type === 'AmbientLight')).toHaveLength(1);
      expect(rendererPlanetary.scene.findAll((node) => node.type === 'DirectionalLight')).toHaveLength(0);
      await rendererPlanetary.unmount();
    });

    it('SpatialViewport mounts CameraRig and CartographicLighting', async () => {
      const renderer = await ReactThreeTest.create(
        <SpatialViewport frame={GALACTIC_FRAME} entities={[]} />,
      );
      expect(renderer.scene.findAll((node) => node.type === 'AmbientLight')).toHaveLength(1);
      await renderer.unmount();
    });
  });

  describe('ApertureEvaluator active threshold cutoff', () => {
    it('activates all stars when <= active cutoff, and zero stars when > active cutoff', async () => {
      const store = createSpatialEntityStore();
      for (let i = 0; i < 97; i++) {
        store.getState().registerEntity({
          id: `star-${i}`,
          name: `Star ${i}`,
          position: [0, 0, 0],
          classification: 'star',
        });
      }

      const renderer = await ReactThreeTest.create(
        <SpatialFrameProvider frame={GALACTIC_FRAME}>
          <SpatialEntityProvider store={store}>
            <ApertureEvaluator />
          </SpatialEntityProvider>
        </SpatialFrameProvider>,
      );

      // Advance frame loop to run ApertureEvaluator
      await renderer.advanceFrames(1, 0.016);

      // 97 registered entities inside aperture exceeds cutoff => apertureIds is cleared to 0
      expect(store.getState().apertureIds.size).toBe(0);

      // Unregister 70 entities so 27 remain (well below cutoff)
      for (let i = 27; i < 97; i++) {
        store.getState().unregisterEntity(`star-${i}`);
      }
      await renderer.advanceFrames(1, 0.016);
      expect(store.getState().apertureIds.size).toBe(27);

      await renderer.unmount();
    });

    it('clears apertureIds when useActiveStarsStore has more summaries than activeCutoff even if SpatialEntityStore has fewer', async () => {
      const store = createSpatialEntityStore();
      for (let i = 0; i < 5; i++) {
        store.getState().registerEntity({
          id: `star-${i}`,
          name: `Star ${i}`,
          position: [i * 0.1, 0, 0],
          classification: 'star',
        });
      }

      const renderer = await ReactThreeTest.create(
        <SpatialFrameProvider frame={GALACTIC_FRAME}>
          <SpatialEntityProvider store={store}>
            <ApertureEvaluator />
          </SpatialEntityProvider>
        </SpatialFrameProvider>,
      );

      const fakeSummaries = Array.from({ length: 97 }, (_, i) => ({
        id: `streamed-${i}`,
        name: `Streamed ${i}`,
        x: 0,
        y: 0,
        z: 0,
        dist: 0,
        mag: 5,
        absmag: 4,
        spect: 'G2V',
        starCount: 1,
        planetCount: 0,
        hasHabitableCandidate: false,
        sectorId: 'sector_+000_+000_+000',
      }));
      useActiveStarsStore.getState().setSummaries(fakeSummaries);

      await renderer.advanceFrames(1, 0.016);
      expect(store.getState().apertureIds.size).toBe(0);

      useActiveStarsStore.getState().setSummaries(fakeSummaries.slice(0, 50));
      await renderer.advanceFrames(1, 0.016);
      expect(store.getState().apertureIds.size).toBe(5);

      await renderer.unmount();
    });
  });
});
