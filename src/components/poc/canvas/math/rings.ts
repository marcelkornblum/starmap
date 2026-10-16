import * as THREE from 'three';

export interface ScaledRingInfo {
  radius: number;
  isMajor: boolean;
  fade: number;
}

const SCRATCH_CANDIDATES: ScaledRingInfo[] = Array.from({ length: 16 }, () => ({
  radius: 0,
  isMajor: false,
  fade: 0,
}));

/**
 * Populates pre-allocated target pool with logarithmic 1-2-5 progression concentric range rings with zero allocations.
 * Returns the count of active rings.
 */
export function populateZoomAdaptiveRings(
  rAperture: number,
  target: ScaledRingInfo[],
  maxRings = 6,
): number {
  if (rAperture <= 0) return 0;
  const p = Math.floor(Math.log10(rAperture));
  const candidateDecades = [p - 1, p, p + 1];
  const steps = [1, 2, 5];

  let candidateCount = 0;

  for (let d = 0; d < 3; d++) {
    const unit = Math.pow(10, candidateDecades[d]);
    for (let s = 0; s < 3; s++) {
      const r = steps[s] * unit;
      const rho = r / rAperture;

      // Only candidate rings within visible fractional range [0.05, 0.98]
      if (rho >= 0.05 && rho <= 0.98) {
        // Significant line = exact power of 10 (step === 1)
        const isMajor = steps[s] === 1;

        // Smooth fade at outer perimeter (rho in [0.82, 0.98], fully dissolved before boundary 1.0)
        const fadeOuter = Math.min(1, Math.max(0, (0.98 - rho) / 0.16));
        // Smooth fade near focal center (rho in [0.05, 0.15])
        const fadeInner = Math.min(1, Math.max(0, (rho - 0.05) / 0.10));
        const fade = fadeOuter * fadeInner;

        if (fade > 0.001) {
          const slot = SCRATCH_CANDIDATES[candidateCount++];
          slot.radius = r;
          slot.isMajor = isMajor;
          slot.fade = fade;
        }
      }
    }
  }

  // Candidates are naturally generated in strictly ascending order by construction.

  const count = Math.min(candidateCount, maxRings);
  for (let i = 0; i < count; i++) {
    const src = SCRATCH_CANDIDATES[i];
    const dst = target[i];
    dst.radius = src.radius;
    dst.isMajor = src.isMajor;
    dst.fade = src.fade;
  }

  return count;
}

/**
 * Computes logarithmic 1-2-5 progression concentric range rings dynamically adapted to active aperture radius (rAperture).
 */
export function computeZoomAdaptiveRings(rAperture: number, maxRings = 6): ScaledRingInfo[] {
  if (rAperture <= 0) return [];
  const tempPool: ScaledRingInfo[] = Array.from({ length: maxRings }, () => ({
    radius: 0,
    isMajor: false,
    fade: 0,
  }));
  const count = populateZoomAdaptiveRings(rAperture, tempPool, maxRings);
  const result: ScaledRingInfo[] = [];
  for (let i = 0; i < count; i++) {
    result.push({
      radius: tempPool[i].radius,
      isMajor: tempPool[i].isMajor,
      fade: tempPool[i].fade,
    });
  }
  return result;
}

/**
 * Creates BufferGeometry for a full 360-degree circle in the XY plane.
 */
export function createCircleGeometry(radius = 1.0, steps = 128): THREE.BufferGeometry {
  const buffer = new Float32Array(steps * 3);
  for (let i = 0; i < steps; i++) {
    const theta = (i / steps) * Math.PI * 2;
    buffer[i * 3] = radius * Math.cos(theta);
    buffer[i * 3 + 1] = radius * Math.sin(theta);
    buffer[i * 3 + 2] = 0;
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(buffer, 3));
  geom.computeBoundingSphere();
  return geom;
}
