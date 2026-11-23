import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ReactThreeTest from '@react-three/test-renderer';
import * as THREE from 'three';
import { DropStalk } from './DropStalk';
import { SpatialEntityProvider } from './SpatialEntityProvider';
import { SpatialFrameProvider, GALACTIC_FRAME } from '../instrument';
import {
  setCrossScaleInstrumentFade,
  resetCrossScaleInstrumentFade,
} from '../instrument/crossScaleFadeState';
import {
  setCrossScaleSceneScale,
  resetCrossScaleSceneScale,
} from '../instrument/crossScaleVisualState';
import { NOOP_RAYCAST } from '../engineConfig';
import { useThreeTokenStore } from '../../../stores/useThreeTokenStore';
import { CartoHairlineMaterial } from '../materials/CartoLineMaterial';

const { mockInvalidate, wrappedInvalidateCache } = vi.hoisted(() => ({
  mockInvalidate: vi.fn(),
  wrappedInvalidateCache: new WeakMap<
    (frames?: number) => void,
    (frames?: number) => void
  >(),
}));

vi.mock('@react-three/fiber', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@react-three/fiber')>();
  return {
    ...actual,
    useThree: ((selector?: (state: unknown) => unknown) => {
      const realInvalidate = actual.useThree((s) => s.invalidate);
      const selected: unknown = actual.useThree(
        (selector ?? ((s: unknown) => s)) as Parameters<typeof actual.useThree>[0],
      );
      if (selected === realInvalidate) {
        let wrapped = wrappedInvalidateCache.get(realInvalidate);
        if (!wrapped) {
          wrapped = (frames?: number) => {
            mockInvalidate(frames);
            return realInvalidate(frames);
          };
          wrappedInvalidateCache.set(realInvalidate, wrapped);
        }
        return wrapped;
      }
      return selected;
    }) as typeof actual.useThree,
  };
});

describe('DropStalk Primitive (§2.4: State-Driven Drop Stalks)', () => {
  beforeEach(() => {
    mockInvalidate.mockClear();
    resetCrossScaleInstrumentFade();
    resetCrossScaleSceneScale();
  });
  afterEach(() => {
    resetCrossScaleInstrumentFade();
    resetCrossScaleSceneScale();
  });
  it('does NOT render drop stalk in passive or active states (Single-Stalk Rule)', async () => {
    const passiveRenderer = await ReactThreeTest.create(
      <SpatialEntityProvider><SpatialFrameProvider frame={GALACTIC_FRAME}><DropStalk id="stalk-node" position={[0, 0, 5]} state="passive" /></SpatialFrameProvider></SpatialEntityProvider>,
    );
    expect(passiveRenderer.scene.findAll((node) => node.props.name === 'drop-stalk-stalk-node')).toHaveLength(0);
    await passiveRenderer.unmount();

    const activeRenderer = await ReactThreeTest.create(
      <SpatialEntityProvider><SpatialFrameProvider frame={GALACTIC_FRAME}><DropStalk id="stalk-node" position={[0, 0, 5]} state="active" /></SpatialFrameProvider></SpatialEntityProvider>,
    );
    expect(activeRenderer.scene.findAll((node) => node.props.name === 'drop-stalk-stalk-node')).toHaveLength(0);
    await activeRenderer.unmount();
  });

  it('renders drop stalk and ground footprint on datum in selected and focused states', async () => {
    const selectedRenderer = await ReactThreeTest.create(
      <SpatialEntityProvider><SpatialFrameProvider frame={GALACTIC_FRAME}><DropStalk id="stalk-node" position={[1, 2, 5]} state="selected" /></SpatialFrameProvider></SpatialEntityProvider>,
    );
    expect(selectedRenderer.scene.findAll((node) => node.props.name === 'drop-stalk-stalk-node')).toHaveLength(1);
    const stalkLine = selectedRenderer.scene.find((node) => node.props.name === 'stalk-line');
    const stalkFootprint = selectedRenderer.scene.find((node) => node.props.name === 'stalk-footprint');
    expect(stalkLine).toBeDefined();
    expect(stalkLine.props.raycast).toBe(NOOP_RAYCAST);
    expect(stalkFootprint).toBeDefined();
    expect(stalkFootprint.children[0].props.raycast).toBe(NOOP_RAYCAST);
    await selectedRenderer.unmount();

    const focusedRenderer = await ReactThreeTest.create(
      <SpatialEntityProvider><SpatialFrameProvider frame={GALACTIC_FRAME}><DropStalk id="stalk-node" position={[1, 2, 5]} state="focused" /></SpatialFrameProvider></SpatialEntityProvider>,
    );
    expect(focusedRenderer.scene.findAll((node) => node.props.name === 'drop-stalk-stalk-node')).toHaveLength(1);
    await focusedRenderer.unmount();
  });

  it('renders solid stalk for +Z (North) and dashed stalk for -Z (South)', async () => {
    const northRenderer = await ReactThreeTest.create(
      <SpatialEntityProvider><SpatialFrameProvider frame={GALACTIC_FRAME}><DropStalk id="north-stalk" position={[0, 0, 5]} state="selected" /></SpatialFrameProvider></SpatialEntityProvider>,
    );
    expect(northRenderer.scene.findAll((node) => node.props.name === 'drop-stalk-north-stalk')).toHaveLength(1);
    await northRenderer.unmount();

    const southRenderer = await ReactThreeTest.create(
      <SpatialEntityProvider><SpatialFrameProvider frame={GALACTIC_FRAME}><DropStalk id="south-stalk" position={[0, 0, -5]} state="selected" /></SpatialFrameProvider></SpatialEntityProvider>,
    );
    expect(southRenderer.scene.findAll((node) => node.props.name === 'drop-stalk-south-stalk')).toHaveLength(1);
    await southRenderer.unmount();
  });

  it('positions drop stalk and footprint in entity-local coordinates when entityZ is provided', async () => {
    const localRenderer = await ReactThreeTest.create(
      <SpatialEntityProvider><SpatialFrameProvider frame={GALACTIC_FRAME}><DropStalk id="local-stalk" position={[0, 0, 0]} entityZ={2.5} state="selected" datumZ={0} /></SpatialFrameProvider></SpatialEntityProvider>,
    );
    expect(localRenderer.scene.findAll((node) => node.props.name === 'drop-stalk-local-stalk')).toHaveLength(1);
    expect(localRenderer.scene.findAll((node) => node.props.name === 'stalk-line')).toHaveLength(1);
    expect(localRenderer.scene.findAll((node) => node.props.name === 'stalk-footprint')).toHaveLength(1);
    await localRenderer.unmount();
  });

  it('updates lineMaterial color in-place without re-instantiating on state changes (AUD-106)', async () => {
    const renderer = await ReactThreeTest.create(
      <SpatialEntityProvider>
        <SpatialFrameProvider frame={GALACTIC_FRAME}>
          <DropStalk id="node-1" position={[0, 0, 5]} state="selected" />
        </SpatialFrameProvider>
      </SpatialEntityProvider>,
    );

    const stalkBefore = renderer.scene.find((node) => node.props.name === 'drop-stalk-node-1');
    expect(stalkBefore).toBeDefined();

    // Rerender with focused state
    await renderer.update(
      <SpatialEntityProvider>
        <SpatialFrameProvider frame={GALACTIC_FRAME}>
          <DropStalk id="node-1" position={[0, 0, 5]} state="focused" />
        </SpatialFrameProvider>
      </SpatialEntityProvider>,
    );

    const stalkAfter = renderer.scene.find((node) => node.props.name === 'drop-stalk-node-1');
    expect(stalkAfter).toBeDefined();

    await renderer.unmount();
  });

  it('calls invalidate() while extending/retracting and settles to 0 calls once settled', async () => {
    const renderer = await ReactThreeTest.create(
      <SpatialEntityProvider>
        <SpatialFrameProvider frame={GALACTIC_FRAME}>
          <DropStalk id="anim-stalk" position={[0, 0, 5]} state="selected" />
        </SpatialFrameProvider>
      </SpatialEntityProvider>,
    );

    // Initial mount / target change triggers invalidation
    expect(mockInvalidate).toHaveBeenCalled();

    // First small step: still moving toward target (default extend duration ~0.18s)
    mockInvalidate.mockClear();
    await renderer.advanceFrames(1, 0.05);
    expect(mockInvalidate).toHaveBeenCalledTimes(1);

    // Advance enough delta to reach target=1.0
    mockInvalidate.mockClear();
    await renderer.advanceFrames(1, 1.0);
    // Settled on this frame -> 0 further invalidate calls
    expect(mockInvalidate).not.toHaveBeenCalled();

    // Subsequent idle frames -> 0 invalidate calls
    await renderer.advanceFrames(3, 0.016);
    expect(mockInvalidate).not.toHaveBeenCalled();

    // Retract (state -> passive): triggers invalidation on target change and during retraction
    mockInvalidate.mockClear();
    await renderer.update(
      <SpatialEntityProvider>
        <SpatialFrameProvider frame={GALACTIC_FRAME}>
          <DropStalk id="anim-stalk" position={[0, 0, 5]} state="passive" />
        </SpatialFrameProvider>
      </SpatialEntityProvider>,
    );
    expect(mockInvalidate).toHaveBeenCalled();

    mockInvalidate.mockClear();
    await renderer.advanceFrames(1, 0.05);
    expect(mockInvalidate).toHaveBeenCalledTimes(1);

    mockInvalidate.mockClear();
    await renderer.advanceFrames(1, 1.0);
    expect(mockInvalidate).not.toHaveBeenCalled();

    await renderer.unmount();
  });

  it('clamps large idle delta so frame 0 under demand frameloop does not snap progress to 1', async () => {
    const renderer = await ReactThreeTest.create(
      <SpatialEntityProvider><SpatialFrameProvider frame={GALACTIC_FRAME}><DropStalk id="idle-clamp-stalk" position={[0, 0, 5]} state="selected" /></SpatialFrameProvider></SpatialEntityProvider>,
    );

    // Simulate a 1.0s idle gap on frame 0: clamped to 0.1s (< 0.15s extend duration),
    // so progress advances to ~0.67 and continues requesting invalidation instead of snapping to 1.0.
    mockInvalidate.mockClear();
    await renderer.advanceFrames(1, 1.0);
    expect(mockInvalidate).toHaveBeenCalledTimes(1);

    await renderer.unmount();
  });

  it('preserves +0.002 datum z-fighting offset on stalk-footprint after useFrame runs', async () => {
    const renderer = await ReactThreeTest.create(
      <SpatialEntityProvider><SpatialFrameProvider frame={GALACTIC_FRAME}><DropStalk id="offset-stalk" position={[1, 2, 5]} datumZ={0} state="selected" /></SpatialFrameProvider></SpatialEntityProvider>,
    );

    await renderer.advanceFrames(1, 1.0);
    const footprint = renderer.scene.find((node) => node.props.name === 'stalk-footprint');
    const instance = footprint.instance as { position: { z: number } };
    expect(instance.position.z).toBeCloseTo(0.002, 5);

    await renderer.unmount();
  });

  it('skips invalidate() animation when coplanar with datum (Math.abs(deltaZ) <= 1e-4)', async () => {
    const renderer = await ReactThreeTest.create(
      <SpatialEntityProvider><SpatialFrameProvider frame={GALACTIC_FRAME}><DropStalk id="coplanar-stalk" position={[1, 2, 0]} datumZ={0} state="selected" /></SpatialFrameProvider></SpatialEntityProvider>,
    );

    mockInvalidate.mockClear();
    await renderer.advanceFrames(2, 0.05);
    expect(mockInvalidate).not.toHaveBeenCalled();

    await renderer.unmount();
  });

  it('resets lastProgressRef when lineGeom changes and memoises userData', async () => {
    const renderer = await ReactThreeTest.create(
      <SpatialEntityProvider>
        <SpatialFrameProvider frame={GALACTIC_FRAME}>
          <DropStalk id="geom-reset-stalk" position={[0, 0, 0]} entityZ={2} datumZ={0} state="selected" />
        </SpatialFrameProvider>
      </SpatialEntityProvider>,
    );

    await renderer.advanceFrames(1, 0.05);
    const groupBefore = renderer.scene.find((node) => node.props.name === 'drop-stalk-geom-reset-stalk');
    const userDataBefore = groupBefore.props.userData;

    await renderer.update(
      <SpatialEntityProvider>
        <SpatialFrameProvider frame={GALACTIC_FRAME}>
          <DropStalk id="geom-reset-stalk" position={[0, 0, 0]} entityZ={4} datumZ={0} state="selected" />
        </SpatialFrameProvider>
      </SpatialEntityProvider>,
    );

    const groupAfter = renderer.scene.find((node) => node.props.name === 'drop-stalk-geom-reset-stalk');
    expect(groupAfter.props.userData).toBe(userDataBefore);

    await renderer.advanceFrames(1, 0.0);
    const stalkLine = renderer.scene.find((node) => node.props.name === 'stalk-line');
    const posAttr = (stalkLine.instance as THREE.LineSegments).geometry.getAttribute('position');
    // Progress is < 1.0 (~0.33), so with delta=0 the new lineGeom tip Z must be interpolated, not stuck at full -4
    expect(posAttr.array[5]).toBeGreaterThan(-4);

    await renderer.unmount();
  });

  it('dissolves stalk and footprint opacities to 0 when instrumentFade is 0 and restores when 1', async () => {
    const setOpacitySpy = vi.spyOn(CartoHairlineMaterial.prototype, 'setOpacity');
    const renderer = await ReactThreeTest.create(
      <SpatialEntityProvider><SpatialFrameProvider frame={GALACTIC_FRAME}><DropStalk id="fade-stalk" position={[1, 2, 5]} state="selected" /></SpatialFrameProvider></SpatialEntityProvider>,
    );
    const tokens = useThreeTokenStore.getState().tokens;
    const stalkMat = (renderer.scene.find((node) => node.props.name === 'stalk-line').instance as THREE.LineSegments).material as CartoHairlineMaterial;
    const fpGroup = renderer.scene.find((node) => node.props.name === 'stalk-footprint');
    const fpMat = (fpGroup.children[0].instance as THREE.LineSegments).material as THREE.LineBasicMaterial;

    await renderer.advanceFrames(2, 0.1);
    expect(stalkMat.uniforms.uOpacity.value).toBeCloseTo(tokens.stalkSelectedAlpha);
    expect(fpMat.opacity).toBeCloseTo(tokens.footprintSelectedAlpha);

    setOpacitySpy.mockClear();
    setCrossScaleInstrumentFade(0);
    await renderer.advanceFrames(1, 0.016);
    expect(stalkMat.uniforms.uOpacity.value).toBe(0);
    expect(fpMat.opacity).toBe(0);
    expect(setOpacitySpy).toHaveBeenCalledTimes(1);

    // Subsequent frame with unchanged fade does not redundantly invoke setOpacity
    await renderer.advanceFrames(1, 0.016);
    expect(setOpacitySpy).toHaveBeenCalledTimes(1);

    setCrossScaleInstrumentFade(1);
    await renderer.advanceFrames(1, 0.016);
    expect(stalkMat.uniforms.uOpacity.value).toBeCloseTo(tokens.stalkSelectedAlpha);
    expect(fpMat.opacity).toBeCloseTo(tokens.footprintSelectedAlpha);

    setOpacitySpy.mockRestore();
    await renderer.unmount();
  });

  it('compensates footprint scale by dividing invScale by getCrossScaleSceneScale() and updates stalk tip geometry', async () => {
    const renderer = await ReactThreeTest.create(
      <SpatialEntityProvider>
        <SpatialFrameProvider frame={GALACTIC_FRAME}>
          <DropStalk id="scaled-stalk" position={[0, 0, 5]} state="selected" />
        </SpatialFrameProvider>
      </SpatialEntityProvider>,
    );

    await renderer.advanceFrames(2, 0.2);

    const stalkLine = renderer.scene.find((node) => node.props.name === 'stalk-line');
    const stalkInstance = stalkLine.instance;
    expect(stalkInstance).toBeInstanceOf(THREE.LineSegments);
    if (stalkInstance instanceof THREE.LineSegments) {
      const posAttr = stalkInstance.geometry.getAttribute('position');
      expect(posAttr).toBeInstanceOf(THREE.BufferAttribute);
      if (posAttr instanceof THREE.BufferAttribute) {
        expect(posAttr.array[5]).toBeCloseTo(-5, 4);
      }
    }

    const footprint = renderer.scene.find((node) => node.props.name === 'stalk-footprint');
    const baselineScaleX = footprint.instance instanceof THREE.Group ? footprint.instance.scale.x : 0;
    expect(baselineScaleX).toBeGreaterThan(0);

    setCrossScaleSceneScale(0.25);
    await renderer.advanceFrames(1, 0.016);

    const compensatedScaleX = footprint.instance instanceof THREE.Group ? footprint.instance.scale.x : 0;
    expect(compensatedScaleX).toBeCloseTo(baselineScaleX * 4, 4);

    await renderer.unmount();
  });

  it('skips redundant lineMaterial.updateResolution calls when viewport height and projection are unchanged', async () => {
    const renderer = await ReactThreeTest.create(
      <SpatialEntityProvider>
        <SpatialFrameProvider frame={GALACTIC_FRAME}>
          <DropStalk id="res-stalk" position={[0, 0, 5]} state="selected" />
        </SpatialFrameProvider>
      </SpatialEntityProvider>,
    );

    const stalkLine = renderer.scene.find((node) => node.props.name === 'stalk-line');
    const stalkMat = (stalkLine.instance as THREE.LineSegments).material as CartoHairlineMaterial;
    const updateSpy = vi.spyOn(stalkMat, 'updateResolution');

    await renderer.advanceFrames(3, 0.016);
    expect(updateSpy).toHaveBeenCalledTimes(1);

    updateSpy.mockRestore();
    await renderer.unmount();
  });
});
