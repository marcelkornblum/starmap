import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import ReactThreeTest from '@react-three/test-renderer';
import { TargetReferencePlanePreview } from './TargetReferencePlanePreview';
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

  it('renders hidden by default with NOOP_RAYCAST on disc and ring meshes', async () => {
    const renderer = await ReactThreeTest.create(<TargetReferencePlanePreview />);

    const group = renderer.scene.findByProps({ name: 'target-reference-plane-preview' });
    const disc = renderer.scene.findByProps({ name: 'target-plane-preview-disc' });
    const outerRing = renderer.scene.findByProps({ name: 'target-plane-preview-outer-ring' });
    const innerRing = renderer.scene.findByProps({ name: 'target-plane-preview-inner-ring' });

    expect(group.instance.visible).toBe(false);
    expect(disc.props.raycast).toBe(NOOP_RAYCAST);
    expect(outerRing.props.raycast).toBe(NOOP_RAYCAST);
    expect(innerRing.props.raycast).toBe(NOOP_RAYCAST);

    await renderer.unmount();
  });

  it('positions, orients, scales, and fades from crossScaleVisualState and semantic tokens', async () => {
    const renderer = await ReactThreeTest.create(<TargetReferencePlanePreview />);

    const group = renderer.scene.findByProps({ name: 'target-reference-plane-preview' })
      .instance as THREE.Group;
    const disc = renderer.scene.findByProps({ name: 'target-plane-preview-disc' })
      .instance as THREE.Mesh;
    const outerRing = renderer.scene.findByProps({ name: 'target-plane-preview-outer-ring' })
      .instance as THREE.Mesh;
    const innerRing = renderer.scene.findByProps({ name: 'target-plane-preview-inner-ring' })
      .instance as THREE.Mesh;

    const discMat = disc.material as THREE.MeshBasicMaterial;
    const outerMat = outerRing.material as THREE.MeshBasicMaterial;
    const innerMat = innerRing.material as THREE.MeshBasicMaterial;
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

    expect(discMat.color.getHexString()).toBe(
      new THREE.Color(tokens.datumPlaneFillColor).getHexString(),
    );
    expect(outerMat.color.getHexString()).toBe(
      new THREE.Color(tokens.datumPlaneMajorColor).getHexString(),
    );
    expect(innerMat.color.getHexString()).toBe(
      new THREE.Color(tokens.datumPlaneMinorColor).getHexString(),
    );

    expect(discMat.opacity).toBeCloseTo(tokens.datumPlaneFillAlpha * opacity, 5);
    expect(outerMat.opacity).toBeCloseTo(tokens.datumPlaneMajorAlpha * opacity, 5);
    expect(innerMat.opacity).toBeCloseTo(tokens.datumPlaneMinorAlpha * opacity, 5);

    updateCrossScalePlanePreviewProgress(0, 0);
    await renderer.advanceFrames(1, 0.016);
    expect(group.visible).toBe(false);
    expect(discMat.opacity).toBe(0);
    expect(outerMat.opacity).toBe(0);
    expect(innerMat.opacity).toBe(0);

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

  it('disposes geometries on unmount and performs zero clone allocations in useFrame', async () => {
    const renderer = await ReactThreeTest.create(<TargetReferencePlanePreview />);

    const disc = renderer.scene.findByProps({ name: 'target-plane-preview-disc' })
      .instance as THREE.Mesh;
    const outerRing = renderer.scene.findByProps({ name: 'target-plane-preview-outer-ring' })
      .instance as THREE.Mesh;
    const innerRing = renderer.scene.findByProps({ name: 'target-plane-preview-inner-ring' })
      .instance as THREE.Mesh;

    const discDispose = vi.spyOn(disc.geometry, 'dispose');
    const outerDispose = vi.spyOn(outerRing.geometry, 'dispose');
    const innerDispose = vi.spyOn(innerRing.geometry, 'dispose');
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

    expect(discDispose).toHaveBeenCalledTimes(1);
    expect(outerDispose).toHaveBeenCalledTimes(1);
    expect(innerDispose).toHaveBeenCalledTimes(1);
  });

  it('self-animates expand to holding with callback and contract to hidden while invalidating only during animation', async () => {
    const renderer = await ReactThreeTest.create(<TargetReferencePlanePreview />);
    const group = renderer.scene.findByProps({ name: 'target-reference-plane-preview' })
      .instance as THREE.Group;
    const disc = renderer.scene.findByProps({ name: 'target-plane-preview-disc' })
      .instance as THREE.Mesh;
    const discMat = disc.material as THREE.MeshBasicMaterial;
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
    expect(discMat.opacity).toBeCloseTo(tokens.datumPlaneFillAlpha, 5);
    expect(onComplete).not.toHaveBeenCalled();

    // Frame 2 completes expand (0.1s) -> holding + onComplete
    await renderer.advanceFrames(1, 0.05);
    expect(getCrossScalePlanePreviewState().mode).toBe('holding');
    expect(group.scale.x).toBeCloseTo(10, 4);
    expect(onComplete).toHaveBeenCalledTimes(1);

    // Contracting fades out and hides when finished
    startCrossScalePlanePreviewContract(0.1);
    await renderer.advanceFrames(1, 0.05);
    expect(group.visible).toBe(true);
    expect(group.scale.x).toBeCloseTo(easeOutCubic(0.5) * 10, 4);
    expect(discMat.opacity).toBeCloseTo(tokens.datumPlaneFillAlpha * 0.5, 5);

    await renderer.advanceFrames(1, 0.05);
    expect(getCrossScalePlanePreviewState().active).toBe(false);
    expect(group.visible).toBe(false);
    expect(discMat.opacity).toBe(0);

    await renderer.unmount();
  });
});
