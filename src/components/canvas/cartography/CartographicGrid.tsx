import type React from 'react';
import { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useThreeTokenStore } from '../../../stores/useThreeTokenStore';

export interface CartographicGridProps {
  /** Outer focal aperture radius (R_fin) in scene coordinate units / parsecs. Default: 10 */
  radius?: number;
  /** Concentric range ring radii. Default: [2.5, 5, 10] */
  rangeRings?: number[];
  /** Index in rangeRings designated as major (prominent stroke). Default: 2 (outer) */
  majorRingIndex?: number;
  /** Whether to render the three orthogonal travelling fins and their concentric arcs. Default: true */
  showFins?: boolean;
  /** Whether to render optional full 360-degree datum projection circles on Z=0. Default: false */
  showFullDatumCircle?: boolean;
  /** Whether to render the 3 orthogonal axis lines (+X, +Y extended, +Z to radius). Default: true */
  showAxisLines?: boolean;
  /** Whether to enable dynamic perspective-to-orthographic projection switching when looking along cardinal axes. Default: true */
  adaptiveProjection?: boolean;
  /** Angular threshold (cosine dot product) where transition begins (~32 deg from axis). Default: 0.85 */
  thresholdStart?: number;
  /** Angular threshold (cosine dot product) where transition completes (~16 deg from axis). Default: 0.96 */
  thresholdEnd?: number;
  /** Reference origin position. Default: [0, 0, 0] */
  position?: [number, number, number];
}

const ARC_STEPS = 128; // 128 segments around full circle; 32 segments per 90-degree quadrant
const QUADRANT_STEPS = 32;
const DEGREE_TICKS = [15, 30, 45, 60, 75]; // Perimeter degree markings

/**
 * Fills a Float32Array with 129 vertices for a full circle starting from the active quadrant (sx, sy, sz).
 * Vertices 0..32 form the 90-degree quadrant arc closest to the camera.
 * Vertices 32..128 form the remaining 270 degrees completing the 360-degree loop.
 */
function fillArcBuffer(
  buffer: Float32Array,
  radius: number,
  plane: 'xy' | 'xz' | 'yz',
  sx: number,
  sy: number,
  sz: number,
  steps = ARC_STEPS,
): void {
  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * Math.PI * 2;
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    const idx = i * 3;

    if (plane === 'xy') {
      buffer[idx] = radius * cosT * sx;
      buffer[idx + 1] = radius * sinT * sy;
      buffer[idx + 2] = 0;
    } else if (plane === 'xz') {
      buffer[idx] = radius * cosT * sx;
      buffer[idx + 1] = 0;
      buffer[idx + 2] = radius * sinT * sz;
    } else {
      buffer[idx] = 0;
      buffer[idx + 1] = radius * cosT * sy;
      buffer[idx + 2] = radius * sinT * sz;
    }
  }
}

/**
 * Fills radial tick segments for the outer arc of a fin in the active quadrant.
 */
function fillTickBuffer(
  buffer: Float32Array,
  radius: number,
  plane: 'xy' | 'xz' | 'yz',
  sx: number,
  sy: number,
  sz: number,
  tickLength = 0.25,
): void {
  let idx = 0;
  for (const deg of DEGREE_TICKS) {
    const rad = (deg * Math.PI) / 180;
    const cosR = Math.cos(rad);
    const sinR = Math.sin(rad);
    const rOuter = radius;
    const rInner = radius - tickLength;

    if (plane === 'xy') {
      buffer[idx++] = rInner * cosR * sx;
      buffer[idx++] = rInner * sinR * sy;
      buffer[idx++] = 0;
      buffer[idx++] = rOuter * cosR * sx;
      buffer[idx++] = rOuter * sinR * sy;
      buffer[idx++] = 0;
    } else if (plane === 'xz') {
      buffer[idx++] = rInner * cosR * sx;
      buffer[idx++] = 0;
      buffer[idx++] = rInner * sinR * sz;
      buffer[idx++] = rOuter * cosR * sx;
      buffer[idx++] = 0;
      buffer[idx++] = rOuter * sinR * sz;
    } else {
      buffer[idx++] = 0;
      buffer[idx++] = rInner * cosR * sy;
      buffer[idx++] = rInner * sinR * sz;
      buffer[idx++] = 0;
      buffer[idx++] = rOuter * cosR * sy;
      buffer[idx++] = rOuter * sinR * sz;
    }
  }
}

/**
 * Calculates the angular cardinal alignment factors for a given camera direction vector.
 * Smooth transition range: [thresholdStart = 0.85, thresholdEnd = 0.96].
 * - Standard perspective view (> 32 deg from axis) has alpha = 0 (3 full fins visible).
 * - Cardinal axis transition (< 32 deg) smoothly expands concentric circles and fades edge-on fins.
 * - Cardinal view (< 16 deg) has dot >= 0.96 -> alpha = 1.0 (complete orthographic lock).
 */
export function computeCardinalAlignment(
  camDirection: THREE.Vector3,
  startThreshold = 0.85,
  endThreshold = 0.96,
): { alphaX: number; alphaY: number; alphaZ: number; maxAlpha: number } {
  const dotX = Math.abs(camDirection.x);
  const dotY = Math.abs(camDirection.y);
  const dotZ = Math.abs(camDirection.z);

  const calcSmoothAlpha = (dot: number): number => {
    if (dot <= startThreshold) return 0;
    if (dot >= endThreshold) return 1;
    const t = (dot - startThreshold) / (endThreshold - startThreshold);
    return t * t * (3 - 2 * t);
  };

  const alphaX = calcSmoothAlpha(dotX);
  const alphaY = calcSmoothAlpha(dotY);
  const alphaZ = calcSmoothAlpha(dotZ);
  const maxAlpha = Math.max(alphaX, alphaY, alphaZ);

  return { alphaX, alphaY, alphaZ, maxAlpha };
}

/**
 * CartographicGrid: Authoritative 3D spatial coordinate instrument.
 * Renders three mobile travelling orthogonal fins with 90-degree concentric range arcs on all three axes (XY, XZ, YZ).
 *
 * Dynamic Camera Coupling:
 * 1. Mobile Travelling Fins: The 90-degree quadrant bounded by the fins dynamically tracks the octant closest to the camera.
 * 2. Cardinal Alignment: As viewing angle approaches any axis, the camera smoothly switches to orthographic projection.
 * 3. Face-On Expansion: The concentric arcs on the face-on plane expand in real time from 90 degrees to full 360-degree circles.
 * 4. Edge-On Grazing Fade: The fins becoming edge-on smoothly fade to 0 opacity at the exact same rate.
 * 5. Distinct Prominent Bearings: Two extended horizontal bearing lines (+X Core, +Y Orbital) styled prominently.
 * 6. Bordering Fin Rule: Structural axis lines only appear when both bordering fins are rendered (never solo facing camera).
 */
export const CartographicGrid: React.FC<CartographicGridProps> = ({
  radius = 10,
  rangeRings = [2.5, 5, 10],
  majorRingIndex = 2,
  showFins = true,
  showFullDatumCircle = false,
  showAxisLines = true,
  adaptiveProjection = true,
  thresholdStart = 0.85,
  thresholdEnd = 0.96,
  position = [0, 0, 0],
}) => {
  const tokens = useThreeTokenStore((state) => state.tokens);
  const { camera } = useThree();

  const baseFovRef = useRef<number | null>(null);

  // Active octant signs (tracking the segment closest to the camera)
  const signsRef = useRef<{ sx: number; sy: number; sz: number }>({ sx: 1, sy: 1, sz: 1 });

  // Memoize Arc Lines for each plane (XY, XZ, YZ)
  const arcData = useMemo(() => {
    const buildArcLines = (plane: 'xy' | 'xz' | 'yz') => {
      return rangeRings.map((r) => {
        const buffer = new Float32Array((ARC_STEPS + 1) * 3);
        fillArcBuffer(buffer, r, plane, 1, 1, 1, ARC_STEPS);
        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.BufferAttribute(buffer, 3));
        geom.setDrawRange(0, QUADRANT_STEPS + 1);
        geom.computeBoundingSphere();
        const mat = new THREE.LineBasicMaterial({ transparent: true, depthWrite: false });
        const line = new THREE.Line(geom, mat);
        line.frustumCulled = false;
        return { radius: r, buffer, geom, mat, line };
      });
    };

    return {
      xy: buildArcLines('xy'),
      xz: buildArcLines('xz'),
      yz: buildArcLines('yz'),
    };
  }, [rangeRings]);

  // Clean up geometries and materials on unmount
  useEffect(() => {
    return () => {
      for (const list of [arcData.xy, arcData.xz, arcData.yz]) {
        for (const item of list) {
          item.geom.dispose();
          item.mat.dispose();
        }
      }
    };
  }, [arcData]);

  // Restore camera FOV and zoom on unmount
  useEffect(() => {
    return () => {
      if (camera instanceof THREE.PerspectiveCamera && baseFovRef.current !== null) {
        camera.fov = baseFovRef.current;
        camera.zoom = 1.0;
        camera.updateProjectionMatrix();
      }
    };
  }, [camera]);

  // Fin Ticks memoization
  const tickData = useMemo(() => {
    const tickLen = radius * 0.035;
    const buildTicks = (plane: 'xy' | 'xz' | 'yz') => {
      const buffer = new Float32Array(DEGREE_TICKS.length * 6);
      fillTickBuffer(buffer, radius, plane, 1, 1, 1, tickLen);
      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.BufferAttribute(buffer, 3));
      geom.computeBoundingSphere();
      const mat = new THREE.LineBasicMaterial({ transparent: true, depthWrite: false });
      return { buffer, geom, mat, tickLen };
    };

    return {
      xy: buildTicks('xy'),
      xz: buildTicks('xz'),
      yz: buildTicks('yz'),
    };
  }, [radius]);

  useEffect(() => {
    return () => {
      tickData.xy.geom.dispose();
      tickData.xy.mat.dispose();
      tickData.xz.geom.dispose();
      tickData.xz.mat.dispose();
      tickData.yz.geom.dispose();
      tickData.yz.mat.dispose();
    };
  }, [tickData]);

  // Fin bounding structural axis segments (origin to fin radius edge)
  const finAxisLines = useMemo(() => {
    const bufX = new Float32Array([0, 0, 0, radius, 0, 0]);
    const bufY = new Float32Array([0, 0, 0, 0, radius, 0]);
    const bufZ = new Float32Array([0, 0, 0, 0, 0, radius]);

    const geomX = new THREE.BufferGeometry();
    geomX.setAttribute('position', new THREE.BufferAttribute(bufX, 3));
    geomX.computeBoundingSphere();
    const matX = new THREE.LineBasicMaterial({ transparent: true, depthWrite: false });

    const geomY = new THREE.BufferGeometry();
    geomY.setAttribute('position', new THREE.BufferAttribute(bufY, 3));
    geomY.computeBoundingSphere();
    const matY = new THREE.LineBasicMaterial({ transparent: true, depthWrite: false });

    const geomZ = new THREE.BufferGeometry();
    geomZ.setAttribute('position', new THREE.BufferAttribute(bufZ, 3));
    geomZ.computeBoundingSphere();
    const matZ = new THREE.LineBasicMaterial({ transparent: true, depthWrite: false });

    return {
      x: { buffer: bufX, geom: geomX, mat: matX },
      y: { buffer: bufY, geom: geomY, mat: matY },
      z: { buffer: bufZ, geom: geomZ, mat: matZ },
    };
  }, [radius]);

  useEffect(() => {
    return () => {
      finAxisLines.x.geom.dispose();
      finAxisLines.x.mat.dispose();
      finAxisLines.y.geom.dispose();
      finAxisLines.y.mat.dispose();
      finAxisLines.z.geom.dispose();
      finAxisLines.z.mat.dispose();
    };
  }, [finAxisLines]);

  // Extended Horizontal Bearing Lines (+X Core, +Y Orbital)
  const extendedBearings = useMemo(() => {
    const bearingLen = radius * 1.35;
    const corePoints = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(bearingLen, 0, 0)];
    const orbitalPoints = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, bearingLen, 0)];

    const geomCore = new THREE.BufferGeometry().setFromPoints(corePoints);
    const geomOrbital = new THREE.BufferGeometry().setFromPoints(orbitalPoints);
    geomCore.computeBoundingSphere();
    geomOrbital.computeBoundingSphere();

    const matCore = new THREE.LineBasicMaterial({ transparent: true, depthWrite: false });
    const matOrbital = new THREE.LineBasicMaterial({ transparent: true, depthWrite: false });

    return {
      core: geomCore,
      orbital: geomOrbital,
      matCore,
      matOrbital,
    };
  }, [radius]);

  useEffect(() => {
    return () => {
      extendedBearings.core.dispose();
      extendedBearings.orbital.dispose();
      extendedBearings.matCore.dispose();
      extendedBearings.matOrbital.dispose();
    };
  }, [extendedBearings]);

  // Update base material colors from design tokens
  useEffect(() => {
    const updateRingMats = (list: typeof arcData.xy) => {
      list.forEach((item, index) => {
        const isMajor = index === majorRingIndex;
        const color = isMajor ? tokens.gridPrimaryColor : tokens.rangeRingColor;
        item.mat.color.copy(color);
      });
    };

    updateRingMats(arcData.xy);
    updateRingMats(arcData.xz);
    updateRingMats(arcData.yz);

    tickData.xy.mat.color.copy(tokens.rangeTickColor);
    tickData.xz.mat.color.copy(tokens.rangeTickColor);
    tickData.yz.mat.color.copy(tokens.rangeTickColor);

    finAxisLines.x.mat.color.copy(tokens.axisLineColor);
    finAxisLines.x.mat.linewidth = tokens.axisLineWidth;
    finAxisLines.y.mat.color.copy(tokens.axisLineColor);
    finAxisLines.y.mat.linewidth = tokens.axisLineWidth;
    finAxisLines.z.mat.color.copy(tokens.axisLineColor);
    finAxisLines.z.mat.linewidth = tokens.axisLineWidth;

    // Prominent bearing line styling
    extendedBearings.matCore.color.copy(tokens.bearingLineColor);
    extendedBearings.matCore.opacity = tokens.bearingLineAlpha;
    extendedBearings.matCore.linewidth = tokens.bearingLineWidth;
    extendedBearings.matOrbital.color.copy(tokens.bearingLineColor);
    extendedBearings.matOrbital.opacity = tokens.bearingLineAlpha;
    extendedBearings.matOrbital.linewidth = tokens.bearingLineWidth;
  }, [tokens, majorRingIndex, arcData, tickData, finAxisLines, extendedBearings]);

  // Optional full 360-degree datum circles
  const fullDatumGeometries = useMemo(() => {
    if (!showFullDatumCircle) return [];
    return rangeRings.map((r) => {
      const buffer = new Float32Array((ARC_STEPS + 1) * 3);
      fillArcBuffer(buffer, r, 'xy', 1, 1, 1, ARC_STEPS);
      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.BufferAttribute(buffer, 3));
      geom.computeBoundingSphere();
      return geom;
    });
  }, [rangeRings, showFullDatumCircle]);

  // Frame Loop: Active octant tracking, cardinal alignment, dynamic arc expansion, edge-on fading, adaptive projection
  useFrame(({ camera: activeCamera }) => {
    if (!showFins) return;

    // Vector from grid position to camera
    const origin = new THREE.Vector3(...position);
    const camDir = activeCamera.position.clone().sub(origin).normalize();

    // 1. Determine active octant closest to camera (with hysteresis to prevent boundary chatter)
    const DEAD_BAND = 0.005;
    let sx = signsRef.current.sx;
    let sy = signsRef.current.sy;
    let sz = signsRef.current.sz;
    if (camDir.x > DEAD_BAND) sx = 1;
    else if (camDir.x < -DEAD_BAND) sx = -1;
    if (camDir.y > DEAD_BAND) sy = 1;
    else if (camDir.y < -DEAD_BAND) sy = -1;
    if (camDir.z > DEAD_BAND) sz = 1;
    else if (camDir.z < -DEAD_BAND) sz = -1;

    if (
      sx !== signsRef.current.sx ||
      sy !== signsRef.current.sy ||
      sz !== signsRef.current.sz
    ) {
      signsRef.current = { sx, sy, sz };

      // In-place buffer update for travelling fins to bound the closest segment
      for (const item of arcData.xy) {
        fillArcBuffer(item.buffer, item.radius, 'xy', sx, sy, sz, ARC_STEPS);
        item.geom.attributes.position.needsUpdate = true;
        item.geom.computeBoundingSphere();
      }
      for (const item of arcData.xz) {
        fillArcBuffer(item.buffer, item.radius, 'xz', sx, sy, sz, ARC_STEPS);
        item.geom.attributes.position.needsUpdate = true;
        item.geom.computeBoundingSphere();
      }
      for (const item of arcData.yz) {
        fillArcBuffer(item.buffer, item.radius, 'yz', sx, sy, sz, ARC_STEPS);
        item.geom.attributes.position.needsUpdate = true;
        item.geom.computeBoundingSphere();
      }

      // Update ticks
      fillTickBuffer(tickData.xy.buffer, radius, 'xy', sx, sy, sz, tickData.xy.tickLen);
      tickData.xy.geom.attributes.position.needsUpdate = true;
      tickData.xy.geom.computeBoundingSphere();
      fillTickBuffer(tickData.xz.buffer, radius, 'xz', sx, sy, sz, tickData.xz.tickLen);
      tickData.xz.geom.attributes.position.needsUpdate = true;
      tickData.xz.geom.computeBoundingSphere();
      fillTickBuffer(tickData.yz.buffer, radius, 'yz', sx, sy, sz, tickData.yz.tickLen);
      tickData.yz.geom.attributes.position.needsUpdate = true;
      tickData.yz.geom.computeBoundingSphere();

      // Update structural fin axis lines to point into active octant
      finAxisLines.x.buffer[3] = radius * sx;
      finAxisLines.x.geom.attributes.position.needsUpdate = true;
      finAxisLines.x.geom.computeBoundingSphere();
      finAxisLines.y.buffer[4] = radius * sy;
      finAxisLines.y.geom.attributes.position.needsUpdate = true;
      finAxisLines.y.geom.computeBoundingSphere();
      finAxisLines.z.buffer[5] = radius * sz;
      finAxisLines.z.geom.attributes.position.needsUpdate = true;
      finAxisLines.z.geom.computeBoundingSphere();
    }

    // 2. Cardinal alignment calculation
    const { alphaX, alphaY, alphaZ, maxAlpha } = computeCardinalAlignment(
      camDir,
      thresholdStart,
      thresholdEnd,
    );

    // 3. Arc Expansion: Face-on arcs expand from 90 deg (33 points) to 360 deg (129 points)
    const countXY = Math.round((QUADRANT_STEPS + 1) + alphaZ * (ARC_STEPS - QUADRANT_STEPS));
    const countXZ = Math.round((QUADRANT_STEPS + 1) + alphaY * (ARC_STEPS - QUADRANT_STEPS));
    const countYZ = Math.round((QUADRANT_STEPS + 1) + alphaX * (ARC_STEPS - QUADRANT_STEPS));

    for (const item of arcData.xy) item.geom.setDrawRange(0, countXY);
    for (const item of arcData.xz) item.geom.setDrawRange(0, countXZ);
    for (const item of arcData.yz) item.geom.setDrawRange(0, countYZ);

    // 4. Edge-On Fin Fading: Fins becoming edge-on smoothly fade to 0 opacity
    const fadeXY = 1 - Math.max(alphaX, alphaY);
    const fadeXZ = 1 - Math.max(alphaX, alphaZ);
    const fadeYZ = 1 - Math.max(alphaY, alphaZ);

    arcData.xy.forEach((item, idx) => {
      const isMajor = idx === majorRingIndex;
      const baseAlpha = isMajor ? tokens.gridPrimaryAlpha * 1.5 : tokens.rangeRingAlpha;
      item.mat.opacity = baseAlpha * fadeXY;
      item.mat.visible = item.mat.opacity > 0.001;
    });
    tickData.xy.mat.opacity = tokens.rangeTickAlpha * fadeXY;
    tickData.xy.mat.visible = tickData.xy.mat.opacity > 0.001;

    arcData.xz.forEach((item, idx) => {
      const isMajor = idx === majorRingIndex;
      const baseAlpha = isMajor ? tokens.gridPrimaryAlpha * 1.5 : tokens.rangeRingAlpha;
      item.mat.opacity = baseAlpha * fadeXZ;
      item.mat.visible = item.mat.opacity > 0.001;
    });
    tickData.xz.mat.opacity = tokens.rangeTickAlpha * fadeXZ;
    tickData.xz.mat.visible = tickData.xz.mat.opacity > 0.001;

    arcData.yz.forEach((item, idx) => {
      const isMajor = idx === majorRingIndex;
      const baseAlpha = isMajor ? tokens.gridPrimaryAlpha * 1.5 : tokens.rangeRingAlpha;
      item.mat.opacity = baseAlpha * fadeYZ;
      item.mat.visible = item.mat.opacity > 0.001;
    });
    tickData.yz.mat.opacity = tokens.rangeTickAlpha * fadeYZ;
    tickData.yz.mat.visible = tickData.yz.mat.opacity > 0.001;

    // 5. Structural Axis Spokes Rule:
    // "other than the two bearing axis lines, the rest should only appear when both bordering fins are rendered, IE never solo facing the camera."
    const fadeAxisX = Math.min(fadeXY, fadeXZ);
    const fadeAxisY = Math.min(fadeXY, fadeYZ);
    const fadeAxisZ = Math.min(fadeXZ, fadeYZ);

    // -X fin spoke only rendered when active quadrant is -X AND both bordering fins (XY and XZ) are rendered
    finAxisLines.x.mat.opacity = tokens.axisLineAlpha * fadeAxisX;
    finAxisLines.x.mat.visible = finAxisLines.x.mat.opacity > 0.001 && signsRef.current.sx < 0;

    // -Y fin spoke only rendered when active quadrant is -Y AND both bordering fins (XY and YZ) are rendered
    finAxisLines.y.mat.opacity = tokens.axisLineAlpha * fadeAxisY;
    finAxisLines.y.mat.visible = finAxisLines.y.mat.opacity > 0.001 && signsRef.current.sy < 0;

    // Z fin spoke only rendered when both bordering fins (XZ and YZ) are rendered (never solo facing camera)
    finAxisLines.z.mat.opacity = tokens.axisLineAlpha * fadeAxisZ;
    finAxisLines.z.mat.visible = finAxisLines.z.mat.opacity > 0.001;

    // 6. Adaptive Orthographic Switch: Narrow FOV and compensate zoom to maintain target footprint
    if (adaptiveProjection && activeCamera instanceof THREE.PerspectiveCamera) {
      if (baseFovRef.current === null) {
        baseFovRef.current = activeCamera.fov;
      }
      const baseFov = baseFovRef.current;
      const targetFov = baseFov * (1 - 0.92 * maxAlpha); // 45 deg -> ~3.6 deg
      const targetZoom =
        Math.tan((targetFov * Math.PI) / 360) / Math.tan((baseFov * Math.PI) / 360);

      activeCamera.fov = targetFov;
      activeCamera.zoom = targetZoom;
      activeCamera.updateProjectionMatrix();
    }
  });

  return (
    <group position={position} data-testid="cartographic-grid">
      {/* Three Mobile Travelling Fins with Concentric Range Arcs (Closest Segment to Camera) */}
      {showFins && (
        <group data-testid="travelling-fins">
          {/* XY Fin (Galactic Equator) */}
          <group data-testid="fin-xy">
            {arcData.xy.map((entry) => (
              <primitive
                key={`xy-arc-${entry.radius}`}
                data-testid={`arc-tier-${entry.radius}`}
                object={entry.line}
              />
            ))}
            <lineSegments geometry={tickData.xy.geom} material={tickData.xy.mat} frustumCulled={false} />
          </group>

          {/* XZ Fin (Core Meridian) */}
          <group data-testid="fin-xz">
            {arcData.xz.map((entry) => (
              <primitive key={`xz-arc-${entry.radius}`} object={entry.line} />
            ))}
            <lineSegments geometry={tickData.xz.geom} material={tickData.xz.mat} frustumCulled={false} />
          </group>

          {/* YZ Fin (Transverse) */}
          <group data-testid="fin-yz">
            {arcData.yz.map((entry) => (
              <primitive key={`yz-arc-${entry.radius}`} object={entry.line} />
            ))}
            <lineSegments geometry={tickData.yz.geom} material={tickData.yz.mat} frustumCulled={false} />
          </group>
        </group>
      )}

      {/* Axis Lines */}
      {showAxisLines && (
        <group data-testid="cardinal-bearings">
          {/* Active Fin Structural Axis Spokes (Origin to Fin Edge, only when both bordering fins rendered) */}
          <lineSegments
            geometry={finAxisLines.x.geom}
            material={finAxisLines.x.mat}
            frustumCulled={false}
          />
          <lineSegments
            geometry={finAxisLines.y.geom}
            material={finAxisLines.y.mat}
            frustumCulled={false}
          />
          <lineSegments
            geometry={finAxisLines.z.geom}
            material={finAxisLines.z.mat}
            frustumCulled={false}
          />

          {/* Prominent Extended Cardinal Bearing Lines: +X (Galactic Core), +Y (Galactic Orbit) */}
          <lineSegments
            geometry={extendedBearings.core}
            material={extendedBearings.matCore}
            frustumCulled={false}
          />
          <lineSegments
            geometry={extendedBearings.orbital}
            material={extendedBearings.matOrbital}
            frustumCulled={false}
          />
        </group>
      )}

      {/* Optional Full 360-Degree Datum Circles */}
      {showFullDatumCircle &&
        fullDatumGeometries.map((geom, index) => {
          const isMajor = index === majorRingIndex;
          const color = isMajor ? tokens.gridPrimaryColor : tokens.rangeRingColor;
          const opacity = isMajor ? tokens.gridPrimaryAlpha : tokens.rangeRingAlpha;
          return (
            <lineLoop
              key={`full-ring-${rangeRings[index]}`}
              data-testid={`full-ring-${rangeRings[index]}`}
              geometry={geom}
              frustumCulled={false}
            >
              <lineBasicMaterial
                color={color}
                opacity={opacity}
                transparent={opacity < 1.0}
                depthWrite={false}
              />
            </lineLoop>
          );
        })}
    </group>
  );
};
