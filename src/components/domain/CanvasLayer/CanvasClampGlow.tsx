import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ALL_CANVAS_CLAMP_EDGES,
  useCameraStore,
  type CanvasClampEdge,
} from '../../../stores/useCameraStore';
import styles from './CanvasClampGlow.module.css';

type EdgePulseSeqMap = Record<CanvasClampEdge, number>;

const EMPTY_EDGE_PULSES: EdgePulseSeqMap = {
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};

export const CLAMP_GLOW_CLEANUP_MS = 450;

/**
 * Pure visual inner-edge glow overlay triggered when the camera bumps against
 * a zoom-out ceiling (all four edges) or a directional spatial pan clamp.
 */
export const CanvasClampGlow: React.FC = React.memo(() => {
  const clampBump = useCameraStore((s) => s.clampBump);
  const [edgeSeqs, setEdgeSeqs] = useState<EdgePulseSeqMap>(EMPTY_EDGE_PULSES);
  const timersRef = useRef<Partial<Record<CanvasClampEdge, ReturnType<typeof setTimeout>>>>({});

  const clearEdgePulse = useCallback((edge: CanvasClampEdge, finishedSeq: number) => {
    const existing = timersRef.current[edge];
    if (existing !== undefined) {
      clearTimeout(existing);
      delete timersRef.current[edge];
    }
    setEdgeSeqs((prev) => (prev[edge] === finishedSeq ? { ...prev, [edge]: 0 } : prev));
  }, []);

  useEffect(() => {
    if (!clampBump) return;
    setEdgeSeqs((prev) => {
      const next = { ...prev };
      for (const edge of clampBump.edges) {
        next[edge] = clampBump.seq;
      }
      return next;
    });

    for (const edge of clampBump.edges) {
      const existing = timersRef.current[edge];
      if (existing !== undefined) {
        clearTimeout(existing);
      }
      const seq = clampBump.seq;
      timersRef.current[edge] = setTimeout(() => {
        delete timersRef.current[edge];
        setEdgeSeqs((prev) => (prev[edge] === seq ? { ...prev, [edge]: 0 } : prev));
      }, CLAMP_GLOW_CLEANUP_MS);
    }
  }, [clampBump]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const edge of ALL_CANVAS_CLAMP_EDGES) {
        const timer = timers[edge];
        if (timer !== undefined) {
          clearTimeout(timer);
          delete timers[edge];
        }
      }
    };
  }, []);

  return (
    <div
      className={styles.overlay}
      aria-hidden="true"
      data-testid="canvas-clamp-glow"
    >
      {ALL_CANVAS_CLAMP_EDGES.map((edge) => {
        const seq = edgeSeqs[edge];
        if (seq === 0) return null;
        return (
          <div
            key={`${edge}-${seq}`}
            className={styles.edgePulse}
            data-edge={edge}
            data-pulse-seq={seq}
            data-testid={`canvas-clamp-glow-${edge}`}
            onAnimationEnd={() => clearEdgePulse(edge, seq)}
          />
        );
      })}
    </div>
  );
});

CanvasClampGlow.displayName = 'CanvasClampGlow';
