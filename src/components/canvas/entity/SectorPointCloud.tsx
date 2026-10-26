import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useThreeTokenStore } from '../../../stores/useThreeTokenStore';
import { useSpatialFrameSafe } from '../instrument/SpatialFrameProvider';
import { useLazyRef } from '../../../hooks/useLazyRef';
import {
  SectorStreamingManager,
  createSceneSectorPointsFactory,
} from '../../../services/sectorStreamingService';
import { InstrumentHydrationBridge } from '../../../services/instrumentHydrationService';
import type { SystemSummaryNode } from '../../../types/astro';

export const STARFIELD_VERTEX_SHADER = /* glsl */ `
  uniform float uPointSize;
  uniform float uBaseOpacity;
  uniform vec3 uFocusCenter;
  uniform float uApertureRadius;
  uniform vec3 uCameraPos;
  uniform float uHorizonRadius;

  varying float vAlpha;
  varying float vLuminance;

  void main() {
    vec3 worldPos = (modelMatrix * vec4(position, 1.0)).xyz;
    float distFromOrigin = distance(worldPos, uFocusCenter);

    if (distFromOrigin > uHorizonRadius) {
      vAlpha = 0.0;
      vLuminance = 0.0;
      gl_PointSize = 0.0;
      gl_Position = projectionMatrix * viewMatrix * vec4(worldPos, 1.0);
      return;
    }

    float innerT = clamp(distFromOrigin / max(uApertureRadius, 0.001), 0.0, 1.0);
    float outerSpan = max(uHorizonRadius - uApertureRadius, 1.0);
    float outerT = clamp((distFromOrigin - uApertureRadius) / outerSpan, 0.0, 1.0);
    float radialFalloff = distFromOrigin <= uApertureRadius
      ? mix(1.0, 0.72, innerT)
      : 0.72 * (1.0 - outerT) * (1.0 - outerT);

    vLuminance = mix(0.35, 1.0, radialFalloff);

    vec3 camToOrigin = uFocusCenter - uCameraPos;
    float camDist = length(camToOrigin);
    vec3 viewDir = camToOrigin / max(camDist, 0.001);
    vec3 camToStar = worldPos - uCameraPos;
    float alongRay = dot(camToStar, viewDir);
    float perpDist = length(camToStar - viewDir * alongRay);

    float corridorRadius = max(uApertureRadius * 1.4, 5.0);
    float inCorridor = 1.0 - smoothstep(uApertureRadius * 0.8, corridorRadius, perpDist);
    float inFront = 1.0 - smoothstep(max(camDist - uApertureRadius * 1.1, 0.0), camDist, alongRay);
    float fgMask = step(uApertureRadius, distFromOrigin) * step(0.0, alongRay) * inCorridor * inFront;
    float fgFactor = mix(1.0, 0.08, fgMask);

    vAlpha = uBaseOpacity * radialFalloff * fgFactor;
    gl_PointSize = uPointSize;
    gl_Position = projectionMatrix * viewMatrix * vec4(worldPos, 1.0);
  }
`;

export const STARFIELD_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uColor;

  varying float vAlpha;
  varying float vLuminance;

  void main() {
    if (vAlpha <= 0.001) {
      discard;
    }
    float r = length(gl_PointCoord - vec2(0.5));
    if (r > 0.5) {
      discard;
    }
    float disc = smoothstep(0.5, 0.15, r);
    gl_FragColor = vec4(uColor * vLuminance, vAlpha * disc);
  }
`;

export function createStarfieldPointsMaterial(
  pointSize: number = 2.0,
  pointOpacity: number = 0.85,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(0xffffff) },
      uPointSize: { value: pointSize },
      uBaseOpacity: { value: pointOpacity },
      uFocusCenter: { value: new THREE.Vector3(0, 0, 0) },
      uApertureRadius: { value: 15.0 },
      uCameraPos: { value: new THREE.Vector3(0, -35, 20) },
      uHorizonRadius: { value: 36.0 },
    },
    vertexShader: STARFIELD_VERTEX_SHADER,
    fragmentShader: STARFIELD_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
  });
}

export interface SectorPointCloudProps {
  readonly manager?: SectorStreamingManager;
  readonly pointSize?: number;
  readonly pointOpacity?: number;
  readonly onHydratedSummariesChange?: (summaries: readonly SystemSummaryNode[]) => void;
}

/**
 * SectorPointCloud: Hardware-budgeted spatial starfield point cloud.
 * Streams 16-byte binary sector partitions with asynchronous GPU uploading,
 * LRU RAM caching, custom starfield shader material, and zero-allocation frame updates.
 */
export function SectorPointCloud({
  manager,
  pointSize = 2.0,
  pointOpacity = 0.85,
  onHydratedSummariesChange,
}: SectorPointCloudProps) {
  const reticleBracketColor = useThreeTokenStore((s) => s.tokens.reticleBracketColor);
  const frameCtx = useSpatialFrameSafe();
  const groupRef = useRef<THREE.Group>(null);

  const material = useMemo(() => {
    return createStarfieldPointsMaterial(pointSize, pointOpacity);
  }, []);

  useEffect(() => {
    material.uniforms.uPointSize.value = pointSize;
    material.uniforms.uBaseOpacity.value = pointOpacity;
  }, [material, pointSize, pointOpacity]);

  useEffect(() => {
    (material.uniforms.uColor.value as THREE.Color).copy(reticleBracketColor);
  }, [material, reticleBracketColor]);

  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  const targetRef = useRef<{ group: THREE.Group | null; material: THREE.Material | null }>({
    group: null,
    material: null,
  });

  useEffect(() => {
    targetRef.current.group = groupRef.current;
    targetRef.current.material = material;
  }, [material]);

  const internalManager = useMemo(() => {
    if (manager) return null;
    return new SectorStreamingManager({
      gpuResourceFactory: createSceneSectorPointsFactory(() => targetRef.current),
    });
  }, [manager]);

  useEffect(() => {
    return () => {
      internalManager?.dispose();
    };
  }, [internalManager]);

  const resolvedManager = manager ?? internalManager;

  const hydrationBridge = useMemo(() => new InstrumentHydrationBridge(), []);

  useEffect(() => {
    return () => {
      hydrationBridge.dispose();
    };
  }, [hydrationBridge]);

  const onSummariesRef = useRef(onHydratedSummariesChange);
  useEffect(() => {
    onSummariesRef.current = onHydratedSummariesChange;
  }, [onHydratedSummariesChange]);

  const frameCtxRef = useRef(frameCtx);
  useEffect(() => {
    frameCtxRef.current = frameCtx;
  }, [frameCtx]);

  const lastXRef = useRef(Number.NaN);
  const lastYRef = useRef(Number.NaN);
  const lastZRef = useRef(Number.NaN);
  const scratchPosRef = useLazyRef<[number, number, number]>(() => [0, 0, 0]);

  const lastHydratedXRef = useRef(Number.NaN);
  const lastHydratedYRef = useRef(Number.NaN);
  const lastHydratedZRef = useRef(Number.NaN);
  const lastHydratedRadiusRef = useRef(Number.NaN);
  const hydratingRef = useRef(false);
  const pendingHydrationRef = useRef(false);
  const scratchHydrationPosRef = useLazyRef<[number, number, number]>(() => [0, 0, 0]);

  const triggerHydrationRef = useRef<((fx: number, fy: number, fz: number, apertureRadius: number) => void) | null>(null);

  const triggerHydration = (fx: number, fy: number, fz: number, apertureRadius: number) => {
    if (!resolvedManager) return;
    if (hydratingRef.current) {
      pendingHydrationRef.current = true;
      return;
    }
    hydratingRef.current = true;
    lastHydratedXRef.current = fx;
    lastHydratedYRef.current = fy;
    lastHydratedZRef.current = fz;
    lastHydratedRadiusRef.current = apertureRadius;

    const queryInputs = resolvedManager.getActiveSectorQueryInputs();
    const hPos = scratchHydrationPosRef.current;
    hPos[0] = fx;
    hPos[1] = fy;
    hPos[2] = fz;
    const lookaheadRadius = apertureRadius * 1.15;

    void hydrationBridge
      .updateInstrumentPerimeter(queryInputs, hPos, lookaheadRadius)
      .then((state) => {
        hydratingRef.current = false;
        onSummariesRef.current?.(state.activeSummaries);
        if (pendingHydrationRef.current) {
          pendingHydrationRef.current = false;
          const currentFocus = frameCtxRef.current?.frameRef?.current?.focusPoint;
          const currentFx = currentFocus ? currentFocus.x : lastHydratedXRef.current;
          const currentFy = currentFocus ? currentFocus.y : lastHydratedYRef.current;
          const currentFz = currentFocus ? currentFocus.z : lastHydratedZRef.current;
          const currentRadius = frameCtxRef.current?.frameRef?.current?.apertureRadius ?? 15.0;
          if (currentFocus) {
            triggerHydration(currentFx, currentFy, currentFz, currentRadius);
          } else {
            triggerHydration(
              lastHydratedXRef.current,
              lastHydratedYRef.current,
              lastHydratedZRef.current,
              currentRadius,
            );
          }
        }
      })
      .catch(() => {
        hydratingRef.current = false;
      });
  };
  triggerHydrationRef.current = triggerHydration;

  useEffect(() => {
    if (!resolvedManager) return;

    const unsubscribe = resolvedManager.subscribe(() => {
      const focus = frameCtxRef.current?.frameRef?.current?.focusPoint;
      const fx = focus ? focus.x : (Number.isNaN(lastXRef.current) ? 0 : lastXRef.current);
      const fy = focus ? focus.y : (Number.isNaN(lastYRef.current) ? 0 : lastYRef.current);
      const fz = focus ? focus.z : (Number.isNaN(lastZRef.current) ? 0 : lastZRef.current);
      const apertureRadius = frameCtxRef.current?.frameRef?.current?.apertureRadius ?? 15.0;
      triggerHydrationRef.current?.(fx, fy, fz, apertureRadius);
    });

    if (Number.isNaN(lastXRef.current)) {
      lastXRef.current = scratchPosRef.current[0];
      lastYRef.current = scratchPosRef.current[1];
      lastZRef.current = scratchPosRef.current[2];
      void resolvedManager.updateCameraPosition([
        scratchPosRef.current[0],
        scratchPosRef.current[1],
        scratchPosRef.current[2],
      ]);
    }

    return () => {
      unsubscribe();
    };
  }, [resolvedManager, hydrationBridge, scratchPosRef]);

  useFrame(({ camera }) => {
    if (!resolvedManager) return;

    const focusPoint = frameCtx?.frameRef?.current?.focusPoint ?? camera.position;
    const fx = focusPoint.x;
    const fy = focusPoint.y;
    const fz = focusPoint.z;
    const apertureRadius = frameCtx?.frameRef?.current?.apertureRadius ?? 15.0;

    const uniforms = material.uniforms;
    (uniforms.uFocusCenter.value as THREE.Vector3).set(fx, fy, fz);
    uniforms.uApertureRadius.value = apertureRadius;
    (uniforms.uCameraPos.value as THREE.Vector3).set(
      camera.position.x,
      camera.position.y,
      camera.position.z,
    );
    uniforms.uHorizonRadius.value = 36.0;

    const lx = lastXRef.current;
    const ly = lastYRef.current;
    const lz = lastZRef.current;

    const dx = fx - lx;
    const dy = fy - ly;
    const dz = fz - lz;
    const distSq = dx * dx + dy * dy + dz * dz;

    if (Number.isNaN(distSq) || distSq > 4.0) {
      lastXRef.current = fx;
      lastYRef.current = fy;
      lastZRef.current = fz;

      const pos = scratchPosRef.current;
      pos[0] = fx;
      pos[1] = fy;
      pos[2] = fz;

      void resolvedManager.updateCameraPosition(pos);
    }

    const hx = lastHydratedXRef.current;
    const hy = lastHydratedYRef.current;
    const hz = lastHydratedZRef.current;
    const hr = lastHydratedRadiusRef.current;

    const hdx = fx - hx;
    const hdy = fy - hy;
    const hdz = fz - hz;
    const hDistSq = hdx * hdx + hdy * hdy + hdz * hdz;
    const rDiff = Math.abs(apertureRadius - hr);

    if (Number.isNaN(hDistSq) || hDistSq > 0.25 || Number.isNaN(rDiff) || rDiff > 0.25) {
      triggerHydration(fx, fy, fz, apertureRadius);
    }

    resolvedManager.processFrameUploads();
  });

  return <group ref={groupRef} name="galactic-sector-point-cloud" />;
}
