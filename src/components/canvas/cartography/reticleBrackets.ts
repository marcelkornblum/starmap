import type { CelestialClassification } from '../../../types/spatial';

function pushSegment(coords: number[], x1: number, y1: number, x2: number, y2: number): void {
  coords.push(x1, y1, 0, x2, y2, 0);
}

function appendCircleSegments(coords: number[], r: number, segs: number): void {
  for (let i = 0; i < segs; i++) {
    const th1 = (i / segs) * Math.PI * 2;
    const th2 = ((i + 1) / segs) * Math.PI * 2;
    pushSegment(coords, Math.cos(th1) * r, Math.sin(th1) * r, Math.cos(th2) * r, Math.sin(th2) * r);
  }
}

/**
 * Appends flat (x, y, z) line-segment coordinates for the 2D taxonomy bracket or footprint shape in the local XY plane.
 */
export function appendReticleBracketPoints(
  coords: number[],
  classification: CelestialClassification,
  s: number,
): void {
  switch (classification) {
    case 'star':
    case 'stellar-system': {
      pushSegment(coords, 0, s, s, 0);
      pushSegment(coords, s, 0, 0, -s);
      pushSegment(coords, 0, -s, -s, 0);
      pushSegment(coords, -s, 0, 0, s);
      break;
    }
    case 'brown-dwarf': {
      pushSegment(coords, -0.6 * s, 0.4 * s, 0, s);
      pushSegment(coords, 0, s, 0.6 * s, 0.4 * s);
      pushSegment(coords, -0.6 * s, -0.4 * s, 0, -s);
      pushSegment(coords, 0, -s, 0.6 * s, -0.4 * s);
      break;
    }
    case 'white-dwarf': {
      const leg = 0.35 * s;
      pushSegment(coords, -leg, s - leg, 0, s);
      pushSegment(coords, 0, s, leg, s - leg);
      pushSegment(coords, s - leg, leg, s, 0);
      pushSegment(coords, s, 0, s - leg, -leg);
      pushSegment(coords, leg, -s + leg, 0, -s);
      pushSegment(coords, 0, -s, -leg, -s + leg);
      pushSegment(coords, -s + leg, -leg, -s, 0);
      pushSegment(coords, -s, 0, -s + leg, leg);
      break;
    }
    case 'neutron-star':
    case 'hazard': {
      const leg = 0.35 * s;
      pushSegment(coords, -leg, s - leg, 0, s);
      pushSegment(coords, 0, s, leg, s - leg);
      pushSegment(coords, s - leg, leg, s, 0);
      pushSegment(coords, s, 0, s - leg, -leg);
      pushSegment(coords, leg, -s + leg, 0, -s);
      pushSegment(coords, 0, -s, -leg, -s + leg);
      pushSegment(coords, -s + leg, -leg, -s, 0);
      pushSegment(coords, -s, 0, -s + leg, leg);
      pushSegment(coords, 0, s, 0, 1.6 * s);
      pushSegment(coords, 0, -s, 0, -1.6 * s);
      pushSegment(coords, -s, 0, -1.4 * s, 0);
      pushSegment(coords, s, 0, 1.4 * s, 0);
      break;
    }
    case 'black-hole': {
      const inner = 0.25 * s;
      const outer = 1.0 * s;
      const barbL = 0.18 * s;
      const barbW = 0.12 * s;
      pushSegment(coords, -outer, 0, -inner, 0);
      pushSegment(coords, -inner - barbL, barbW, -inner, 0);
      pushSegment(coords, -inner - barbL, -barbW, -inner, 0);
      pushSegment(coords, outer, 0, inner, 0);
      pushSegment(coords, inner + barbL, barbW, inner, 0);
      pushSegment(coords, inner + barbL, -barbW, inner, 0);
      pushSegment(coords, 0, outer, 0, inner);
      pushSegment(coords, barbW, inner + barbL, 0, inner);
      pushSegment(coords, -barbW, inner + barbL, 0, inner);
      pushSegment(coords, 0, -outer, 0, -inner);
      pushSegment(coords, barbW, -inner - barbL, 0, -inner);
      pushSegment(coords, -barbW, -inner - barbL, 0, -inner);
      break;
    }
    case 'barycentre': {
      const arm = 0.6 * s;
      const gap = 0.15 * s;
      pushSegment(coords, -arm, 0, -gap, 0);
      pushSegment(coords, gap, 0, arm, 0);
      pushSegment(coords, 0, -arm, 0, -gap);
      pushSegment(coords, 0, gap, 0, arm);
      break;
    }
    case 'stellar-cluster': {
      pushSegment(coords, -0.6 * s, 0.25 * s, 0, 0.65 * s);
      pushSegment(coords, 0, 0.65 * s, 0.6 * s, 0.25 * s);
      pushSegment(coords, -0.6 * s, 0.55 * s, 0, 0.95 * s);
      pushSegment(coords, 0, 0.95 * s, 0.6 * s, 0.55 * s);
      break;
    }
    case 'construct': {
      const b = 0.75 * s;
      const leg = 0.35 * s;
      pushSegment(coords, -b, b - leg, -b, b);
      pushSegment(coords, -b, b, -b + leg, b);
      pushSegment(coords, b - leg, b, b, b);
      pushSegment(coords, b, b, b, b - leg);
      pushSegment(coords, b, -b + leg, b, -b);
      pushSegment(coords, b, -b, b - leg, -b);
      pushSegment(coords, -b + leg, -b, -b, -b);
      pushSegment(coords, -b, -b, -b, -b + leg);
      break;
    }
    case 'terrestrial': {
      appendCircleSegments(coords, 0.4 * s, 32);
      break;
    }
    case 'super-earth': {
      appendCircleSegments(coords, 0.35 * s, 32);
      appendCircleSegments(coords, 0.55 * s, 32);
      break;
    }
    case 'gas-giant': {
      const r = 0.8 * s;
      appendCircleSegments(coords, r, 32);
      const gap = 0.22 * s;
      const cos45 = Math.SQRT1_2;
      const sin45 = Math.SQRT1_2;
      pushSegment(coords, -r * cos45, -r * sin45, -gap * cos45, -gap * sin45);
      pushSegment(coords, gap * cos45, gap * sin45, r * cos45, r * sin45);
      break;
    }
    case 'ice-giant': {
      appendCircleSegments(coords, 0.55 * s, 32);
      const rInner = 0.6 * s;
      const rOuter = 0.95 * s;
      const cos45 = Math.SQRT1_2;
      const sin45 = Math.SQRT1_2;
      pushSegment(coords, -rOuter * cos45, -rOuter * sin45, -rInner * cos45, -rInner * sin45);
      pushSegment(coords, rInner * cos45, rInner * sin45, rOuter * cos45, rOuter * sin45);
      break;
    }
  }
}
