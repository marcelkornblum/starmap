import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import ReactThreeTest from '@react-three/test-renderer';
import { TargetReferencePlanePreview } from './TargetReferencePlanePreview';
import { buildPreviewReferenceMarksGeometry } from './targetReferencePlaneGeometry';
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

  it('builds a single BufferGeometry with major/minor groups for spokes, ticks, and orthogonal chords', () => {
    const geom = buildPreviewReferenceMarksGeometry();
    const pos = geom.getAttribute('position') as THREE.BufferAttribute;

    // 4 cardinal spokes (8v) + 12 major ticks (24v) = 32v major;
    // 24 minor ticks (48v) + 8 grid chords (16v) = 64v minor; total = 96v.
    expect(pos.count).toBe(96);
    expect(geom.groups).toEqual([
      { start: 0, count: 32, materialIndex: 0 },
      { start: 32, count: 64, materialIndex: 1 },
    ]);

    // First cardinal spoke at 0 deg: (0.15, 0, 0) -> (1.0, 0, 0)
    expect(pos.getX(0)).toBeCloseTo(0.15, 6);
    expect(pos.getY(0)).toBeCloseTo(0, 6);
    expect(pos.getX(1)).toBeCloseTo(1.0, 6);
    expect(pos.getY(1)).toBeCloseTo(0, 6);

    // First grid chord at x = -0.6: y = -sqrt(1 - 0.36) = -0.8 -> +0.8
    const firstChordIdx = 32 + 48;
    expect(pos.getX(firstChordIdx)).toBeCloseTo(-0.6, 6);
    expect(pos.getY(firstChordIdx)).toBeCloseTo(-0.8, 6);
    expect(pos.getX(firstChordIdx + 1)).toBeCloseTo(-0.6, 6);
    expect(pos.getY(firstChordIdx + 1)).toBeCloseTo(0.8, 6);

    geom.dispose();
  });

  it('renders hidden by default with NOOP_RAYCAST on disc, concentric rings, and reference marks', async () => {
    const renderer = await ReactThreeTest.create(<TargetReferencePlanePreview />);

    const group = renderer.scene.findByProps({ name: 'target-reference-plane-preview' });
    const disc = renderer.scene.findByProps({ name: 'target-plane-preview-disc' });
    const outerRing = renderer.scene.findByProps({ name: 'target-plane-preview-outer-ring' });
    const innerRing1 = renderer.scene.findByProps({ name: 'target-plane-preview-inner-ring-1' });
    const innerRing2 = renderer.scene.findByProps({ name: 'target-plane-preview-inner-ring-2' });
    const marks = renderer.scene.findByProps({ name: 'target-plane-preview-reference-marks' });

    expect(group.instance.visible).toBe(false);
    expect(disc.props.raycast).toBe(NOOP_RAYCAST);
    expect(outerRing.props.raycast).toBe(NOOP_RAYCAST);
    expect(innerRing1.props.raycast).toBe(NOOP_RAYCAST);
    expect(innerRing2.props.raycast).toBe(NOOP_RAYCAST);
    expect(marks.props.raycast).toBe(NOOP_RAYCAST);

    await renderer.unmount();
  });

  it('positions, orients, scales, and fades all ring and line materials from crossScaleVisualState and tokens', async () => {
    const renderer = await ReactThreeTest.create(<TargetReferencePlanePreview />);

    const group = renderer.scene.findByProps({ name: 'target-reference-plane-preview' })
      .instance as THREE.Group;
    const disc = renderer.scene.findByProps({ name: 'target-plane-preview-disc' })
      .instance as THREE.Mesh;
    const outerRing = renderer.scene.findByProps({ name: 'target-plane-preview-outer-ring' })
      .instance as THREE.Mesh;
    const innerRing1 = renderer.scene.findByProps({ name: 'target-plane-preview-inner-ring-1' })
      .instance as THREE.Mesh;
    const innerRing2 = renderer.scene.findByProps({ name: 'target-plane-preview-inner-ring-2' })
      .instance as THREE.Mesh;
    const marks = renderer.scene.findByProps({ name: 'target-plane-preview-reference-marks' })
      .instance as THREE.LineSegments;

    const discMat = disc.material as THREE.MeshBasicMaterial;
    const outerMat = outerRing.material as THREE.MeshBasicMaterial;
    const innerMat1 = innerRing1.material as THREE.MeshBasicMaterial;
    const innerMat2 = innerRing2.material as THREE.MeshBasicMaterial;
    const [majorLineMat, minorLineMat] = marks.material as THREE.LineBasicMaterial[];
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
    expect(innerMat1.color.getHexString()).toBe(
      new THREE.Color(tokens.datumPlaneMinorColor).getHexString(),
    );
    expect(innerMat2.color.getHexString()).toBe(
      new THREE.Color(tokens.datumPlaneMinorColor).getHexString(),
    );
    expect(majorLineMat.color.getHexString()).toBe(
      new THREE.Color(tokens.datumPlaneMajorColor).getHexString(),
    );
    expect(minorLineMat.color.getHexString()).toBe(
      new THREE.Color(tokens.datumPlaneMinorColor).getHexString(),
    );

    expect(discMat.opacity).toBeCloseTo(tokens.datumPlaneFillAlpha * opacity, 5);
    expect(outerMat.opacity).toBeCloseTo(tokens.datumPlaneMajorAlpha * opacity, 5);
    expect(innerMat1.opacity).toBeCloseTo(tokens.datumPlaneMinorAlpha * opacity, 5);
    expect(innerMat2.opacity).toBeCloseTo(tokens.datumPlaneMinorAlpha * opacity, 5);
    expect(majorLineMat.opacity).toBeCloseTo(tokens.datumPlaneMajorAlpha * opacity, 5);
    expect(minorLineMat.opacity).toBeCloseTo(tokens.datumPlaneMinorAlpha * opacity, 5);

    updateCrossScalePlanePreviewProgress(0, 0);
    await renderer.advanceFrames(1, 0.016);
    expect(group.visible).toBe(false);
    expect(discMat.opacity).toBe(0);
    expect(outerMat.opacity).toBe(0);
    expect(innerMat1.opacity).toBe(0);
    expect(innerMat2.opacity).toBe(0);
    expect(majorLineMat.opacity).toBe(0);
    expect(minorLineMat.opacity).toBe(0);

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

  it('disposes geometries and line materials on unmount and performs zero clone allocations in useFrame', async () => {
    const renderer = await ReactThreeTest.create(<TargetReferencePlanePreview />);

    const disc = renderer.scene.findByProps({ name: 'target-plane-preview-disc' })
      .instance as THREE.Mesh;
    const outerRing = renderer.scene.findByProps({ name: 'target-plane-preview-outer-ring' })
      .instance as THREE.Mesh;
    const innerRing1 = renderer.scene.findByProps({ name: 'target-plane-preview-inner-ring-1' })
      .instance as THREE.Mesh;
    const innerRing2 = renderer.scene.findByProps({ name: 'target-plane-preview-inner-ring-2' })
      .instance as THREE.Mesh;
    const marks = renderer.scene.findByProps({ name: 'target-plane-preview-reference-marks' })
      .instance as THREE.LineSegments;
    const [majorLineMat, minorLineMat] = marks.material as THREE.LineBasicMaterial[];

    const discDispose = vi.spyOn(disc.geometry, 'dispose');
    const outerDispose = vi.spyOn(outerRing.geometry, 'dispose');
    const inner1Dispose = vi.spyOn(innerRing1.geometry, 'dispose');
    const inner2Dispose = vi.spyOn(innerRing2.geometry, 'dispose');
    const marksDispose = vi.spyOn(marks.geometry, 'dispose');
    const majorMatDispose = vi.spyOn(majorLineMat, 'dispose');
    const minorMatDispose = vi.spyOn(minorLineMat, 'dispose');
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
    expect(inner1Dispose).toHaveBeenCalledTimes(1);
    expect(inner2Dispose).toHaveBeenCalledTimes(1);
    expect(marksDispose).toHaveBeenCalledTimes(1);
    expect(majorMatDispose).toHaveBeenCalledTimes(1);
    expect(minorMatDispose).toHaveBeenCalledTimes(1);
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

    await renderer.advanceFrames(1, 0.05);
    expect(getCrossScalePlanePreviewState().mode).toBe('holding');
    expect(group.scale.x).toBeCloseTo(10, 4);
    expect(onComplete).toHaveBeenCalledTimes(1);

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
