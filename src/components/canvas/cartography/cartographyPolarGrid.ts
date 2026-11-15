import * as THREE from 'three';

/**
 * Creates BufferGeometry for a nearly-squared off galactic coordinate grid on datum plane (Z=0).
 */
export function createGalacticPlanarGridGeometry(
  extent = 1200,
  gridGap = 100,
  centerDistance = 2000,
  arcSegments = 64,
  omitCoreAxis = true,
): THREE.BufferGeometry {
  const points: THREE.Vector3[] = [];
  const safeExtent = Math.max(1, extent);
  const safeGap = Math.max(0.1, gridGap);
  const safeRgc = Math.max(safeExtent * 1.5, centerDistance);
  const safeSegments = Math.max(4, arcSegments);

  const rMax = Math.hypot(safeRgc + safeExtent, safeExtent);
  const minX0 = safeRgc - rMax;
  const maxX0 = safeExtent;
  const iMin = Math.floor(minX0 / safeGap);
  const iMax = Math.floor(maxX0 / safeGap);

  for (let i = iMin; i <= iMax; i++) {
    const x0 = i * safeGap;
    const R = safeRgc - x0;
    if (R <= 0) continue;

    const cosEnterLeft = (safeRgc + safeExtent) / R;
    const thetaStart = cosEnterLeft >= 1 ? 0 : Math.acos(Math.max(-1, cosEnterLeft));

    const thetaMaxY = Math.asin(Math.min(1, safeExtent / R));
    const cosExitRight = (safeRgc - safeExtent) / R;
    const thetaMaxX = cosExitRight <= -1 ? Math.PI : Math.acos(Math.max(-1, Math.min(1, cosExitRight)));
    const thetaEnd = Math.min(thetaMaxY, thetaMaxX);

    if (thetaEnd <= thetaStart) continue;

    if (thetaStart === 0) {
      const arcLen = 2 * thetaEnd * R;
      const nSegs = Math.max(16, Math.ceil(Math.max(safeSegments * (thetaEnd / (Math.PI * 0.5)), arcLen / 12)));
      for (let s = 0; s < nSegs; s++) {
        const t1 = -thetaEnd + (s / nSegs) * (2 * thetaEnd);
        const t2 = -thetaEnd + ((s + 1) / nSegs) * (2 * thetaEnd);
        points.push(
          new THREE.Vector3(safeRgc - R * Math.cos(t1), R * Math.sin(t1), 0),
          new THREE.Vector3(safeRgc - R * Math.cos(t2), R * Math.sin(t2), 0),
        );
      }
    } else {
      const arcLen = (thetaEnd - thetaStart) * R;
      const nSegs = Math.max(8, Math.ceil(Math.max(safeSegments * ((thetaEnd - thetaStart) / (Math.PI * 0.5)), arcLen / 12)));
      for (let s = 0; s < nSegs; s++) {
        const t1 = thetaStart + (s / nSegs) * (thetaEnd - thetaStart);
        const t2 = thetaStart + ((s + 1) / nSegs) * (thetaEnd - thetaStart);
        points.push(
          new THREE.Vector3(safeRgc - R * Math.cos(t1), R * Math.sin(t1), 0),
          new THREE.Vector3(safeRgc - R * Math.cos(t2), R * Math.sin(t2), 0),
          new THREE.Vector3(safeRgc - R * Math.cos(-t1), R * Math.sin(-t1), 0),
          new THREE.Vector3(safeRgc - R * Math.cos(-t2), R * Math.sin(-t2), 0),
        );
      }
    }
  }

  const y0Max = safeExtent / (1 - safeExtent / safeRgc);
  const nRays = Math.ceil(y0Max / safeGap);

  for (let j = -nRays; j <= nRays; j++) {
    if (j === 0 && omitCoreAxis) continue;
    const y0 = j * safeGap;
    const x1 = j === 0 ? -safeExtent : Math.max(-safeExtent, safeRgc * (1 - safeExtent / Math.abs(y0)));
    const x2 = safeExtent;
    if (x1 >= x2) continue;

    const segLen = x2 - x1;
    const nSubSegs = Math.max(1, Math.ceil(segLen / safeGap));
    for (let s = 0; s < nSubSegs; s++) {
      const sx1 = x1 + (s / nSubSegs) * segLen;
      const sx2 = x1 + ((s + 1) / nSubSegs) * segLen;
      points.push(
        new THREE.Vector3(sx1, y0 * (1 - sx1 / safeRgc), 0),
        new THREE.Vector3(sx2, y0 * (1 - sx2 / safeRgc), 0),
      );
    }
  }

  const geom = new THREE.BufferGeometry().setFromPoints(points);
  geom.computeBoundingSphere();
  return geom;
}

/**
 * Creates BufferGeometry for a circular coordinate grid on datum plane (Z=0).
 */
export function createCircularPlanarGridGeometry(
  radius = 10,
  gridGap = 2.5,
  centerDistance = 2000,
  arcSegments = 64,
  omitCoreAxis = true,
): THREE.BufferGeometry {
  const coords: number[] = [];
  const safeRadius = Math.max(0.5, radius);
  const safeGap = Math.max(0.05, gridGap);
  const safeRgc = Math.max(safeRadius * 2, centerDistance);
  const R2 = safeRadius * safeRadius;

  const iMin = Math.ceil(-safeRadius / safeGap);
  const iMax = Math.floor(safeRadius / safeGap);

  for (let i = iMin; i <= iMax; i++) {
    const x0 = i * safeGap;
    const Rarc = safeRgc - x0;
    if (Rarc <= 0) continue;

    const xInt = x0 + (R2 - x0 * x0) / (2 * safeRgc);
    if (xInt > safeRadius || xInt < -safeRadius) continue;

    const yInt = Math.sqrt(Math.max(0, R2 - xInt * xInt));
    if (yInt < 1e-5) continue;

    const sinThetaInt = Math.min(1, Math.max(0, yInt / Rarc));
    const thetaInt = Math.asin(sinThetaInt);
    if (thetaInt < 1e-5) continue;

    const arcLen = 2 * thetaInt * Rarc;
    const nSegs = Math.max(8, Math.ceil(Math.max(arcSegments * (thetaInt / (Math.PI * 0.5)), arcLen / (safeGap * 0.5))));
    for (let s = 0; s < nSegs; s++) {
      const t1 = -thetaInt + (s / nSegs) * (2 * thetaInt);
      const t2 = -thetaInt + ((s + 1) / nSegs) * (2 * thetaInt);
      coords.push(
        safeRgc - Rarc * Math.cos(t1), Rarc * Math.sin(t1), 0,
        safeRgc - Rarc * Math.cos(t2), Rarc * Math.sin(t2), 0,
      );
    }
  }

  const y0Max = safeRadius / Math.sqrt(Math.max(1e-6, 1 - R2 / (safeRgc * safeRgc)));
  const jMax = Math.floor(y0Max / safeGap);

  for (let j = -jMax; j <= jMax; j++) {
    if (j === 0 && omitCoreAxis) continue;
    const y0 = j * safeGap;
    const m = y0 / safeRgc;
    const A = 1 + m * m;
    const B = -2 * m * y0;
    const disc = 4 * (A * R2 - y0 * y0);
    if (disc < 0) continue;

    const sqrtDisc = Math.sqrt(disc);
    const x1 = (-B - sqrtDisc) / (2 * A);
    const x2 = (-B + sqrtDisc) / (2 * A);
    const y1 = y0 - m * x1;
    const y2 = y0 - m * x2;

    const segLen = Math.hypot(x2 - x1, y2 - y1);
    const nSubSegs = Math.max(1, Math.ceil(segLen / safeGap));
    for (let s = 0; s < nSubSegs; s++) {
      const sx1 = x1 + (s / nSubSegs) * (x2 - x1);
      const sy1 = y1 + (s / nSubSegs) * (y2 - y1);
      const sx2 = x1 + ((s + 1) / nSubSegs) * (x2 - x1);
      const sy2 = y1 + ((s + 1) / nSubSegs) * (y2 - y1);
      coords.push(sx1, sy1, 0, sx2, sy2, 0);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(coords, 3));
  geom.computeBoundingSphere();
  return geom;
}
