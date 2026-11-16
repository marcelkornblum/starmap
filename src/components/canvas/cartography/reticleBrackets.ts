import * as THREE from 'three';
import type { CelestialClassification } from '../../../types/spatial';

function appendCircleSegments(points: THREE.Vector3[], r: number, segs: number): void {
  for (let i = 0; i < segs; i++) {
    const th1 = (i / segs) * Math.PI * 2;
    const th2 = ((i + 1) / segs) * Math.PI * 2;
    points.push(
      new THREE.Vector3(Math.cos(th1) * r, Math.sin(th1) * r, 0),
      new THREE.Vector3(Math.cos(th2) * r, Math.sin(th2) * r, 0),
    );
  }
}

/**
 * Appends line segments for the 2D taxonomy bracket or footprint shape in the local XY plane.
 */
export function appendReticleBracketPoints(
  points: THREE.Vector3[],
  classification: CelestialClassification,
  s: number,
): void {
  switch (classification) {
    case 'star':
    case 'stellar-system': {
      points.push(
        new THREE.Vector3(0, s, 0), new THREE.Vector3(s, 0, 0),
        new THREE.Vector3(s, 0, 0), new THREE.Vector3(0, -s, 0),
        new THREE.Vector3(0, -s, 0), new THREE.Vector3(-s, 0, 0),
        new THREE.Vector3(-s, 0, 0), new THREE.Vector3(0, s, 0),
      );
      break;
    }
    case 'brown-dwarf': {
      points.push(
        new THREE.Vector3(-0.6 * s, 0.4 * s, 0), new THREE.Vector3(0, s, 0),
        new THREE.Vector3(0, s, 0), new THREE.Vector3(0.6 * s, 0.4 * s, 0),
        new THREE.Vector3(-0.6 * s, -0.4 * s, 0), new THREE.Vector3(0, -s, 0),
        new THREE.Vector3(0, -s, 0), new THREE.Vector3(0.6 * s, -0.4 * s, 0),
      );
      break;
    }
    case 'white-dwarf': {
      const leg = 0.35 * s;
      points.push(
        new THREE.Vector3(-leg, s - leg, 0), new THREE.Vector3(0, s, 0),
        new THREE.Vector3(0, s, 0), new THREE.Vector3(leg, s - leg, 0),
        new THREE.Vector3(s - leg, leg, 0), new THREE.Vector3(s, 0, 0),
        new THREE.Vector3(s, 0, 0), new THREE.Vector3(s - leg, -leg, 0),
        new THREE.Vector3(leg, -s + leg, 0), new THREE.Vector3(0, -s, 0),
        new THREE.Vector3(0, -s, 0), new THREE.Vector3(-leg, -s + leg, 0),
        new THREE.Vector3(-s + leg, -leg, 0), new THREE.Vector3(-s, 0, 0),
        new THREE.Vector3(-s, 0, 0), new THREE.Vector3(-s + leg, leg, 0),
      );
      break;
    }
    case 'neutron-star':
    case 'hazard': {
      const leg = 0.35 * s;
      points.push(
        new THREE.Vector3(-leg, s - leg, 0), new THREE.Vector3(0, s, 0),
        new THREE.Vector3(0, s, 0), new THREE.Vector3(leg, s - leg, 0),
        new THREE.Vector3(s - leg, leg, 0), new THREE.Vector3(s, 0, 0),
        new THREE.Vector3(s, 0, 0), new THREE.Vector3(s - leg, -leg, 0),
        new THREE.Vector3(leg, -s + leg, 0), new THREE.Vector3(0, -s, 0),
        new THREE.Vector3(0, -s, 0), new THREE.Vector3(-leg, -s + leg, 0),
        new THREE.Vector3(-s + leg, -leg, 0), new THREE.Vector3(-s, 0, 0),
        new THREE.Vector3(-s, 0, 0), new THREE.Vector3(-s + leg, leg, 0),
        new THREE.Vector3(0, s, 0), new THREE.Vector3(0, 1.6 * s, 0),
        new THREE.Vector3(0, -s, 0), new THREE.Vector3(0, -1.6 * s, 0),
        new THREE.Vector3(-s, 0, 0), new THREE.Vector3(-1.4 * s, 0, 0),
        new THREE.Vector3(s, 0, 0), new THREE.Vector3(1.4 * s, 0, 0),
      );
      break;
    }
    case 'black-hole': {
      const inner = 0.25 * s;
      const outer = 1.0 * s;
      const barbL = 0.18 * s;
      const barbW = 0.12 * s;
      points.push(
        new THREE.Vector3(-outer, 0, 0), new THREE.Vector3(-inner, 0, 0),
        new THREE.Vector3(-inner - barbL, barbW, 0), new THREE.Vector3(-inner, 0, 0),
        new THREE.Vector3(-inner - barbL, -barbW, 0), new THREE.Vector3(-inner, 0, 0),
        new THREE.Vector3(outer, 0, 0), new THREE.Vector3(inner, 0, 0),
        new THREE.Vector3(inner + barbL, barbW, 0), new THREE.Vector3(inner, 0, 0),
        new THREE.Vector3(inner + barbL, -barbW, 0), new THREE.Vector3(inner, 0, 0),
        new THREE.Vector3(0, outer, 0), new THREE.Vector3(0, inner, 0),
        new THREE.Vector3(barbW, inner + barbL, 0), new THREE.Vector3(0, inner, 0),
        new THREE.Vector3(-barbW, inner + barbL, 0), new THREE.Vector3(0, inner, 0),
        new THREE.Vector3(0, -outer, 0), new THREE.Vector3(0, -inner, 0),
        new THREE.Vector3(barbW, -inner - barbL, 0), new THREE.Vector3(0, -inner, 0),
        new THREE.Vector3(-barbW, -inner - barbL, 0), new THREE.Vector3(0, -inner, 0),
      );
      break;
    }
    case 'barycentre': {
      const arm = 0.6 * s;
      const gap = 0.15 * s;
      points.push(
        new THREE.Vector3(-arm, 0, 0), new THREE.Vector3(-gap, 0, 0),
        new THREE.Vector3(gap, 0, 0), new THREE.Vector3(arm, 0, 0),
        new THREE.Vector3(0, -arm, 0), new THREE.Vector3(0, -gap, 0),
        new THREE.Vector3(0, gap, 0), new THREE.Vector3(0, arm, 0),
      );
      break;
    }
    case 'stellar-cluster': {
      points.push(
        new THREE.Vector3(-0.6 * s, 0.25 * s, 0), new THREE.Vector3(0, 0.65 * s, 0),
        new THREE.Vector3(0, 0.65 * s, 0), new THREE.Vector3(0.6 * s, 0.25 * s, 0),
        new THREE.Vector3(-0.6 * s, 0.55 * s, 0), new THREE.Vector3(0, 0.95 * s, 0),
        new THREE.Vector3(0, 0.95 * s, 0), new THREE.Vector3(0.6 * s, 0.55 * s, 0),
      );
      break;
    }
    case 'construct': {
      const b = 0.75 * s;
      const leg = 0.35 * s;
      points.push(
        new THREE.Vector3(-b, b - leg, 0), new THREE.Vector3(-b, b, 0),
        new THREE.Vector3(-b, b, 0), new THREE.Vector3(-b + leg, b, 0),
        new THREE.Vector3(b - leg, b, 0), new THREE.Vector3(b, b, 0),
        new THREE.Vector3(b, b, 0), new THREE.Vector3(b, b - leg, 0),
        new THREE.Vector3(b, -b + leg, 0), new THREE.Vector3(b, -b, 0),
        new THREE.Vector3(b, -b, 0), new THREE.Vector3(b - leg, -b, 0),
        new THREE.Vector3(-b + leg, -b, 0), new THREE.Vector3(-b, -b, 0),
        new THREE.Vector3(-b, -b, 0), new THREE.Vector3(-b, -b + leg, 0),
      );
      break;
    }
    case 'terrestrial': {
      appendCircleSegments(points, 0.4 * s, 32);
      break;
    }
    case 'super-earth': {
      appendCircleSegments(points, 0.35 * s, 32);
      appendCircleSegments(points, 0.55 * s, 32);
      break;
    }
    case 'gas-giant': {
      const r = 0.8 * s;
      appendCircleSegments(points, r, 32);
      const gap = 0.22 * s;
      const cos45 = Math.SQRT1_2;
      const sin45 = Math.SQRT1_2;
      points.push(
        new THREE.Vector3(-r * cos45, -r * sin45, 0), new THREE.Vector3(-gap * cos45, -gap * sin45, 0),
        new THREE.Vector3(gap * cos45, gap * sin45, 0), new THREE.Vector3(r * cos45, r * sin45, 0),
      );
      break;
    }
    case 'ice-giant': {
      appendCircleSegments(points, 0.55 * s, 32);
      const rInner = 0.6 * s;
      const rOuter = 0.95 * s;
      const cos45 = Math.SQRT1_2;
      const sin45 = Math.SQRT1_2;
      points.push(
        new THREE.Vector3(-rOuter * cos45, -rOuter * sin45, 0), new THREE.Vector3(-rInner * cos45, -rInner * sin45, 0),
        new THREE.Vector3(rInner * cos45, rInner * sin45, 0), new THREE.Vector3(rOuter * cos45, rOuter * sin45, 0),
      );
      break;
    }
  }
}
