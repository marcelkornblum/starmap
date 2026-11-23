import React, { useCallback, useMemo, useRef, useEffect, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useLazyRef } from '../../../hooks/useLazyRef';
import { SafeHtml } from '../SafeHtml';
import styles from './EntityLabel.module.css';
import type { CelestialInteractionState } from './types';
import { useOcclusionManager } from './SpatialEntityContext';
import { useSpatialFrameSafe } from '../instrument/spatialFrameContext';
import type { CelestialFootprint, Box2D } from '../cartography/occlusionTypes';
import { DEFAULT_RETICLE_SIZE, formatDesignationTag } from '../cartography/reticleGeometry';
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

const DEFAULT_POSITION: [number, number, number] = [0, 0, 0];
const LABEL_ANCHOR_X_MULTIPLIER = 1.15;
const LABEL_ANCHOR_Y_MULTIPLIER = 0.75;
const ESTIMATED_CHAR_WIDTH_PX = 8;
const ESTIMATED_LABEL_PADDING_PX = 12;
const ANNOTATED_LABEL_HEIGHT_PX = 38;
const DEFAULT_LABEL_HEIGHT_PX = 18;
const DEFAULT_LEADER_HALF_HEIGHT_PX = 9;
const MIN_CAMERA_DISTANCE = 1e-4;
const TRANSFORM_EPSILON = 1e-6;

const hasTransformDelta = (prev: number, next: number): boolean =>
  Number.isNaN(prev) || Math.abs(prev - next) > TRANSFORM_EPSILON;

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

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
  const lastIsOccludedPropRef = useRef<boolean | null>(null);
  const propsDirtyRef = useRef(true);
  const lastDisplacedRef = useRef<boolean>(false);
  const lastXRef = useRef<number | null>(null);
  const lastYRef = useRef<number | null>(null);
  const scratchWorldPos = useLazyRef(() => new THREE.Vector3());
  const scratchAnchorWorldPos = useLazyRef(() => new THREE.Vector3());
  const scratchAnchorNdc = useLazyRef(() => new THREE.Vector3());
  const lastTransformRef = useRef({
    qx: Number.NaN, qy: Number.NaN, qz: Number.NaN, qw: Number.NaN, scale: Number.NaN, px: Number.NaN, py: Number.NaN, pz: Number.NaN,
  });
  const occlusionManager = useOcclusionManager();
  const frameCtx = useSpatialFrameSafe();

  const resolvedPos = useMemo<[number, number, number]>(() => {
    if (!position) return DEFAULT_POSITION;
    if (position instanceof THREE.Vector3) return [position.x, position.y, position.z];
    return position;
  }, [position]);

  const billboardRef = useLazyRef(() => {
    const g = new THREE.Group();
    g.position.set(...resolvedPos);
    return g;
  });

  const setBillboardRef = useCallback((node: THREE.Group | null) => {
    if (node && 'isGroup' in node) {
      if (billboardRef.current !== node) lastTransformRef.current.qw = Number.NaN;
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
      const camDist = Math.max(camera.position.distanceTo(scratchWorldPos.current), MIN_CAMERA_DISTANCE);
      const invScale = resolveEntityScreenInvariantScale(camDist, camera, frameCtx?.frameRef?.current);

      const cq = camera.quaternion;
      const last = lastTransformRef.current;
      const posChanged = hasTransformDelta(last.px, rx) || hasTransformDelta(last.py, ry) || hasTransformDelta(last.pz, rz);
      const quatChanged =
        hasTransformDelta(last.qx, cq.x) || hasTransformDelta(last.qy, cq.y) || hasTransformDelta(last.qz, cq.z) || hasTransformDelta(last.qw, cq.w);
      const scaleChanged = hasTransformDelta(last.scale, invScale);

      if (posChanged || quatChanged || scaleChanged) {
        g.position.set(rx, ry, rz);
        g.quaternion.copy(cq);
        g.scale.set(invScale, invScale, invScale);
        if (typeof g.updateMatrixWorld === 'function') g.updateMatrixWorld(true);
        last.px = rx; last.py = ry; last.pz = rz;
        last.qx = cq.x; last.qy = cq.y; last.qz = cq.z; last.qw = cq.w;
        last.scale = invScale;
      }
    },
    [billboardRef, resolvedPos, worldPosition, scratchWorldPos, frameCtx],
  );

  const handleCalculatePosition = useCallback(
    (el: THREE.Object3D, camera: THREE.Camera, size: { width: number; height: number }, target?: [number, number]): [number, number] | void => {
      syncBillboardTransform(camera);
      el.getWorldPosition(scratchAnchorWorldPos.current);
      scratchAnchorNdc.current.copy(scratchAnchorWorldPos.current).project(camera);
      const x = ((scratchAnchorNdc.current.x + 1) * size.width) / 2;
      const y = ((-scratchAnchorNdc.current.y + 1) * size.height) / 2;
      if (!target) return [x, y];
      target[0] = x;
      target[1] = y;
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

  useIsomorphicLayoutEffect(() => {
    propsDirtyRef.current = true;
    if ((state === 'selected' || state === 'focused') && !isOccluded) {
      lastOccludedRef.current = false;
      labelRef.current?.setAttribute('data-occluded', 'false');
    }
  }, [id, name, spectralType, state, resolvedPos, worldPosition, offset, isOccluded]);

  useFrame(({ camera }) => {
    const canSkipIdleFrame =
      !propsDirtyRef.current &&
      occlusionManager.isBatchEvaluating() &&
      !occlusionManager.didCameraOrFootprintsChange() &&
      lastOccludedRef.current !== null &&
      lastStateRef.current === state &&
      lastIsOccludedPropRef.current === isOccluded;
    if (canSkipIdleFrame) return;
    propsDirtyRef.current = false;
    lastStateRef.current = state;
    lastIsOccludedPropRef.current = isOccluded;

    syncBillboardTransform(camera);
    if (!labelRef.current) return;

    const fp = occlusionManager.getFootprint(id);
    let activeBox: Box2D | undefined;
    if (fp) {
      const prevFpState = fp.state;
      fp.state = state;
      fp.hasReticle = state !== 'passive';
      if (prevFpState !== state) occlusionManager.register(fp);
      if (fp.screenX !== undefined && fp.screenY !== undefined) {
        const estimatedW = name.length * ESTIMATED_CHAR_WIDTH_PX + ESTIMATED_LABEL_PADDING_PX;
        const w = labelDimensionsRef.current.width > 0 ? labelDimensionsRef.current.width : estimatedW;
        const fallbackH = isAnnotated && spectralType ? ANNOTATED_LABEL_HEIGHT_PX : DEFAULT_LABEL_HEIGHT_PX;
        const h = labelDimensionsRef.current.height > 0 ? labelDimensionsRef.current.height : fallbackH;
        const anchorX = fp.screenX + LABEL_ANCHOR_X_MULTIPLIER * fp.reticleRadius;
        const anchorY = fp.screenY - LABEL_ANCHOR_Y_MULTIPLIER * fp.reticleRadius;
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
      const dx = Math.round(evalState.labelEval.displacementX);
      const dy = Math.round(evalState.labelEval.displacementY);
      if (!lastDisplacedRef.current) {
        lastDisplacedRef.current = true;
        labelRef.current.setAttribute('data-displaced', 'true');
        leaderLineRef.current?.setAttribute('x2', '0');
        leaderLineRef.current?.setAttribute('visibility', 'visible');
      }
      if (lastXRef.current !== dx || lastYRef.current !== dy) {
        lastXRef.current = dx;
        lastYRef.current = dy;
        labelRef.current.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
        if (leaderLineRef.current) {
          const lh = labelDimensionsRef.current.height ? Math.round(labelDimensionsRef.current.height / 2) : DEFAULT_LEADER_HALF_HEIGHT_PX;
          leaderLineRef.current.setAttribute('x1', String(-dx));
          leaderLineRef.current.setAttribute('y1', String(-dy));
          leaderLineRef.current.setAttribute('y2', String(lh));
        }
      }
    } else if (lastDisplacedRef.current) {
      lastDisplacedRef.current = false;
      lastXRef.current = null;
      lastYRef.current = null;
      labelRef.current.style.transform = '';
      labelRef.current.setAttribute('data-displaced', 'false');
      leaderLineRef.current?.setAttribute('visibility', 'hidden');
    }
  });

  const anchorX = reticleSize * LABEL_ANCHOR_X_MULTIPLIER;
  const anchorY = reticleSize * LABEL_ANCHOR_Y_MULTIPLIER;
  const isSelectedOrFocused = state === 'selected' || state === 'focused';
  const safeHtmlPos: [number, number, number] = [anchorX + (offset?.[0] ?? 0), anchorY + (offset?.[1] ?? 0), 0];
  const designationTag = formatDesignationTag(spectralType);

  return (
    <group ref={setBillboardRef} name={`entity-label-${id} [${name}] [${designationTag}]`} userData={{ testId: `entity-label-${id}`, name, spectral: designationTag }} position={resolvedPos}>
      <SafeHtml position={safeHtmlPos} calculatePosition={handleCalculatePosition} center={false} data-testid={`entity-label-${id}`}>
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
          {isAnnotated && spectralType && (
            <div className={styles.spectralFacet} data-state={state} data-spectral={designationTag} data-testid="celestial-spectrum-facet">
              <span>{designationTag}</span>
            </div>
          )}
        </div>
      </SafeHtml>
    </group>
  );
});

EntityLabel.displayName = 'EntityLabel';
