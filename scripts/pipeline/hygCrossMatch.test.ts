import { describe, it, expect } from 'vitest';
import { parseHygRow } from './hygCrossMatch';

describe('Data Pipeline - parseHygRow', () => {
  it('correctly maps Sol at origin', () => {
    const node = parseHygRow({
      id: '0',
      proper: 'Sol',
      ra: '0.0',
      dec: '0.0',
      dist: '0.0',
      mag: '-26.7',
      absmag: '4.85',
      spect: 'G2V',
      ci: '0.656',
      lum: '1',
    });
    expect(node?.name).toBe('Sol');
    expect(node?.dist).toBe(0);
    expect(node?.spect).toBe('G2V');
  });

  it('correctly maps Sirius with proper name and kinematics', () => {
    const node = parseHygRow({
      id: '32263',
      hip: '32349',
      proper: 'Sirius',
      ra: '6.752481',
      dec: '-16.716116',
      dist: '2.6371',
      mag: '-1.44',
      absmag: '1.454',
      spect: 'A0m',
      lum: '22.8',
      vx: '-0.00000414',
      vy: '0.00002073',
      vz: '-0.0000109',
      rv: '-7.6',
    });
    expect(node?.properName).toBe('Sirius');
    expect(node?.velocity?.speed).toBeCloseTo(23.25, 1);
  });

  it('skips invalid rows and resolves naming fallbacks', () => {
    expect(parseHygRow({ id: 'abc', ra: '1', dec: '1', dist: '10' })).toBeNull();
    expect(parseHygRow({ id: '1', ra: 'NaN', dec: '1', dist: '10' })).toBeNull();
    const n = parseHygRow({ id: '2', ra: '0', dec: '0', dist: '10', bayer: 'Bet', con: 'Ori' });
    expect(n?.name).toBe('Bet Ori');
  });
});
