import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useLazyRef } from '../../../hooks/useLazyRef';
import { useThreeTokenStore } from '../../../stores/useThreeTokenStore';
import { easeOutCubic } from '../../../utils/cameraEasing';
import { NOOP_RAYCAST } from '../engineConfig';
import {
  getCrossScalePlanePreviewState,
  stepCrossScalePlanePreview,
} from './crossScaleVisualState';

const PREVIEW_SEGMENTS = 64;
const OUTER_RING_INNER_RADIUS = 0.97;
const OUTER_RING_OUTER_RADIUS = 1.0;
const INNER_RING_INNER_RADIUS = 0.49;
const INNER_RING_OUTER_RADIUS = 0.505;
const MIN_SCALE = 0.001;
const OPACITY_EPSILON = 1e-4;

/**
 * Translucent cartographic reference-plane preview disc and concentric rings
 * rendered during cross-scale transitions to preview the target orbital plane.
 */
export const TargetReferencePlanePreview: React.FC = React.memo(() => {
  const datumPlaneFillColor = useThreeTokenStore((s) => s.tokens.datumPlaneFillColor);
  const datumPlaneFillAlpha = useThreeTokenStore((s) => s.tokens.datumPlaneFillAlpha);
  const datumPlaneMajorColor = useThreeTokenStore((s) => s.tokens.datumPlaneMajorColor);
  const datumPlaneMajorAlpha = useThreeTokenStore((s) => s.tokens.datumPlaneMajorAlpha);
  const datumPlaneMinorColor = useThreeTokenStore((s) => s.tokens.datumPlaneMinorColor);
  const datumPlaneMinorAlpha = useThreeTokenStore((s) => s.tokens.datumPlaneMinorAlpha);

  const invalidate = useThree((s) => s.invalidate);
  const groupRef = useRef<THREE.Group>(null);
  const discMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const outerRingMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const innerRingMatRef = useRef<THREE.MeshBasicMaterial>(null);

  const tiltAxisRef = useLazyRef(() => new THREE.Vector3(1, 0, 0));
  const orientationQuatRef = useLazyRef(() => new THREE.Quaternion());

  const { discGeom, outerRingGeom, innerRingGeom } = useMemo(
    () => ({
      discGeom: new THREE.CircleGeometry(1, PREVIEW_SEGMENTS),
      outerRingGeom: new THREE.RingGeometry(
        OUTER_RING_INNER_RADIUS,
        OUTER_RING_OUTER_RADIUS,
        PREVIEW_SEGMENTS,
      ),
      innerRingGeom: new THREE.RingGeometry(
        INNER_RING_INNER_RADIUS,
        INNER_RING_OUTER_RADIUS,
        PREVIEW_SEGMENTS,
      ),
    }),
    [],
  );

  useEffect(() => {
    return () => {
      discGeom.dispose();
      outerRingGeom.dispose();
      innerRingGeom.dispose();
    };
  }, [discGeom, outerRingGeom, innerRingGeom]);

  useFrame((_, delta) => {
    const dt = Number.isFinite(delta) && delta > 0 ? Math.min(delta, 0.05) : 0;
    if (stepCrossScalePlanePreview(dt)) {
      invalidate?.();
    }

    const group = groupRef.current;
    if (!group?.position) return;

    const preview = getCrossScalePlanePreviewState();
    const isVisible = preview.active && preview.opacity > OPACITY_EPSILON;
    group.visible = isVisible;

    if (!isVisible) {
      if (discMatRef.current) discMatRef.current.opacity = 0;
      if (outerRingMatRef.current) outerRingMatRef.current.opacity = 0;
      if (innerRingMatRef.current) innerRingMatRef.current.opacity = 0;
      return;
    }

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

    if (discMatRef.current) {
      discMatRef.current.opacity = datumPlaneFillAlpha * preview.opacity;
    }
    if (outerRingMatRef.current) {
      outerRingMatRef.current.opacity = datumPlaneMajorAlpha * preview.opacity;
    }
    if (innerRingMatRef.current) {
      innerRingMatRef.current.opacity = datumPlaneMinorAlpha * preview.opacity;
    }
  });

  return (
    <group ref={groupRef} visible={false} name="target-reference-plane-preview">
      <mesh
        name="target-plane-preview-disc"
        frustumCulled={false}
        raycast={NOOP_RAYCAST}
      >
        <primitive object={discGeom} attach="geometry" />
        <meshBasicMaterial
          ref={discMatRef}
          color={datumPlaneFillColor}
          opacity={0}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
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
        name="target-plane-preview-inner-ring"
        frustumCulled={false}
        raycast={NOOP_RAYCAST}
      >
        <primitive object={innerRingGeom} attach="geometry" />
        <meshBasicMaterial
          ref={innerRingMatRef}
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
