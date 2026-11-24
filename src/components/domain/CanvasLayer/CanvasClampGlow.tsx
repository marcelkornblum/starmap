import React, { useEffect, useRef } from 'react';
import {
  ALL_CANVAS_CLAMP_EDGES,
  useCameraStore,
  type CanvasClampEdge,
} from '../../../stores/useCameraStore';
import { prefersReducedMotion } from '../../../utils/reducedMotion';
import styles from './CanvasClampGlow.module.css';

interface EdgeRubberBandState {
  pressure: number;
  displayed: number;
  lastInputAt: number;
}

const RUBBER_BAND_STIFFNESS = 3.2;
const RELEASE_HOLD_MS = 45;
const ATTACK_RATE_PER_SEC = 16;
const RELEASE_RATE_PER_SEC = 14;
const IDLE_EPSILON = 0.008;
const MIN_RUBBER_BAND_SCALE = 0.28;
const MAX_FRAME_DT_SEC = 0.05;

/**
 * Maps accumulated overscroll pressure into an iOS-style asymptotic rubber-band
 * stretch in `[0, 1)` so continuous dragging slowly grows with increasing resistance.
 */
function computeRubberBandStretch(pressure: number): number {
  if (!(pressure > 0)) return 0;
  return pressure / (pressure + RUBBER_BAND_STIFFNESS);
}

function createInitialEdgeStates(): Record<CanvasClampEdge, EdgeRubberBandState> {
  return {
    top: { pressure: 0, displayed: 0, lastInputAt: -Infinity },
    right: { pressure: 0, displayed: 0, lastInputAt: -Infinity },
    bottom: { pressure: 0, displayed: 0, lastInputAt: -Infinity },
    left: { pressure: 0, displayed: 0, lastInputAt: -Infinity },
  };
}

/**
 * Pure visual inner-edge rubber-band glow overlay driven directly via DOM refs.
 * Swells asymptotically as the user keeps pushing against a zoom-out ceiling
 * (all four edges) or directional pan clamp, then smoothly relaxes on release.
 */
export const CanvasClampGlow: React.FC = React.memo(() => {
  const edgeElsRef = useRef<Record<CanvasClampEdge, HTMLDivElement | null>>({
    top: null,
    right: null,
    bottom: null,
    left: null,
  });

  useEffect(() => {
    const states = createInitialEdgeStates();
    let rafId: number | null = null;
    let lastFrameAt = 0;

    const applyEdgeVisual = (edge: CanvasClampEdge, intensity: number, reducedMotion: boolean) => {
      const el = edgeElsRef.current[edge];
      if (!el) return;
      if (intensity <= IDLE_EPSILON) {
        el.style.opacity = '0';
        el.style.transform = '';
        el.setAttribute('data-active', 'false');
        return;
      }
      const clamped = Math.min(1, Math.max(0, intensity));
      el.style.opacity = clamped.toFixed(3);
      if (reducedMotion) {
        el.style.transform = '';
      } else {
        const scale = MIN_RUBBER_BAND_SCALE + (1 - MIN_RUBBER_BAND_SCALE) * clamped;
        const axis = edge === 'top' || edge === 'bottom' ? 'scaleY' : 'scaleX';
        el.style.transform = `${axis}(${scale.toFixed(3)})`;
      }
      el.setAttribute('data-active', 'true');
    };

    const tick = (now: number) => {
      const dt = lastFrameAt > 0
        ? Math.min(MAX_FRAME_DT_SEC, Math.max(0.001, (now - lastFrameAt) / 1000))
        : 1 / 60;
      lastFrameAt = now;

      const reducedMotion = prefersReducedMotion();
      let anyActive = false;

      for (const edge of ALL_CANVAS_CLAMP_EDGES) {
        const st = states[edge];
        if (st.pressure === 0 && st.displayed === 0) continue;

        const isReleased = now - st.lastInputAt > RELEASE_HOLD_MS;
        if (isReleased) {
          st.pressure = 0;
        }

        const target = computeRubberBandStretch(st.pressure);
        const rate = isReleased ? RELEASE_RATE_PER_SEC : ATTACK_RATE_PER_SEC;
        st.displayed += (target - st.displayed) * (1 - Math.exp(-dt * rate));

        if (st.pressure === 0 && st.displayed <= IDLE_EPSILON) {
          st.displayed = 0;
          applyEdgeVisual(edge, 0, reducedMotion);
        } else {
          anyActive = true;
          applyEdgeVisual(edge, st.displayed, reducedMotion);
        }
      }

      if (anyActive && typeof requestAnimationFrame !== 'undefined') {
        rafId = requestAnimationFrame(tick);
      } else {
        rafId = null;
        lastFrameAt = 0;
      }
    };

    const ensureLoopRunning = () => {
      if (rafId === null && typeof requestAnimationFrame !== 'undefined') {
        lastFrameAt = 0;
        rafId = requestAnimationFrame(tick);
      }
    };

    let lastHandledSeq = useCameraStore.getState().clampBump?.seq ?? 0;

    const handleClampBump = (
      bump: ReturnType<typeof useCameraStore.getState>['clampBump'],
    ) => {
      if (!bump || bump.seq === lastHandledSeq) return;
      lastHandledSeq = bump.seq;
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const reducedMotion = prefersReducedMotion();

      for (const edge of bump.edges) {
        const st = states[edge];
        st.pressure += bump.impulse;
        st.lastInputAt = now;
        // Immediately reflect initial contact so tests and first-frame feel respond without 1-frame lag
        const immediateTarget = computeRubberBandStretch(st.pressure);
        if (st.displayed === 0) {
          st.displayed = immediateTarget * 0.5;
          applyEdgeVisual(edge, st.displayed, reducedMotion);
        }
      }
      ensureLoopRunning();
    };

    const unsubscribe = useCameraStore.subscribe((state) => {
      handleClampBump(state.clampBump);
    });

    return () => {
      unsubscribe();
      if (rafId !== null && typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    };
  }, []);

  return (
    <div
      className={styles.overlay}
      aria-hidden="true"
      data-testid="canvas-clamp-glow"
    >
      {ALL_CANVAS_CLAMP_EDGES.map((edge) => (
        <div
          key={edge}
          ref={(el) => { edgeElsRef.current[edge] = el; }}
          className={styles.edgeGlow}
          data-edge={edge}
          data-active="false"
          data-testid={`canvas-clamp-glow-${edge}`}
        />
      ))}
    </div>
  );
});

CanvasClampGlow.displayName = 'CanvasClampGlow';
