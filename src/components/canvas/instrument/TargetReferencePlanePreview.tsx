import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useLazyRef } from '../../../hooks/useLazyRef';
import { useThreeTokenStore } from '../../../stores/useThreeTokenStore';
import { easeOutCubic } from '../../../utils/cameraEasing';
import { NOOP_RAYCAST } from '../engineConfig';
import { useCrossScaleChoreography } from './CrossScaleChoreographyContext';
import {
  getCrossScalePlanePreviewState,
  stepCrossScalePlanePreview,
} from './crossScaleVisualState';

const PREVIEW_SEGMENTS = 64;
const OUTER_RING_INNER_RADIUS = 0.985;
const OUTER_RING_OUTER_RADIUS = 1.0;
const INNER_RING_HALF_WIDTH = 0.0075;
const INNER_RING_1_RADIUS = 0.33;
const INNER_RING_2_RADIUS = 0.66;
const MIN_SCALE = 0.001;
const OPACITY_EPSILON = 1e-4;

/**
 * Unfilled concentric cartographic reference-plane rings rendered during cross-scale
 * transitions as a clean orientation bridge into or out of the target datum plane.
 */
export const TargetReferencePlanePreview: React.FC = React.memo(() => {
  const datumPlaneMajorColor = useThreeTokenStore((s) => s.tokens.datumPlaneMajorColor);
  const datumPlaneMajorAlpha = useThreeTokenStore((s) => s.tokens.datumPlaneMajorAlpha);
  const datumPlaneMinorColor = useThreeTokenStore((s) => s.tokens.datumPlaneMinorColor);
  const datumPlaneMinorAlpha = useThreeTokenStore((s) => s.tokens.datumPlaneMinorAlpha);

  const invalidate = useThree((s) => s.invalidate);
  const choreography = useCrossScaleChoreography();
  const groupRef = useRef<THREE.Group>(null);
  const outerRingMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const innerRing1MatRef = useRef<THREE.MeshBasicMaterial>(null);
  const innerRing2MatRef = useRef<THREE.MeshBasicMaterial>(null);
  const wasVisibleRef = useRef(true);

  const tiltAxisRef = useLazyRef(() => new THREE.Vector3(1, 0, 0));
  const orientationQuatRef = useLazyRef(() => new THREE.Quaternion());

  const { outerRingGeom, innerRing1Geom, innerRing2Geom } = useMemo(
    () => ({
      outerRingGeom: new THREE.RingGeometry(
        OUTER_RING_INNER_RADIUS,
        OUTER_RING_OUTER_RADIUS,
        PREVIEW_SEGMENTS,
      ),
      innerRing1Geom: new THREE.RingGeometry(
        INNER_RING_1_RADIUS - INNER_RING_HALF_WIDTH,
        INNER_RING_1_RADIUS + INNER_RING_HALF_WIDTH,
        PREVIEW_SEGMENTS,
      ),
      innerRing2Geom: new THREE.RingGeometry(
        INNER_RING_2_RADIUS - INNER_RING_HALF_WIDTH,
        INNER_RING_2_RADIUS + INNER_RING_HALF_WIDTH,
        PREVIEW_SEGMENTS,
      ),
    }),
    [],
  );

  useEffect(() => {
    return () => {
      outerRingGeom.dispose();
      innerRing1Geom.dispose();
      innerRing2Geom.dispose();
    };
  }, [outerRingGeom, innerRing1Geom, innerRing2Geom]);

  useFrame((_, delta) => {
    const dt = Number.isFinite(delta) && delta > 0 ? Math.min(delta, 0.05) : 0;
    if (stepCrossScalePlanePreview(dt, choreography)) {
      invalidate?.();
    }

    const group = groupRef.current;
    if (!group?.position) return;

    const preview = getCrossScalePlanePreviewState(choreography);
    const isVisible = preview.active && preview.opacity > OPACITY_EPSILON;

    if (!isVisible) {
      if (!wasVisibleRef.current) return;
      wasVisibleRef.current = false;
      group.visible = false;
      if (outerRingMatRef.current) outerRingMatRef.current.opacity = 0;
      if (innerRing1MatRef.current) innerRing1MatRef.current.opacity = 0;
      if (innerRing2MatRef.current) innerRing2MatRef.current.opacity = 0;
      return;
    }

    wasVisibleRef.current = true;
    group.visible = true;

    group.position.set(preview.position[0], preview.position[1], preview.position[2]);

    tiltAxisRef.current
      .set(Math.cos(preview.ascendingNodeRad), Math.sin(preview.ascendingNodeRad), 0)
      .normalize();
    orientationQuatRef.current.setFromAxisAngle(tiltAxisRef.current, preview.inclinationRad);
    group.quaternion.copy(orientationQuatRef.current);

    const radiusScale = Math.max(
      MIN_SCALE,
      easeOutCubic(preview.radiusProgress) * preview.maxRadius,
    );
    group.scale.set(radiusScale, radiusScale, 1);

    if (outerRingMatRef.current) {
      outerRingMatRef.current.opacity = datumPlaneMajorAlpha * preview.opacity;
    }
    if (innerRing1MatRef.current) {
      innerRing1MatRef.current.opacity = datumPlaneMinorAlpha * preview.opacity;
    }
    if (innerRing2MatRef.current) {
      innerRing2MatRef.current.opacity = datumPlaneMinorAlpha * preview.opacity;
    }
  });

  return (
    <group ref={groupRef} visible={false} name="target-reference-plane-preview">
      <mesh
        name="target-plane-preview-outer-ring"
        frustumCulled={false}
        raycast={NOOP_RAYCAST}
      >
        <primitive object={outerRingGeom} attach="geometry" />
        <meshBasicMaterial
          ref={outerRingMatRef}
          color={datumPlaneMajorColor}
          opacity={0}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh
        name="target-plane-preview-inner-ring-1"
        frustumCulled={false}
        raycast={NOOP_RAYCAST}
      >
        <primitive object={innerRing1Geom} attach="geometry" />
        <meshBasicMaterial
          ref={innerRing1MatRef}
          color={datumPlaneMinorColor}
          opacity={0}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh
        name="target-plane-preview-inner-ring-2"
        frustumCulled={false}
        raycast={NOOP_RAYCAST}
      >
        <primitive object={innerRing2Geom} attach="geometry" />
        <meshBasicMaterial
          ref={innerRing2MatRef}
          color={datumPlaneMinorColor}
          opacity={0}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
});

TargetReferencePlanePreview.displayName = 'TargetReferencePlanePreview';
