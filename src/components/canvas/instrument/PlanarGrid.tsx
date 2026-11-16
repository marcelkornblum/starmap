import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useSpatialFrame } from './spatialFrameContext';
import { useThreeTokenStore } from '../../../stores/useThreeTokenStore';
import { calculateBearingProximityFade } from '../math';
import { createReticleGeometry, DEFAULT_RETICLE_SIZE } from '../cartography/reticleGeometry';
import { RangeRings } from './RangeRings';
import {
  DATUM_FILL_VERTEX_SHADER, DATUM_FILL_FRAGMENT_SHADER,
  type PlanarFootprintData, type PlanarGridProps, type PlanarFootprintComponentProps,
  buildPlanarBaseGeometries, buildPlanarGridGeometry, updateOrbitalDashedLine,
  assignExplicitFootprintFade, updateExplicitFootprintChild,
} from './planarGridGeometry';
import { usePlanarGridMaterials } from './usePlanarGridMaterials';
import { DEFAULT_PLANAR_GRID_GAP, DEFAULT_GALACTIC_CENTER_DISTANCE_PC, DEFAULT_FRAME_RADIUS } from './instrumentDefaults';
import { NOOP_RAYCAST } from '../engineConfig';

export interface PlanarFootprintItem extends PlanarFootprintData {}
export type { PlanarGridProps, PlanarFootprintComponentProps };

export const PlanarFootprintItem: React.FC<PlanarFootprintComponentProps> = ({ footprint, defaultSize = DEFAULT_RETICLE_SIZE, defaultColor, defaultAlpha = 1.0, ...rest }) => {
  const fp = footprint ?? rest;
  const geom = useMemo(() => createReticleGeometry(fp.classification ?? 'star', fp.size ?? defaultSize, { multiplicity: fp.multiplicity, planets: fp.planets }), [fp.classification, fp.size, defaultSize, fp.multiplicity, fp.planets]);
  useEffect(() => () => { geom.dispose(); }, [geom]);
  const fpX = Array.isArray(fp.position) ? (fp.position[0] ?? 0) : (fp.position?.x ?? 0);
  const fpY = Array.isArray(fp.position) ? (fp.position[1] ?? 0) : (fp.position?.y ?? 0);
  return (
    <group position={[fpX, fpY, 0]} name={`planar-footprint-${fp.id}`}>
      <lineSegments frustumCulled={false} raycast={NOOP_RAYCAST}><primitive object={geom} attach="geometry" /><lineBasicMaterial color={fp.color ?? defaultColor} opacity={fp.opacity ?? defaultAlpha} transparent depthWrite={false} /></lineSegments>
    </group>
  );
};

export const PlanarGrid: React.FC<PlanarGridProps> = React.memo(({
  enabled, showFill, showPlanarGrid, planarGridGap, rings, majorRingIndex, showPlanarFootprint,
  footprintClassification = 'star', footprintSize = DEFAULT_RETICLE_SIZE, footprints, centerDistance, galacticCenterDistance,
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
  const stateFocus = useThreeTokenStore((s) => s.tokens.stateFocus);
  const footprintColor = useThreeTokenStore((s) => s.tokens.footprintColor);
  const footprintAlpha = useThreeTokenStore((s) => s.tokens.footprintAlpha);
  const bearingCoreColor = useThreeTokenStore((s) => s.tokens.bearingCoreColor);
  const bearingCoreAlpha = useThreeTokenStore((s) => s.tokens.bearingCoreAlpha);
  const bearingOrbitalColor = useThreeTokenStore((s) => s.tokens.bearingOrbitalColor);
  const bearingOrbitalAlpha = useThreeTokenStore((s) => s.tokens.bearingOrbitalAlpha);

  const isPlaneEnabled = enabled ?? frame.datumPlane.enabled;
  const isFillEnabled = showFill ?? frame.datumPlane.fill;
  const isGridEnabled = showPlanarGrid ?? frame.datumPlane.planarGrid;
  const isFootprintEnabled = showPlanarFootprint ?? false;
  const hasCore = frame.bearings.some((b) => b.id === 'core'), hasOrbital = frame.bearings.some((b) => b.id === 'orbital');

  const groupRef = useRef<THREE.Group>(null), staticPlanarGridRef = useRef<THREE.Group>(null), fillMeshRef = useRef<THREE.Mesh>(null);
  const boundaryLineRef = useRef<THREE.LineLoop>(null), boundaryMatRef = useRef<THREE.LineBasicMaterial>(null), gridMatRef = useRef<THREE.LineBasicMaterial>(null);
  const primaryFootprintRef = useRef<THREE.Group>(null), explicitFootprintsRef = useRef<THREE.Group>(null), diskBearingsRef = useRef<THREE.Group>(null);
  const diskCoreRef = useRef<THREE.LineSegments>(null), diskCoreMatRef = useRef<THREE.LineBasicMaterial>(null);
  const diskOrbitalRef = useRef<THREE.LineSegments>(null), diskOrbitalMatRef = useRef<THREE.LineBasicMaterial>(null);
  const lastOrbitalDashRef = useRef({ radius: -1, centerDist: -1, scale: -1 });

  const { boundaryGeom, fillCircleGeom, bearingCoreGeom, diskOrbitalBuffer, diskOrbitalGeom } = useMemo(() => buildPlanarBaseGeometries(), []);
  useEffect(() => () => { boundaryGeom.dispose(); fillCircleGeom.dispose(); bearingCoreGeom.dispose(); diskOrbitalGeom.dispose(); }, [boundaryGeom, fillCircleGeom, bearingCoreGeom, diskOrbitalGeom]);

  const primaryFootprintGeom = useMemo(() => createReticleGeometry(footprintClassification, footprintSize), [footprintClassification, footprintSize]);
  useEffect(() => () => { primaryFootprintGeom.dispose(); }, [primaryFootprintGeom]);

  const gridGeom = useMemo(() => {
    if (!isPlaneEnabled || !isGridEnabled) return null;
    const gap = planarGridGap ?? frame.datumPlane.planarGridGap ?? DEFAULT_PLANAR_GRID_GAP;
    const effDist = centerDistance ?? galacticCenterDistance ?? frame.centerDistance ?? DEFAULT_GALACTIC_CENTER_DISTANCE_PC;
    return buildPlanarGridGeometry(frame.radius ?? DEFAULT_FRAME_RADIUS, gap, effDist);
  }, [isPlaneEnabled, isGridEnabled, planarGridGap, frame.datumPlane.planarGridGap, centerDistance, galacticCenterDistance, frame.centerDistance, frame.radius]);

  useEffect(() => () => { gridGeom?.dispose(); }, [gridGeom]);

  const { fillUniforms, primaryFootprintMatRef, updateFillAlpha } = usePlanarGridMaterials({
    datumPlaneFillColor, datumPlaneFillAlpha, datumPlaneFillGradientInner, datumPlaneFillGradientExponent, stateFocus,
  });

  useFrame(({ camera }) => {
    const { apertureRadius, focusPoint, cardinalAlignment, planeWeights, orientation, screenScale } = frameRef.current;
    const maxAlpha = planeWeights?.maxAlpha ?? Math.max(cardinalAlignment.alphaX, cardinalAlignment.alphaY, cardinalAlignment.alphaZ);
    const fadePlanar = Math.max(0, 1.0 - maxAlpha);

    if (groupRef.current) { groupRef.current.position.copy(focusPoint); groupRef.current.quaternion.copy(orientation); }
    if (staticPlanarGridRef.current) {
      staticPlanarGridRef.current.position.set(-focusPoint.x, -focusPoint.y, -focusPoint.z);
      staticPlanarGridRef.current.visible = isGridEnabled && !!gridGeom && fadePlanar > 1e-3;
    }
    if (gridMatRef.current) gridMatRef.current.opacity = datumPlaneMinorAlpha * fadePlanar;
    if (fillMeshRef.current) {
      fillMeshRef.current.position.set(0, 0, -focusPoint.z);
      fillMeshRef.current.scale.set(apertureRadius, apertureRadius, 1);
      fillMeshRef.current.visible = isFillEnabled && fadePlanar > 1e-3;
    }
    updateFillAlpha(fadePlanar);

    if (boundaryLineRef.current) {
      boundaryLineRef.current.position.set(0, 0, -focusPoint.z);
      boundaryLineRef.current.scale.set(apertureRadius, apertureRadius, 1);
      boundaryLineRef.current.visible = fadePlanar > 1e-3;
    }
    if (boundaryMatRef.current) boundaryMatRef.current.opacity = datumPlaneMajorAlpha * fadePlanar;

    const effDist = centerDistance ?? galacticCenterDistance ?? frame.centerDistance ?? DEFAULT_GALACTIC_CENTER_DISTANCE_PC;
    const coreFade = hasCore ? calculateBearingProximityFade(camera.position, focusPoint, 'core', apertureRadius, effDist, apertureRadius) : 0;
    const orbFade = hasOrbital ? calculateBearingProximityFade(camera.position, focusPoint, 'orbital', apertureRadius, effDist, apertureRadius) : 0;
    const suppress = frame.coordinateFins.enabled && Math.abs(focusPoint.z) < 1e-3;
    const showBearings = (hasCore || hasOrbital) && !suppress && fadePlanar > 1e-3;

    if (diskBearingsRef.current) { diskBearingsRef.current.position.set(0, 0, -focusPoint.z); diskBearingsRef.current.visible = showBearings; }
    if (diskCoreRef.current) {
      diskCoreRef.current.scale.set(apertureRadius, apertureRadius, 1);
      diskCoreRef.current.visible = hasCore && showBearings && coreFade > 1e-3;
    }
    if (diskCoreMatRef.current) diskCoreMatRef.current.opacity = bearingCoreAlpha * fadePlanar * coreFade;

    if (diskOrbitalRef.current && diskOrbitalGeom) {
      const showOrb = hasOrbital && showBearings && orbFade > 1e-3;
      diskOrbitalRef.current.visible = showOrb;
      if (showOrb) {
        const prev = lastOrbitalDashRef.current;
        if (Math.abs(prev.radius - apertureRadius) > 1e-4 || Math.abs(prev.centerDist - effDist) > 1e-4 || Math.abs(prev.scale - screenScale) > 1e-4) {
          prev.radius = apertureRadius;
          prev.centerDist = effDist;
          prev.scale = screenScale;
          updateOrbitalDashedLine(diskOrbitalBuffer, diskOrbitalGeom, apertureRadius, effDist, screenScale);
        }
      }
    }
    if (diskOrbitalMatRef.current) diskOrbitalMatRef.current.opacity = bearingOrbitalAlpha * fadePlanar * orbFade;

    if (primaryFootprintRef.current) {
      const fpScale = THREE.MathUtils.lerp(screenScale, 1.0, cardinalAlignment.alphaZ);
      primaryFootprintRef.current.scale.set(fpScale, fpScale, 1);
      primaryFootprintRef.current.position.set(-focusPoint.x, -focusPoint.y, -focusPoint.z + 0.002);
      primaryFootprintRef.current.visible = isFootprintEnabled && fadePlanar > 1e-3;
    }
    if (primaryFootprintMatRef.current) primaryFootprintMatRef.current.opacity = footprintAlpha * fadePlanar;

    if (explicitFootprintsRef.current) {
      explicitFootprintsRef.current.position.set(-focusPoint.x, -focusPoint.y, -focusPoint.z);
      explicitFootprintsRef.current.visible = fadePlanar > 1e-3;
      if (fadePlanar > 1e-3 && footprints?.length) {
        assignExplicitFootprintFade(fadePlanar);
        explicitFootprintsRef.current.traverse(updateExplicitFootprintChild);
      }
    }
  });

  if (!isPlaneEnabled) return null;

  return (
    <group ref={groupRef} name="datum-plane">
      {isFillEnabled && (
        <mesh ref={fillMeshRef} name="datum-plane-fill" frustumCulled={false} raycast={NOOP_RAYCAST}>
          <primitive object={fillCircleGeom} attach="geometry" />
          <shaderMaterial vertexShader={DATUM_FILL_VERTEX_SHADER} fragmentShader={DATUM_FILL_FRAGMENT_SHADER} uniforms={fillUniforms} transparent depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      )}
      <lineLoop ref={boundaryLineRef} name="datum-plane-boundary" frustumCulled={false} raycast={NOOP_RAYCAST}>
        <primitive object={boundaryGeom} attach="geometry" />
        <lineBasicMaterial ref={boundaryMatRef} color={datumPlaneMajorColor} opacity={datumPlaneMajorAlpha} transparent depthWrite={false} />
      </lineLoop>
      {isGridEnabled && gridGeom && (
        <group ref={staticPlanarGridRef} name="static-planar-grid-group">
          <lineSegments name="planar-galactic-grid" frustumCulled={false} raycast={NOOP_RAYCAST}>
            <primitive object={gridGeom} attach="geometry" />
            <lineBasicMaterial ref={gridMatRef} color={datumPlaneMinorColor} opacity={datumPlaneMinorAlpha} transparent depthWrite={false} />
          </lineSegments>
        </group>
      )}
      {frame.datumPlane.rings && <RangeRings rings={rings} majorRingIndex={majorRingIndex} lockToFocusPoint={false} position={[0, 0, 0]} />}
      {(hasCore || hasOrbital) && (
        <group ref={diskBearingsRef} name="disk-bearings">
          {hasCore && (
            <lineSegments ref={diskCoreRef} name="bearing-core" scale={[1, 1, 1]} frustumCulled={false} raycast={NOOP_RAYCAST}>
              <primitive object={bearingCoreGeom} attach="geometry" />
              <lineBasicMaterial ref={diskCoreMatRef} color={bearingCoreColor} opacity={bearingCoreAlpha} transparent depthWrite={false} />
            </lineSegments>
          )}
          {hasOrbital && (
            <lineSegments ref={diskOrbitalRef} name="bearing-orbital" frustumCulled={false} raycast={NOOP_RAYCAST}>
              <primitive object={diskOrbitalGeom} attach="geometry" />
              <lineBasicMaterial ref={diskOrbitalMatRef} color={bearingOrbitalColor} opacity={bearingOrbitalAlpha} transparent depthWrite={false} />
            </lineSegments>
          )}
        </group>
      )}
      {isFootprintEnabled && (
        <group ref={primaryFootprintRef} name="planar-footprint">
          <lineSegments frustumCulled={false} raycast={NOOP_RAYCAST}>
            <primitive object={primaryFootprintGeom} attach="geometry" />
            <lineBasicMaterial ref={primaryFootprintMatRef} color={footprintColor} opacity={footprintAlpha} transparent depthWrite={false} />
          </lineSegments>
        </group>
      )}
      {footprints && footprints.length > 0 && (
        <group ref={explicitFootprintsRef} name="explicit-planar-footprints">
          {footprints.map((fp) => (
            <PlanarFootprintItem key={`explicit-footprint-${fp.id}`} footprint={fp} defaultSize={footprintSize} defaultColor={footprintColor} defaultAlpha={footprintAlpha} />
          ))}
        </group>
      )}
    </group>
  );
});
