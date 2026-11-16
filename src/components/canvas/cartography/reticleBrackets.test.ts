import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { appendReticleBracketPoints } from './reticleBrackets';

describe('reticleBrackets', () => {
  it('generates 8 points for diamond star reticle', () => {
    const points: THREE.Vector3[] = [];
    appendReticleBracketPoints(points, 'star', 1.0);
    expect(points.length).toBe(8);
  });

  it('generates 8 points for broken-diamond brown dwarf reticle', () => {
    const points: THREE.Vector3[] = [];
    appendReticleBracketPoints(points, 'brown-dwarf', 1.0);
    expect(points.length).toBe(8);
  });

  it('generates fractured diamond corner brackets for white dwarf', () => {
    const points: THREE.Vector3[] = [];
    appendReticleBracketPoints(points, 'white-dwarf', 1.0);
    expect(points.length).toBe(16);
  });

  it('generates divergent beam hazard geometry for neutron star', () => {
    const points: THREE.Vector3[] = [];
    appendReticleBracketPoints(points, 'neutron-star', 1.0);
    expect(points.length).toBe(24);
  });

  it('generates convergent spines targeting empty centre for black hole', () => {
    const points: THREE.Vector3[] = [];
    appendReticleBracketPoints(points, 'black-hole', 1.0);
    expect(points.length).toBe(24);
  });

  it('generates circle geometry for planetary classifications', () => {
    const pointsTerr: THREE.Vector3[] = [];
    appendReticleBracketPoints(pointsTerr, 'terrestrial', 1.0);
    expect(pointsTerr.length).toBe(64);

    const pointsSuper: THREE.Vector3[] = [];
    appendReticleBracketPoints(pointsSuper, 'super-earth', 1.0);
    expect(pointsSuper.length).toBe(128);

    const pointsGas: THREE.Vector3[] = [];
    appendReticleBracketPoints(pointsGas, 'gas-giant', 1.0);
    expect(pointsGas.length).toBe(68);

    const pointsIce: THREE.Vector3[] = [];
    appendReticleBracketPoints(pointsIce, 'ice-giant', 1.0);
    expect(pointsIce.length).toBe(68);
  });
});
