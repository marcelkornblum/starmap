import { describe, it, expect } from 'vitest';
import { getStrippedSystemBaseName } from '../../../scripts/build-data';

describe('getStrippedSystemBaseName', () => {
  it('strips trailing component letter designations and suffixes', () => {
    expect(getStrippedSystemBaseName('61 Cygni A')).toBe('61 Cygni');
    expect(getStrippedSystemBaseName('61 Cygni B')).toBe('61 Cygni');
    expect(getStrippedSystemBaseName('Struve 2398 A')).toBe('Struve 2398');
    expect(getStrippedSystemBaseName('Struve 2398 B')).toBe('Struve 2398');
  });

  it('normalizes historical IAU proper names and component variants for Alpha Centauri', () => {
    expect(getStrippedSystemBaseName('Rigil Kentaurus (Alpha Centauri A)')).toBe('Alpha Centauri');
    expect(getStrippedSystemBaseName('Toliman (Alpha Centauri B)')).toBe('Alpha Centauri');
    expect(getStrippedSystemBaseName('Proxima Centauri')).toBe('Alpha Centauri');
    expect(getStrippedSystemBaseName('Alpha Centauri A')).toBe('Alpha Centauri');
  });

  it('normalizes Sirius and secondary Gliese designations', () => {
    expect(getStrippedSystemBaseName('Sirius')).toBe('Sirius');
    expect(getStrippedSystemBaseName('Sirius A')).toBe('Sirius');
    expect(getStrippedSystemBaseName('Gl 244B')).toBe('Sirius');
  });

  it('strips suffixes attached directly to digits and normalizes special system maps', () => {
    expect(getStrippedSystemBaseName('Gl 22A')).toBe('Gl 22');
    expect(getStrippedSystemBaseName('GJ 1245A')).toBe('GJ 1245');
    expect(getStrippedSystemBaseName('Gl 667A')).toBe('Gl 667');
    expect(getStrippedSystemBaseName('NN 3192A')).toBe('LTT 1445');
    expect(getStrippedSystemBaseName('NN 3192')).toBe('LTT 1445');
    expect(getStrippedSystemBaseName('NN 3193')).toBe('LTT 1445');
    expect(getStrippedSystemBaseName('Gl 53')).toBe('Mu Cassiopeiae');
    expect(getStrippedSystemBaseName('Gl 53B')).toBe('Mu Cassiopeiae');
  });

  it('normalizes Luyten 726-8 and UV / BL Ceti flare star components', () => {
    expect(getStrippedSystemBaseName('Luyten 726-8 A (BL Ceti)')).toBe('Luyten 726-8');
    expect(getStrippedSystemBaseName('UV Ceti (Luyten 726-8 B)')).toBe('Luyten 726-8');
    expect(getStrippedSystemBaseName('Gl 65A')).toBe('Luyten 726-8');
    expect(getStrippedSystemBaseName('Gl 65B')).toBe('Luyten 726-8');
  });
});
