import React, { useCallback, useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useLazyRef } from '../../../hooks/useLazyRef';
import { SafeHtml } from '../SafeHtml';
import styles from './EntityLabel.module.css';
import type { CelestialInteractionState } from './types';
import { useOcclusionManager } from './SpatialEntityContext';
import { useSpatialFrameSafe } from '../instrument/spatialFrameContext';
import {
  type CelestialFootprint,
  type Box2D,
} from '../cartography/celestialOcclusionRegistry';
import {
  DEFAULT_RETICLE_SIZE,
  formatDesignationTag,
} from '../cartography/reticleGeometry';
import { resolveEntityScreenInvariantScale } from '../engineConfig';

export interface EntityLabelProps {
  id: string;
  name: string;
  position?: [number, number, number] | THREE.Vector3;
  worldPosition?: THREE.Vector3 | readonly [number, number, number];
  spectralType?: string;
  state?: CelestialInteractionState;
  reticleSize?: number;
  isOccluded?: boolean;
  offset?: [number, number];
  footprintRef?: React.RefObject<CelestialFootprint>;
}

/**
 * EntityLabel (Layer 3: Typographic Label):
 * Renders HTML label overlay via SafeHtml with system designation and optional spectral tag.
 * Positions label at top-right facet and spectral tag at bottom-right facet of reticle.
 * Maintains screen-invariant position and size matching Layer 2 Reticle.
 */
export const EntityLabel: React.FC<EntityLabelProps> = React.memo(({
  id,
  name,
  position,
  worldPosition,
  spectralType,
  state = 'passive',
  reticleSize = DEFAULT_RETICLE_SIZE,
  isOccluded = false,
  offset,
  footprintRef: _footprintRef,
}) => {
  const labelRef = useRef<HTMLDivElement>(null);
  const leaderLineRef = useRef<SVGLineElement>(null);
  const labelDimensionsRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });
  const scratchBoxRef = useLazyRef<Box2D>(() => ({ left: 0, top: 0, right: 0, bottom: 0 }));
  const lastOccludedRef = useRef<boolean | null>(null);
  const lastStateRef = useRef<CelestialInteractionState | null>(null);
  const lastXRef = useRef<number | null>(null);
  const lastYRef = useRef<number | null>(null);
  const scratchWorldPos = useLazyRef(() => new THREE.Vector3());
  const scratchAnchorWorldPos = useLazyRef(() => new THREE.Vector3());
  const scratchAnchorNdc = useLazyRef(() => new THREE.Vector3());
  const lastTransformRef = useRef({
    qx: Number.NaN, qy: Number.NaN, qz: Number.NaN, qw: Number.NaN,
    scale: Number.NaN, px: Number.NaN, py: Number.NaN, pz: Number.NaN,
  });
  const occlusionManager = useOcclusionManager();
  const frameCtx = useSpatialFrameSafe();

  const resolvedPos = useMemo(() => {
    if (!position) return [0, 0, 0] as [number, number, number];
    if (position instanceof THREE.Vector3) return [position.x, position.y, position.z] as [number, number, number];
    return position;
  }, [position]);

  const billboardRef = useLazyRef(() => {
    const g = new THREE.Group();
    g.position.set(...resolvedPos);
    return g;
  });

  const setBillboardRef = useCallback((node: THREE.Group | null) => {
    if (node && 'isGroup' in node) {
      billboardRef.current = node;
    }
  }, [billboardRef]);

  const isAnnotated = state === 'selected' || state === 'focused';

  const syncBillboardTransform = useCallback(
    (camera: THREE.Camera) => {
      const g = billboardRef.current;
      if (!g || !g.position) return;

      const [rx, ry, rz] = resolvedPos;
      if (worldPosition) {
        if (worldPosition instanceof THREE.Vector3) {
          scratchWorldPos.current.copy(worldPosition);
        } else {
          scratchWorldPos.current.set(worldPosition[0], worldPosition[1], worldPosition[2]);
        }
      } else {
        g.getWorldPosition(scratchWorldPos.current);
      }
      const camDist = Math.max(camera.position.distanceTo(scratchWorldPos.current), 1e-4);
      const invScale = resolveEntityScreenInvariantScale(
        camDist,
        camera,
        frameCtx?.frameRef?.current,
      );

      const cq = camera.quaternion;
      const last = lastTransformRef.current;
      const posChanged =
        Number.isNaN(last.px) || Math.abs(last.px - rx) > 1e-6 || Math.abs(last.py - ry) > 1e-6 || Math.abs(last.pz - rz) > 1e-6;
      const quatChanged =
        Number.isNaN(last.qw) ||
        Math.abs(last.qx - cq.x) > 1e-6 || Math.abs(last.qy - cq.y) > 1e-6 ||
        Math.abs(last.qz - cq.z) > 1e-6 || Math.abs(last.qw - cq.w) > 1e-6;
      const scaleChanged = Number.isNaN(last.scale) || Math.abs(last.scale - invScale) > 1e-6;

      if (posChanged || quatChanged || scaleChanged) {
        g.position.set(rx, ry, rz);
        g.quaternion.copy(cq);
        g.scale.set(invScale, invScale, invScale);
        if (typeof g.updateMatrixWorld === 'function') {
          g.updateMatrixWorld(true);
        }
        last.px = rx; last.py = ry; last.pz = rz;
        last.qx = cq.x; last.qy = cq.y; last.qz = cq.z; last.qw = cq.w;
        last.scale = invScale;
      }
    },
    [billboardRef, resolvedPos, worldPosition, scratchWorldPos, frameCtx],
  );

  const handleCalculatePosition = useCallback(
    (
      el: THREE.Object3D, camera: THREE.Camera, size: { width: number; height: number }, target?: [number, number],
    ): [number, number] | void => {
      syncBillboardTransform(camera);
      el.getWorldPosition(scratchAnchorWorldPos.current);
      scratchAnchorNdc.current.copy(scratchAnchorWorldPos.current).project(camera);
      const x = ((scratchAnchorNdc.current.x + 1) * size.width) / 2;
      const y = ((-scratchAnchorNdc.current.y + 1) * size.height) / 2;
      if (target) {
        target[0] = x;
        target[1] = y;
        return;
      }
      return [x, y];
    },
    [syncBillboardTransform, scratchAnchorWorldPos, scratchAnchorNdc],
  );

  useEffect(() => {
    labelDimensionsRef.current = { width: 0, height: 0 };
    const el = labelRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const hasBorder = entry.borderBoxSize?.length > 0;
        labelDimensionsRef.current = {
          width: hasBorder ? entry.borderBoxSize[0].inlineSize : entry.contentRect.width,
          height: hasBorder ? entry.borderBoxSize[0].blockSize : entry.contentRect.height,
        };
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [name, spectralType, isAnnotated]);

  useFrame(({ camera }) => {
    if (
      occlusionManager.isBatchEvaluating() &&
      !occlusionManager.didCameraOrFootprintsChange() &&
      lastOccludedRef.current !== null &&
      lastStateRef.current === state
    ) {
      return;
    }
    lastStateRef.current = state;

    syncBillboardTransform(camera);

    if (!labelRef.current) return;

    // Retrieve screen footprint from occlusion manager to construct accurate activeBox
    const fp = occlusionManager.getFootprint(id);
    let activeBox: Box2D | undefined;
    if (fp) {
      const prevFpState = fp.state;
      fp.state = state;
      fp.hasReticle = state !== 'passive';
      if (prevFpState !== state) {
        occlusionManager.register(fp);
      }
      if (fp.screenX !== undefined && fp.screenY !== undefined) {
        const estimatedW = name.length * 8 + 12;
        const w = labelDimensionsRef.current.width > 0 ? labelDimensionsRef.current.width : estimatedW;
        const h = labelDimensionsRef.current.height > 0 ? labelDimensionsRef.current.height : (isAnnotated && spectralType ? 38 : 18);
        const anchorX = fp.screenX + 1.15 * fp.reticleRadius;
        const anchorY = fp.screenY - 0.75 * fp.reticleRadius;
        const box = scratchBoxRef.current;
        box.left = anchorX;
        box.top = anchorY;
        box.right = anchorX + w;
        box.bottom = anchorY + h;
        fp.labelBox = box;
        activeBox = box;
      }
    }

    const evalState = occlusionManager.evaluateNodeOcclusion(id, activeBox);
    const isTargetImmune = state === 'selected' || state === 'focused';
    const isVisible = (isTargetImmune || evalState.labelEval.visible) && !isOccluded;

    if (lastOccludedRef.current !== !isVisible) {
      lastOccludedRef.current = !isVisible;
      labelRef.current.setAttribute('data-occluded', isVisible ? 'false' : 'true');
    }

    if (evalState.labelEval.isDisplaced) {
      const dx = evalState.labelEval.displacementX;
      const dy = evalState.labelEval.displacementY;
      if (lastXRef.current !== dx || lastYRef.current !== dy) {
        lastXRef.current = dx;
        lastYRef.current = dy;
        labelRef.current.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
        labelRef.current.setAttribute('data-displaced', 'true');
        if (leaderLineRef.current) {
          const lh = labelDimensionsRef.current.height ? labelDimensionsRef.current.height / 2 : 9;
          leaderLineRef.current.setAttribute('x1', String(-dx));
          leaderLineRef.current.setAttribute('y1', String(-dy));
          leaderLineRef.current.setAttribute('x2', '0');
          leaderLineRef.current.setAttribute('y2', String(lh));
          leaderLineRef.current.setAttribute('visibility', 'visible');
        }
      }
    } else if (lastXRef.current !== null) {
      lastXRef.current = null;
      lastYRef.current = null;
      labelRef.current.style.transform = '';
      labelRef.current.setAttribute('data-displaced', 'false');
      leaderLineRef.current?.setAttribute('visibility', 'hidden');
    }
  });

  const anchorX = reticleSize * 1.15;
  const anchorY = reticleSize * 0.75;
  const isSelectedOrFocused = state === 'selected' || state === 'focused';

  return (
    <group
      ref={setBillboardRef}
      name={`entity-label-${id} [${name}] [${formatDesignationTag(spectralType)}]`}
      userData={{ testId: `entity-label-${id}`, name, spectral: formatDesignationTag(spectralType) }}
      position={resolvedPos}
    >
      {/* Top-Right Facet: Typographic Label (System Designation) & Facet Badge */}
      <SafeHtml
        position={[anchorX + (offset ? offset[0] : 0), anchorY + (offset ? offset[1] : 0), 0]}
        calculatePosition={handleCalculatePosition}
        center={false}
        data-testid={`entity-label-${id}`}
      >
        <div
          ref={labelRef}
          className={styles.labelCluster}
          data-state={state}
          data-occluded={isSelectedOrFocused ? 'false' : lastOccludedRef.current === true ? 'true' : 'false'}
          data-testid={`entity-label-inner-${id}`}
        >
          <div className={styles.nodeLabel} data-state={state}>
            <svg className={styles.leaderLine} aria-hidden="true">
              <line ref={leaderLineRef} visibility="hidden" />
            </svg>
            <span className={styles.name}>{name}</span>
          </div>

          {/* Facet info: stacked cleanly below the designation without collision */}
          {isAnnotated && spectralType && (
            <div
              className={styles.spectralFacet}
              data-state={state}
              data-spectral={formatDesignationTag(spectralType)}
              data-testid="celestial-spectrum-facet"
            >
              <span>{formatDesignationTag(spectralType)}</span>
            </div>
          )}
        </div>
      </SafeHtml>
    </group>
  );
});

EntityLabel.displayName = 'EntityLabel';
