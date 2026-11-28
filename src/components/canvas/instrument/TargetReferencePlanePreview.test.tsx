import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import ReactThreeTest from '@react-three/test-renderer';
import { TargetReferencePlanePreview } from './TargetReferencePlanePreview';
import { CrossScaleChoreographyProvider } from './CrossScaleChoreographyContext';
import {
  clearCrossScalePlanePreview,
  getCrossScalePlanePreviewState,
  setCrossScalePlanePreview,
  startCrossScalePlanePreviewContract,
  startCrossScalePlanePreviewExpand,
  updateCrossScalePlanePreviewProgress,
} from './crossScaleVisualState';
import { easeOutCubic } from '../../../utils/cameraEasing';
import { NOOP_RAYCAST } from '../engineConfig';
import { useThreeTokenStore } from '../../../stores/useThreeTokenStore';

describe('TargetReferencePlanePreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearCrossScalePlanePreview();
    useThreeTokenStore.getState().resetTokens();
  });

  afterEach(() => {
    clearCrossScalePlanePreview();
    vi.restoreAllMocks();
  });

  it('renders hidden concentric rings only (no fill disc or interior reference marks) with NOOP_RAYCAST', async () => {
    const renderer = await ReactThreeTest.create(<TargetReferencePlanePreview />);

    const group = renderer.scene.findByProps({ name: 'target-reference-plane-preview' });
    const outerRing = renderer.scene.findByProps({ name: 'target-plane-preview-outer-ring' });
    const innerRing1 = renderer.scene.findByProps({ name: 'target-plane-preview-inner-ring-1' });
    const innerRing2 = renderer.scene.findByProps({ name: 'target-plane-preview-inner-ring-2' });

    expect(group.instance.visible).toBe(false);
    expect(renderer.scene.findAll((node) => node.props.name === 'target-plane-preview-disc')).toHaveLength(0);
    expect(
      renderer.scene.findAll((node) => node.props.name === 'target-plane-preview-reference-marks'),
    ).toHaveLength(0);
    expect(outerRing.props.raycast).toBe(NOOP_RAYCAST);
    expect(innerRing1.props.raycast).toBe(NOOP_RAYCAST);
    expect(innerRing2.props.raycast).toBe(NOOP_RAYCAST);

    await renderer.unmount();
  });

  it('positions, orients, scales, and fades concentric ring materials from crossScaleVisualState and tokens', async () => {
    const renderer = await ReactThreeTest.create(<TargetReferencePlanePreview />);

    const group = renderer.scene.findByProps({ name: 'target-reference-plane-preview' })
      .instance as THREE.Group;
    const outerRing = renderer.scene.findByProps({ name: 'target-plane-preview-outer-ring' })
      .instance as THREE.Mesh;
    const innerRing1 = renderer.scene.findByProps({ name: 'target-plane-preview-inner-ring-1' })
      .instance as THREE.Mesh;
    const innerRing2 = renderer.scene.findByProps({ name: 'target-plane-preview-inner-ring-2' })
      .instance as THREE.Mesh;

    const outerMat = outerRing.material as THREE.MeshBasicMaterial;
    const innerMat1 = innerRing1.material as THREE.MeshBasicMaterial;
    const innerMat2 = innerRing2.material as THREE.MeshBasicMaterial;
    const tokens = useThreeTokenStore.getState().tokens;

    const inclinationRad = Math.PI / 3;
    const ascendingNodeRad = Math.PI / 4;
    const maxRadius = 12;
    const radiusProgress = 0.5;
    const opacity = 0.8;

    setCrossScalePlanePreview({
      position: [4, -5, 6],
      inclinationRad,
      ascendingNodeRad,
      maxRadius,
      radiusProgress,
      opacity,
    });

    await renderer.advanceFrames(1, 0.016);

    expect(group.visible).toBe(true);
    expect(group.position.toArray()).toEqual([4, -5, 6]);

    const expectedScale = easeOutCubic(radiusProgress) * maxRadius;
    expect(group.scale.x).toBeCloseTo(expectedScale, 5);
    expect(group.scale.y).toBeCloseTo(expectedScale, 5);

    const expectedAxis = new THREE.Vector3(
      Math.cos(ascendingNodeRad),
      Math.sin(ascendingNodeRad),
      0,
    ).normalize();
    const expectedQuat = new THREE.Quaternion().setFromAxisAngle(expectedAxis, inclinationRad);
    expect(Math.abs(group.quaternion.dot(expectedQuat))).toBeCloseTo(1, 5);

    expect(outerMat.color.getHexString()).toBe(
      new THREE.Color(tokens.datumPlaneMajorColor).getHexString(),
    );
    expect(innerMat1.color.getHexString()).toBe(
      new THREE.Color(tokens.datumPlaneMinorColor).getHexString(),
    );
    expect(innerMat2.color.getHexString()).toBe(
      new THREE.Color(tokens.datumPlaneMinorColor).getHexString(),
    );

    expect(outerMat.opacity).toBeCloseTo(tokens.datumPlaneMajorAlpha * opacity, 5);
    expect(innerMat1.opacity).toBeCloseTo(tokens.datumPlaneMinorAlpha * opacity, 5);
    expect(innerMat2.opacity).toBeCloseTo(tokens.datumPlaneMinorAlpha * opacity, 5);

    updateCrossScalePlanePreviewProgress(0, 0);
    await renderer.advanceFrames(1, 0.016);
    expect(group.visible).toBe(false);
    expect(outerMat.opacity).toBe(0);
    expect(innerMat1.opacity).toBe(0);
    expect(innerMat2.opacity).toBe(0);

    setCrossScalePlanePreview({
      position: [0, 0, 0],
      inclinationRad: 0.5,
      ascendingNodeRad: 0,
      maxRadius: 5,
      radiusProgress: 0,
      opacity: 1,
    });
    await renderer.advanceFrames(1, 0.016);
    expect(group.visible).toBe(true);
    expect(group.scale.x).toBeCloseTo(0.001, 5);

    clearCrossScalePlanePreview();
    await renderer.advanceFrames(1, 0.016);
    expect(group.visible).toBe(false);

    await renderer.unmount();
  });

  it('disposes ring geometries on unmount and performs zero clone allocations in useFrame', async () => {
    const renderer = await ReactThreeTest.create(<TargetReferencePlanePreview />);

    const outerRing = renderer.scene.findByProps({ name: 'target-plane-preview-outer-ring' })
      .instance as THREE.Mesh;
    const innerRing1 = renderer.scene.findByProps({ name: 'target-plane-preview-inner-ring-1' })
      .instance as THREE.Mesh;
    const innerRing2 = renderer.scene.findByProps({ name: 'target-plane-preview-inner-ring-2' })
      .instance as THREE.Mesh;

    const outerDispose = vi.spyOn(outerRing.geometry, 'dispose');
    const inner1Dispose = vi.spyOn(innerRing1.geometry, 'dispose');
    const inner2Dispose = vi.spyOn(innerRing2.geometry, 'dispose');
    const vecCloneSpy = vi.spyOn(THREE.Vector3.prototype, 'clone');
    const quatCloneSpy = vi.spyOn(THREE.Quaternion.prototype, 'clone');

    setCrossScalePlanePreview({
      position: [1, 2, 3],
      inclinationRad: 0.8,
      ascendingNodeRad: 0.2,
      maxRadius: 6,
      radiusProgress: 0.5,
      opacity: 1,
    });
    await renderer.advanceFrames(2, 0.016);

    expect(vecCloneSpy).not.toHaveBeenCalled();
    expect(quatCloneSpy).not.toHaveBeenCalled();

    await renderer.unmount();

    expect(outerDispose).toHaveBeenCalledTimes(1);
    expect(inner1Dispose).toHaveBeenCalledTimes(1);
    expect(inner2Dispose).toHaveBeenCalledTimes(1);
  });

  it('self-animates expand to holding with callback and contract to hidden while invalidating only during animation', async () => {
    const renderer = await ReactThreeTest.create(<TargetReferencePlanePreview />);
    const group = renderer.scene.findByProps({ name: 'target-reference-plane-preview' })
      .instance as THREE.Group;
    const outerRing = renderer.scene.findByProps({ name: 'target-plane-preview-outer-ring' })
      .instance as THREE.Mesh;
    const outerMat = outerRing.material as THREE.MeshBasicMaterial;
    const tokens = useThreeTokenStore.getState().tokens;
    const onComplete = vi.fn();

    startCrossScalePlanePreviewExpand({
      position: [2, 3, 4],
      inclinationRad: Math.PI / 4,
      ascendingNodeRad: 0.3,
      maxRadius: 10,
      durationSec: 0.1,
      onComplete,
    });

    await renderer.advanceFrames(1, 0.05);
    expect(group.visible).toBe(true);
    expect(group.scale.x).toBeCloseTo(easeOutCubic(0.5) * 10, 4);
    expect(outerMat.opacity).toBeCloseTo(tokens.datumPlaneMajorAlpha, 5);
    expect(onComplete).not.toHaveBeenCalled();

    await renderer.advanceFrames(1, 0.05);
    expect(getCrossScalePlanePreviewState().mode).toBe('holding');
    expect(group.scale.x).toBeCloseTo(10, 4);
    expect(onComplete).toHaveBeenCalledTimes(1);

    startCrossScalePlanePreviewContract(0.1);
    await renderer.advanceFrames(1, 0.05);
    expect(group.visible).toBe(true);
    expect(group.scale.x).toBeCloseTo(10, 4);
    expect(outerMat.opacity).toBeCloseTo(
      tokens.datumPlaneMajorAlpha * (1 - easeOutCubic(0.5)),
      5,
    );

    await renderer.advanceFrames(1, 0.05);
    expect(getCrossScalePlanePreviewState().active).toBe(false);
    expect(group.visible).toBe(false);
    expect(outerMat.opacity).toBe(0);

    await renderer.unmount();
  });

  it('reads plane preview state from enclosing CrossScaleChoreographyProvider rather than global default', async () => {
    const renderer = await ReactThreeTest.create(
      <CrossScaleChoreographyProvider>
        <TargetReferencePlanePreview />
      </CrossScaleChoreographyProvider>,
    );
    const group = renderer.scene.findByProps({ name: 'target-reference-plane-preview' })
      .instance as THREE.Group;

    setCrossScalePlanePreview({
      position: [1, 2, 3],
      inclinationRad: 0.4,
      ascendingNodeRad: 0.1,
      maxRadius: 6,
      radiusProgress: 1,
      opacity: 0.8,
    });

    await renderer.advanceFrames(1, 0.016);
    expect(group.visible).toBe(true);
    expect(group.position.toArray()).toEqual([1, 2, 3]);

    await renderer.unmount();
  });

  it('skips redundant material opacity writes across idle frames when preview remains hidden', async () => {
    const renderer = await ReactThreeTest.create(<TargetReferencePlanePreview />);
    const outerRingMesh = renderer.scene.findByProps({ name: 'target-plane-preview-outer-ring' })
      .instance as THREE.Mesh;
    const outerMat = outerRingMesh.material as THREE.MeshBasicMaterial;

    await renderer.advanceFrames(1, 0.016);
    let opacityWrites = 0;
    let currentOpacity = outerMat.opacity;
    Object.defineProperty(outerMat, 'opacity', {
      configurable: true,
      get: () => currentOpacity,
      set: (value: number) => {
        opacityWrites += 1;
        currentOpacity = value;
      },
    });

    await renderer.advanceFrames(3, 0.016);
    expect(opacityWrites).toBe(0);

    await renderer.unmount();
  });
});
