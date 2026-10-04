import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useSpatialFrame } from './SpatialFrameProvider';
import { useThreeTokenStore } from '../../../stores/useThreeTokenStore';
import { createCircleGeometry } from '../math/rings';
import {
  createCircularPlanarGridGeometry,
  populateCurvedDashedLineBuffer,
  calculateBearingProximityFade,
} from '../cartography/cartographyMath';
import {
  createReticleGeometry,
  DEFAULT_RETICLE_SIZE,
  type CelestialClassification,
  type PlanetCensusEntry,
} from '../cartography/reticleGeometry';
import { RangeRings } from './RangeRings';

const DATUM_FILL_VERTEX_SHADER = `
varying vec2 vPosition;
void main() {
  vPosition = position.xy;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const DATUM_FILL_FRAGMENT_SHADER = `
uniform vec3 uColor;
uniform float uAlpha;
uniform float uInnerRadius;
uniform float uExponent;
varying vec2 vPosition;
void main() {
  float r = length(vPosition);
  if (r > 1.0) discard;

  // Transparent in center (r < uInnerRadius):
  float t = clamp((r - uInnerRadius) / (1.0 - uInnerRadius), 0.0, 1.0);
  float smoothT = smoothstep(0.0, 1.0, t);
  float curve = pow(smoothT, uExponent);

  // Soft luminous halo near the outer rim (r in [0.70, 0.98]):
  float rimGlow = smoothstep(0.70, 0.98, r);
  float alpha = uAlpha * (curve * 0.65 + rimGlow * 0.35);

  // Soft feathering at the extreme edge so it smoothly melts into the rim line:
  float edgeFeather = 1.0 - smoothstep(0.985, 1.0, r);
  alpha *= (0.8 + 0.2 * edgeFeather);

  // Gradient: lighter / luminous at the outer edge, fading translucent towards the centre
  vec3 edgeColor = mix(uColor, vec3(1.0), rimGlow * 0.5);
  gl_FragColor = vec4(edgeColor, alpha);
}
`;

export interface PlanarFootprintItem {
  id: string | number;
  position: [number, number, number] | { x: number; y: number; z?: number };
  classification?: CelestialClassification;
  size?: number;
  color?: string | THREE.Color;
  opacity?: number;
  multiplicity?: number;
  planets?: PlanetCensusEntry[];
}

export interface PlanarGridProps {
  /** Whether the datum plane is rendered */
  enabled?: boolean;
  /** Whether the radial fill shader is rendered */
  showFill?: boolean;
  /** Whether the cartographic planar grid is rendered */
  showPlanarGrid?: boolean;
  /** Grid line spacing */
  planarGridGap?: number;
  /** Fixed range rings on datum plane */
  rings?: number[];
  /** Designated major ring index */
  majorRingIndex?: number;
  /** Whether to render primary focus footprint */
  showPlanarFootprint?: boolean;
  /** Shape classification of primary footprint */
  footprintClassification?: CelestialClassification;
  /** Size of primary footprint */
  footprintSize?: number;
  /** Explicit external footprints */
  footprints?: PlanarFootprintItem[];
  /** Distance to Galactic Centre for curved ray alignment */
  galacticCenterDistance?: number;
}

let activeFadePlanar = 1.0;
function updateExplicitFootprintChild(child: THREE.Object3D): void {
  if (child instanceof THREE.LineSegments && child.material instanceof THREE.LineBasicMaterial) {
    if (child.userData.baseOpacity === undefined) {
      child.userData.baseOpacity = child.material.opacity;
    }
    child.material.opacity = (child.userData.baseOpacity as number) * activeFadePlanar;
  }
}

export const PlanarGrid: React.FC<PlanarGridProps> = ({
  enabled,
  showFill,
  showPlanarGrid,
  planarGridGap,
  rings,
  majorRingIndex,
  showPlanarFootprint,
  footprintClassification = 'star',
  footprintSize = DEFAULT_RETICLE_SIZE,
  footprints,
  galacticCenterDistance,
}) => {
  const { frame, frameRef } = useSpatialFrame();
  const datumPlaneFillColor = useThreeTokenStore((s) => s.tokens.datumPlaneFillColor);
  const datumPlaneFillAlpha = useThreeTokenStore((s) => s.tokens.datumPlaneFillAlpha);
  const datumPlaneFillGradientInner = useThreeTokenStore((s) => s.tokens.datumPlaneFillGradientInner);
  const datumPlaneFillGradientExponent = useThreeTokenStore((s) => s.tokens.datumPlaneFillGradientExponent);
  const datumPlaneMajorColor = useThreeTokenStore((s) => s.tokens.datumPlaneMajorColor);
  const datumPlaneMajorAlpha = useThreeTokenStore((s) => s.tokens.datumPlaneMajorAlpha);
  const datumPlaneMinorColor = useThreeTokenStore((s) => s.tokens.datumPlaneMinorColor);
  const datumPlaneMinorAlpha = useThreeTokenStore((s) => s.tokens.datumPlaneMinorAlpha);
  const footprintColor = useThreeTokenStore((s) => s.tokens.footprintColor);
  const footprintAlpha = useThreeTokenStore((s) => s.tokens.footprintAlpha);
  const bearingCoreColor = useThreeTokenStore((s) => s.tokens.bearingCoreColor);
  const bearingCoreAlpha = useThreeTokenStore((s) => s.tokens.bearingCoreAlpha);
  const bearingOrbitalColor = useThreeTokenStore((s) => s.tokens.bearingOrbitalColor);
  const bearingOrbitalAlpha = useThreeTokenStore((s) => s.tokens.bearingOrbitalAlpha);

  const isPlaneEnabled = enabled ?? frame.datumPlane.enabled;
  const isFillEnabled = showFill ?? frame.datumPlane.fill;
  const isGridEnabled = showPlanarGrid ?? frame.datumPlane.planarGrid;
  const isFootprintEnabled = showPlanarFootprint ?? frame.datumPlane.footprints;

  const groupRef = useRef<THREE.Group>(null);
  const staticPlanarGridRef = useRef<THREE.Group>(null);
  const gridMatRef = useRef<THREE.LineBasicMaterial>(null);
  const fillMeshRef = useRef<THREE.Mesh>(null);
  const boundaryLineRef = useRef<THREE.LineLoop>(null);
  const boundaryMatRef = useRef<THREE.LineBasicMaterial>(null);
  const primaryFootprintRef = useRef<THREE.Group>(null);
  const primaryFootprintMatRef = useRef<THREE.LineBasicMaterial>(null);
  const diskBearingsRef = useRef<THREE.Group>(null);
  const diskCoreRef = useRef<THREE.LineSegments>(null);
  const diskCoreMatRef = useRef<THREE.LineBasicMaterial>(null);
  const diskOrbitalRef = useRef<THREE.LineSegments>(null);
  const diskOrbitalMatRef = useRef<THREE.LineBasicMaterial>(null);
  const explicitFootprintsRef = useRef<THREE.Group>(null);

  // Unit disc geometries
  const boundaryGeom = useMemo(() => createCircleGeometry(1.0, 128), []);
  const fillCircleGeom = useMemo(() => {
    const geom = new THREE.CircleGeometry(1.0, 128);
    geom.computeBoundingSphere();
    return geom;
  }, []);

  // Unit bearing line along +X for core bearing (heads into centre from +X, terminating at (0,0,0))
  const bearingCoreGeom = useMemo(() => {
    const geom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, 0, 0),
    ]);
    geom.computeBoundingSphere();
    return geom;
  }, []);

  const diskOrbitalBuffer = useMemo(() => new Float32Array(30000), []);
  const diskOrbitalGeom = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(diskOrbitalBuffer, 3));
    return geom;
  }, [diskOrbitalBuffer]);

  useEffect(() => {
    return () => {
      boundaryGeom.dispose();
      fillCircleGeom.dispose();
      bearingCoreGeom.dispose();
      diskOrbitalGeom.dispose();
    };
  }, [boundaryGeom, fillCircleGeom, bearingCoreGeom, diskOrbitalGeom]);

  // Primary footprint geometry
  const primaryFootprintGeom = useMemo(() => {
    return createReticleGeometry(footprintClassification, footprintSize);
  }, [footprintClassification, footprintSize]);

  useEffect(() => {
    return () => {
      primaryFootprintGeom.dispose();
    };
  }, [primaryFootprintGeom]);

  // Planar grid geometry: circular grid clipped strictly to circle x^2 + y^2 <= radius^2
  const gridGeom = useMemo(() => {
    if (!isPlaneEnabled || !isGridEnabled) return null;
    const gap = planarGridGap ?? frame.datumPlane.planarGridGap ?? 2.5;
    const rGc = galacticCenterDistance ?? frame.centerDistance ?? 2000;
    const radius = frame.radius ?? 10;
    return createCircularPlanarGridGeometry(radius, gap, rGc);
  }, [
    isPlaneEnabled,
    isGridEnabled,
    planarGridGap,
    frame.datumPlane.planarGridGap,
    galacticCenterDistance,
    frame.centerDistance,
    frame.radius,
  ]);

  useEffect(() => {
    return () => {
      gridGeom?.dispose();
    };
  }, [gridGeom]);

  // Stable fill shader uniforms mutated via useEffect
  const fillUniforms = useMemo(() => ({
    uColor: { value: new THREE.Color() },
    uAlpha: { value: 0.1 },
    uInnerRadius: { value: 0.15 },
    uExponent: { value: 3.5 },
  }), []);

  useEffect(() => {
    fillUniforms.uColor.value.copy(datumPlaneFillColor);
    fillUniforms.uAlpha.value = datumPlaneFillAlpha;
    fillUniforms.uInnerRadius.value = datumPlaneFillGradientInner;
    fillUniforms.uExponent.value = datumPlaneFillGradientExponent;
  }, [
    fillUniforms,
    datumPlaneFillColor,
    datumPlaneFillAlpha,
    datumPlaneFillGradientInner,
    datumPlaneFillGradientExponent,
  ]);

  // Per-frame scaling and end-on / top-down ortho fade
  useFrame(({ camera }) => {
    const { apertureRadius, focusPoint, cardinalAlignment, cameraDistance, planeWeights, orientation } = frameRef.current;
    const maxAlpha = planeWeights?.maxAlpha ?? Math.max(cardinalAlignment.alphaX, cardinalAlignment.alphaY, cardinalAlignment.alphaZ);
    const fadePlanar = Math.max(0, 1.0 - maxAlpha);

    if (groupRef.current) {
      groupRef.current.position.copy(focusPoint);
      groupRef.current.quaternion.copy(orientation);
    }

    if (staticPlanarGridRef.current) {
      const scale = frame.radius > 0 ? apertureRadius / frame.radius : 1.0;
      staticPlanarGridRef.current.scale.set(scale, scale, 1);
      staticPlanarGridRef.current.position.set(0, 0, 0);
      staticPlanarGridRef.current.visible = isGridEnabled && !!gridGeom && fadePlanar > 1e-3;
    }
    if (gridMatRef.current) {
      gridMatRef.current.opacity = datumPlaneMinorAlpha * fadePlanar;
    }

    if (fillMeshRef.current) {
      fillMeshRef.current.scale.set(apertureRadius, apertureRadius, 1);
      fillMeshRef.current.visible = isFillEnabled && fadePlanar > 1e-3;
      const mat = fillMeshRef.current.material as THREE.ShaderMaterial;
      if (mat?.uniforms?.uAlpha) {
        mat.uniforms.uAlpha.value = datumPlaneFillAlpha * fadePlanar;
      }
    }
    fillUniforms.uAlpha.value = datumPlaneFillAlpha * fadePlanar;

    if (boundaryLineRef.current) {
      boundaryLineRef.current.scale.set(apertureRadius, apertureRadius, 1);
      boundaryLineRef.current.visible = fadePlanar > 1e-3;
    }
    if (boundaryMatRef.current) {
      boundaryMatRef.current.opacity = datumPlaneMajorAlpha * fadePlanar;
    }

    const effectiveCenterDistance = galacticCenterDistance ?? frame.centerDistance ?? 2000;

    // Bearing proximity fade for disk bearings
    const coreProximityFade = calculateBearingProximityFade(
      camera.position,
      focusPoint,
      'core',
      apertureRadius,
      effectiveCenterDistance,
      apertureRadius,
      undefined,
    );
    const orbitalProximityFade = calculateBearingProximityFade(
      camera.position,
      focusPoint,
      'orbital',
      apertureRadius,
      effectiveCenterDistance,
      apertureRadius,
      undefined,
    );

    // Suppress planar length-R disk bearings when 3D instrument extended bearings are active at Z=0
    const suppressDiskBearings = frame.coordinateFins.enabled && Math.abs(focusPoint.z) < 1e-3;
    const showDiskBearings = !suppressDiskBearings && fadePlanar > 1e-3;

    if (diskBearingsRef.current) {
      diskBearingsRef.current.visible = showDiskBearings;
    }

    // Disk Cardinal Bearings: length R, terminating at perimeter rim
    if (diskCoreRef.current) {
      diskCoreRef.current.scale.set(apertureRadius, apertureRadius, 1);
      diskCoreRef.current.visible = showDiskBearings && coreProximityFade > 1e-3;
    }
    if (diskCoreMatRef.current) {
      diskCoreMatRef.current.opacity = bearingCoreAlpha * fadePlanar * coreProximityFade;
    }

    const fovFactor = camera instanceof THREE.PerspectiveCamera
      ? Math.tan((camera.fov * Math.PI) / 360) / Math.tan((45 * Math.PI) / 360)
      : 1.0;
    const invScale = (cameraDistance / 16.47) * fovFactor;

    if (diskOrbitalRef.current && diskOrbitalGeom) {
      const showOrbital = showDiskBearings && orbitalProximityFade > 1e-3;
      diskOrbitalRef.current.visible = showOrbital;
      if (showOrbital) {
        const vCount = populateCurvedDashedLineBuffer(
          diskOrbitalBuffer,
          apertureRadius,
          effectiveCenterDistance,
          1,
          0.18 * invScale,
          0.12 * invScale,
        );
        const posAttr = diskOrbitalGeom.getAttribute('position') as THREE.BufferAttribute;
        posAttr.needsUpdate = true;
        diskOrbitalGeom.setDrawRange(0, vCount);
      }
    }
    if (diskOrbitalMatRef.current) {
      diskOrbitalMatRef.current.opacity = bearingOrbitalAlpha * fadePlanar * orbitalProximityFade;
    }

    // Primary Footprint scaling & edge-on / ortho fade
    if (primaryFootprintRef.current) {
      const fpScale = THREE.MathUtils.lerp(invScale, 1.0, cardinalAlignment.alphaZ);
      primaryFootprintRef.current.scale.set(fpScale, fpScale, 1);
      primaryFootprintRef.current.visible = isFootprintEnabled && fadePlanar > 1e-3;
    }
    if (primaryFootprintMatRef.current) {
      primaryFootprintMatRef.current.opacity = footprintAlpha * fadePlanar;
    }

    if (explicitFootprintsRef.current) {
      explicitFootprintsRef.current.visible = fadePlanar > 1e-3;
      if (fadePlanar > 1e-3 && footprints && footprints.length > 0) {
        activeFadePlanar = fadePlanar;
        explicitFootprintsRef.current.traverse(updateExplicitFootprintChild);
      }
    }
  });

  if (!isPlaneEnabled) return null;

  return (
    <group ref={groupRef} name="datum-plane">
      {/* Datum Fill Shader */}
      {isFillEnabled && (
        <mesh ref={fillMeshRef} name="datum-plane-fill" frustumCulled={false}>
          <primitive object={fillCircleGeom} attach="geometry" />
          <shaderMaterial
            vertexShader={DATUM_FILL_VERTEX_SHADER}
            fragmentShader={DATUM_FILL_FRAGMENT_SHADER}
            uniforms={fillUniforms}
            transparent
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Datum Plane Boundary Circle */}
      <lineLoop ref={boundaryLineRef} name="datum-plane-boundary" frustumCulled={false}>
        <primitive object={boundaryGeom} attach="geometry" />
        <lineBasicMaterial
          ref={boundaryMatRef}
          color={datumPlaneMajorColor}
          opacity={datumPlaneMajorAlpha}
          transparent
          depthWrite={false}
        />
      </lineLoop>

      {/* Static Planar Galactic Grid anchored at world (0, 0, 0) */}
      {isGridEnabled && gridGeom && (
        <group ref={staticPlanarGridRef} name="static-planar-grid-group">
          <lineSegments name="planar-galactic-grid" frustumCulled={false}>
            <primitive object={gridGeom} attach="geometry" />
            <lineBasicMaterial
              ref={gridMatRef}
              color={datumPlaneMinorColor}
              opacity={datumPlaneMinorAlpha}
              transparent
              depthWrite={false}
            />
          </lineSegments>
        </group>
      )}

      {/* Datum Plane Range Rings */}
      {frame.datumPlane.rings && (
        <RangeRings
          rings={rings}
          majorRingIndex={majorRingIndex}
          lockToFocusPoint={false}
          position={[0, 0, 0]}
        />
      )}

      {/* Planar Disk Cardinal Bearings: 2 length-R lines (Core solid, Orbital curved dashed) */}
      <group ref={diskBearingsRef} name="disk-bearings">
        <lineSegments
          ref={diskCoreRef}
          name="bearing-core"
          scale={[1, 1, 1]}
          frustumCulled={false}
        >
          <primitive object={bearingCoreGeom} attach="geometry" />
          <lineBasicMaterial
            ref={diskCoreMatRef}
            color={bearingCoreColor}
            opacity={bearingCoreAlpha}
            transparent
            depthWrite={false}
          />
        </lineSegments>
        <lineSegments
          ref={diskOrbitalRef}
          name="bearing-orbital"
          frustumCulled={false}
        >
          <primitive object={diskOrbitalGeom} attach="geometry" />
          <lineBasicMaterial
            ref={diskOrbitalMatRef}
            color={bearingOrbitalColor}
            opacity={bearingOrbitalAlpha}
            transparent
            depthWrite={false}
          />
        </lineSegments>
      </group>

      {/* Primary Focus Planar Footprint */}
      {isFootprintEnabled && (
        <group ref={primaryFootprintRef} name="planar-footprint">
          <lineSegments frustumCulled={false}>
            <primitive object={primaryFootprintGeom} attach="geometry" />
            <lineBasicMaterial
              ref={primaryFootprintMatRef}
              color={footprintColor}
              opacity={footprintAlpha}
              transparent
              depthWrite={false}
            />
          </lineSegments>
        </group>
      )}

      {/* Explicit External Planar Footprints */}
      {footprints && footprints.length > 0 && (
        <group ref={explicitFootprintsRef} name="explicit-planar-footprints">
          {footprints.map((fp) => {
            const fpClassification = fp.classification ?? 'star';
            const fpSize = fp.size ?? footprintSize;
            const fpX = Array.isArray(fp.position) ? fp.position[0] : fp.position.x;
            const fpY = Array.isArray(fp.position) ? fp.position[1] : fp.position.y;
            return (
              <group
                key={`explicit-footprint-${fp.id}`}
                position={[fpX, fpY, 0]}
                name={`planar-footprint-${fp.id}`}
              >
                <lineSegments frustumCulled={false}>
                  <primitive
                    object={createReticleGeometry(fpClassification, fpSize, {
                      multiplicity: fp.multiplicity,
                      planets: fp.planets,
                    })}
                    attach="geometry"
                  />
                  <lineBasicMaterial
                    color={fp.color ?? footprintColor}
                    opacity={fp.opacity ?? footprintAlpha}
                    transparent
                    depthWrite={false}
                  />
                </lineSegments>
              </group>
            );
          })}
        </group>
      )}
    </group>
  );
};
