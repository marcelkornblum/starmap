import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import ReactThreeTest from '@react-three/test-renderer';
import { useFrame } from '@react-three/fiber';
import { BearingVectors } from './BearingVectors';
import { SpatialFrameProvider, GALACTIC_FRAME, SYSTEM_FRAME } from './index';
import {
  setCrossScaleInstrumentFade,
  resetCrossScaleInstrumentFade,
} from './crossScaleFadeState';
import { NOOP_RAYCAST } from '../engineConfig';
import { useThreeTokenStore } from '../../../stores/useThreeTokenStore';

describe('BearingVectors Primitive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetCrossScaleInstrumentFade();
  });

  afterEach(() => {
    resetCrossScaleInstrumentFade();
  });

  it('renders axis spokes and cardinal bearings for GALACTIC_FRAME', async () => {
    const renderer = await ReactThreeTest.create(
      <SpatialFrameProvider frame={GALACTIC_FRAME}>
        <BearingVectors showAxisLines={true} showCardinalBearings={true} />
      </SpatialFrameProvider>,
    );

    expect(renderer.scene.findByProps({ name: 'bearing-vectors' })).toBeDefined();
    expect(renderer.scene.findByProps({ name: 'axis-spokes' })).toBeDefined();
    expect(renderer.scene.findByProps({ name: 'axis-neg-x' })).toBeDefined();
    expect(renderer.scene.findByProps({ name: 'axis-pos-z' })).toBeDefined();
    expect(renderer.scene.findByProps({ name: 'cardinal-bearings' })).toBeDefined();
    expect(renderer.scene.findByProps({ name: 'bearing-core' })).toBeDefined();
    expect(renderer.scene.findByProps({ name: 'bearing-orbital' })).toBeDefined();

    await renderer.unmount();
  });

  it('renders zero bearings when cardinal bearings are disabled or absent', async () => {
    const renderer = await ReactThreeTest.create(
      <SpatialFrameProvider frame={SYSTEM_FRAME}>
        <BearingVectors showCardinalBearings={false} />
      </SpatialFrameProvider>,
    );

    expect(renderer.scene.findByProps({ name: 'bearing-vectors' })).toBeDefined();
    const cardinalBearings = renderer.scene.findAll((node) => node.props.name === 'cardinal-bearings');
    expect(cardinalBearings).toHaveLength(0);

    await renderer.unmount();
  });

  it('supports frame-neutral props (centerDistance, extent)', async () => {
    const renderer = await ReactThreeTest.create(
      <SpatialFrameProvider frame={GALACTIC_FRAME}>
        <BearingVectors centerDistance={3000} extent={1500} />
      </SpatialFrameProvider>,
    );

    expect(renderer.scene.findByProps({ name: 'bearing-vectors' })).toBeDefined();
    await renderer.unmount();
  });

  it('attaches NOOP_RAYCAST to all bearing and spoke lineSegments', async () => {
    const renderer = await ReactThreeTest.create(
      <SpatialFrameProvider frame={GALACTIC_FRAME}>
        <BearingVectors showAxisLines={true} showCardinalBearings={true} />
      </SpatialFrameProvider>,
    );
    const spokeNegX = renderer.scene.findByProps({ name: 'axis-neg-x' });
    expect(spokeNegX.props.raycast).toBe(NOOP_RAYCAST);
    const bearingCore = renderer.scene.findByProps({ name: 'bearing-core' });
    expect(bearingCore.props.raycast).toBe(NOOP_RAYCAST);
    const bearingOrbital = renderer.scene.findByProps({ name: 'bearing-orbital' });
    expect(bearingOrbital.props.raycast).toBe(NOOP_RAYCAST);
    await renderer.unmount();
  });

  it('dissolves axis spoke and bearing opacities to 0 when instrumentFade is 0 and restores when 1', async () => {
    const ObliqueCamera = () => {
      useFrame(({ camera }) => {
        camera.position.set(10, -10, 10);
      }, -200);
      return null;
    };

    const renderer = await ReactThreeTest.create(
      <SpatialFrameProvider frame={GALACTIC_FRAME}>
        <ObliqueCamera />
        <BearingVectors showAxisLines={true} showCardinalBearings={true} />
      </SpatialFrameProvider>,
    );

    const tokens = useThreeTokenStore.getState().tokens;
    const negYMat = (renderer.scene.findByProps({ name: 'axis-neg-y' }).instance as THREE.LineSegments).material as THREE.LineBasicMaterial;
    const posZMat = (renderer.scene.findByProps({ name: 'axis-pos-z' }).instance as THREE.LineSegments).material as THREE.LineBasicMaterial;
    const coreMat = (renderer.scene.findByProps({ name: 'bearing-core' }).instance as THREE.LineSegments).material as THREE.LineBasicMaterial;
    const orbMat = (renderer.scene.findByProps({ name: 'bearing-orbital' }).instance as THREE.LineSegments).material as THREE.LineBasicMaterial;

    await renderer.advanceFrames(1, 0.016);
    expect(posZMat.opacity).toBeGreaterThan(0);
    expect(coreMat.opacity).toBeCloseTo(tokens.bearingCoreAlpha);
    expect(orbMat.opacity).toBeCloseTo(tokens.bearingOrbitalAlpha);

    setCrossScaleInstrumentFade(0);
    await renderer.advanceFrames(1, 0.016);
    expect(negYMat.opacity).toBe(0);
    expect(posZMat.opacity).toBe(0);
    expect(coreMat.opacity).toBe(0);
    expect(orbMat.opacity).toBe(0);

    setCrossScaleInstrumentFade(1);
    await renderer.advanceFrames(1, 0.016);
    expect(posZMat.opacity).toBeGreaterThan(0);
    expect(coreMat.opacity).toBeCloseTo(tokens.bearingCoreAlpha);
    expect(orbMat.opacity).toBeCloseTo(tokens.bearingOrbitalAlpha);

    await renderer.unmount();
  });
});
