import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useLazyRef } from '../../../../hooks/useLazyRef';
import { SafeHtml } from '../SafeHtml';
import styles from './EntityLabel.module.css';
import type { CelestialInteractionState } from './types';
import { useOcclusionManager } from './SpatialEntityContext';
import { useSpatialFrameSafe } from '../../../canvas/instrument/SpatialFrameProvider';
import {
  type CelestialFootprint,
  type Box2D,
} from '../../../canvas/cartography/celestialOcclusionRegistry';
import {
  DEFAULT_RETICLE_SIZE,
  formatDesignationTag,
} from '../../../canvas/cartography/reticleGeometry';
import { calculateScreenInvariantScale } from '../engineConfig';

export interface EntityLabelProps {
  id: string;
  name: string;
  position?: [number, number, number] | THREE.Vector3;
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
export const EntityLabel: React.FC<EntityLabelProps> = ({
  id,
  name,
  position,
  spectralType,
  state = 'passive',
  reticleSize = DEFAULT_RETICLE_SIZE,
  isOccluded = false,
  offset,
  footprintRef: _footprintRef,
}) => {
  const billboardRef = useRef<THREE.Group>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const leaderLineRef = useRef<SVGLineElement>(null);
  const labelDimensionsRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });
  const scratchBoxRef = useLazyRef<Box2D>(() => ({ left: 0, top: 0, right: 0, bottom: 0 }));
  const lastOccludedRef = useRef<boolean | null>(null);
  const lastXRef = useRef<number | null>(null);
  const lastYRef = useRef<number | null>(null);
  const scratchWorldPos = useLazyRef(() => new THREE.Vector3());
  const occlusionManager = useOcclusionManager();
  const frameCtx = useSpatialFrameSafe();

  const resolvedPos = useMemo(() => {
    if (!position) return [0, 0, 0] as [number, number, number];
    if (position instanceof THREE.Vector3) return [position.x, position.y, position.z] as [number, number, number];
    return position;
  }, [position]);

  const isAnnotated = state === 'selected' || state === 'focused';

  useEffect(() => {
    const el = labelRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.borderBoxSize?.length > 0) {
          labelDimensionsRef.current = {
            width: entry.borderBoxSize[0].inlineSize,
            height: entry.borderBoxSize[0].blockSize,
          };
        } else {
          labelDimensionsRef.current = {
            width: entry.contentRect.width,
            height: entry.contentRect.height,
          };
        }
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [name, spectralType, isAnnotated]);

  useFrame(({ camera }) => {
    if (billboardRef.current) {
      billboardRef.current.quaternion.copy(camera.quaternion);

      billboardRef.current.getWorldPosition(scratchWorldPos.current);
      const camDist = Math.max(camera.position.distanceTo(scratchWorldPos.current), 1e-4);
      const invScale = frameCtx?.frameRef?.current
        ? (camDist / frameCtx.frameRef.current.referenceFootprint) * frameCtx.frameRef.current.fovFactor
        : calculateScreenInvariantScale(camDist, camera);
      billboardRef.current.scale.set(invScale, invScale, invScale);
    }

    if (!labelRef.current) return;

    // Retrieve screen footprint from occlusion manager to construct accurate activeBox
    const fp = occlusionManager.getFootprint(id);
    let activeBox: Box2D | undefined;
    if (fp && fp.screenX !== undefined && fp.screenY !== undefined) {
      const estimatedW = name.length * 8 + 12;
      const w = labelDimensionsRef.current.width > 0 ? labelDimensionsRef.current.width : estimatedW;
      const h = labelDimensionsRef.current.height > 0 ? labelDimensionsRef.current.height : (isAnnotated && spectralType ? 38 : 18);
      const anchorX = fp.screenX + 1.15 * fp.reticleRadius;
      const anchorY = fp.screenY - 0.75 * fp.reticleRadius;
      const box = scratchBoxRef.current;
      box.left = anchorX;
      box.top = anchorY - h / 2;
      box.right = anchorX + w;
      box.bottom = anchorY + h / 2;
      fp.labelBox = box;
      activeBox = box;
    }

    const evalState = occlusionManager.evaluateNodeOcclusion(id, activeBox);
    const isVisible = evalState.labelEval.visible && !isOccluded;

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
          leaderLineRef.current.setAttribute('x1', String(-dx));
          leaderLineRef.current.setAttribute('y1', String(-dy));
          leaderLineRef.current.setAttribute('x2', '0');
          leaderLineRef.current.setAttribute('y2', String(labelDimensionsRef.current.height ? labelDimensionsRef.current.height / 2 : 9));
          leaderLineRef.current.setAttribute('visibility', 'visible');
        }
      }
    } else if (lastXRef.current !== null) {
      lastXRef.current = null;
      lastYRef.current = null;
      labelRef.current.style.transform = '';
      labelRef.current.setAttribute('data-displaced', 'false');
      if (leaderLineRef.current) {
        leaderLineRef.current.setAttribute('visibility', 'hidden');
      }
    }
  });

  const anchorX = reticleSize * 1.15;
  const anchorY = reticleSize * 0.75;

  return (
    <group
      name={`entity-label-${id}`}
      data-testid={`entity-label-${id}`}
      data-name={name}
      data-spectral={formatDesignationTag(spectralType)}
      position={resolvedPos}
    >
      <group ref={billboardRef}>
        {/* Top-Right Facet: Typographic Label (System Designation) & Facet Badge */}
        <SafeHtml position={[anchorX, anchorY, 0]} data-testid={`entity-label-${id}`}>
          <div
            ref={labelRef}
            className={styles.labelCluster}
            data-state={state}
            data-occluded="false"
            data-testid={`entity-label-inner-${id}`}
            style={offset ? { transform: `translate3d(${offset[0]}px, ${offset[1]}px, 0)` } : undefined}
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
    </group>
  );
};
