import { describe, it, expect } from 'vitest';
import { appendReticleBracketPoints } from './reticleBrackets';

describe('reticleBrackets', () => {
  it('generates 8 vertices (24 flat coords) for diamond star reticle', () => {
    const coords: number[] = [];
    appendReticleBracketPoints(coords, 'star', 1.0);
    expect(coords.length).toBe(8 * 3);
  });

  it('generates 8 vertices (24 flat coords) for broken-diamond brown dwarf reticle', () => {
    const coords: number[] = [];
    appendReticleBracketPoints(coords, 'brown-dwarf', 1.0);
    expect(coords.length).toBe(8 * 3);
  });

  it('generates fractured diamond corner brackets for white dwarf', () => {
    const coords: number[] = [];
    appendReticleBracketPoints(coords, 'white-dwarf', 1.0);
    expect(coords.length).toBe(16 * 3);
  });

  it('generates divergent beam hazard geometry for neutron star', () => {
    const coords: number[] = [];
    appendReticleBracketPoints(coords, 'neutron-star', 1.0);
    expect(coords.length).toBe(24 * 3);
  });

  it('generates convergent spines targeting empty centre for black hole', () => {
    const coords: number[] = [];
    appendReticleBracketPoints(coords, 'black-hole', 1.0);
    expect(coords.length).toBe(24 * 3);
  });

  it('generates circle geometry for planetary classifications', () => {
    const coordsTerr: number[] = [];
    appendReticleBracketPoints(coordsTerr, 'terrestrial', 1.0);
    expect(coordsTerr.length).toBe(64 * 3);

    const coordsSuper: number[] = [];
    appendReticleBracketPoints(coordsSuper, 'super-earth', 1.0);
    expect(coordsSuper.length).toBe(128 * 3);

    const coordsGas: number[] = [];
    appendReticleBracketPoints(coordsGas, 'gas-giant', 1.0);
    expect(coordsGas.length).toBe(68 * 3);

    const coordsIce: number[] = [];
    appendReticleBracketPoints(coordsIce, 'ice-giant', 1.0);
    expect(coordsIce.length).toBe(68 * 3);
  });
});
