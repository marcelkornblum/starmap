import { describe, it, expect } from 'vitest';
import type { ExoplanetRecord } from '../../src/types/astro';
import {
  buildCsvHeaderIndex,
  createExoplanetHostRegistry,
  finiteOrUndefined,
  inferSpectralClassFromTeff,
  normalizeExoHostKey,
  numAt,
  parseSexagesimalDecDeg,
  parseSexagesimalRaDeg,
  strAt,
} from './exoplanetHosts';

describe('exoplanetHosts', () => {
  it('parses sexagesimal RA and Dec including -00 negative declinations', () => {
    expect(parseSexagesimalRaDeg('06 30 00')).toBeCloseTo(97.5, 4);
    expect(parseSexagesimalDecDeg('-00 15 30')).toBeCloseTo(-(15 / 60 + 30 / 3600), 5);
    expect(parseSexagesimalDecDeg('+20:30:00')).toBeCloseTo(20.5, 5);
    expect(Number.isNaN(parseSexagesimalRaDeg(''))).toBe(true);
    expect(Number.isNaN(parseSexagesimalDecDeg(undefined))).toBe(true);
  });

  it('infers spectral class from effective temperature across O through Y', () => {
    expect(inferSpectralClassFromTeff(35000)).toBe('O');
    expect(inferSpectralClassFromTeff(12000)).toBe('B');
    expect(inferSpectralClassFromTeff(8000)).toBe('A');
    expect(inferSpectralClassFromTeff(6500)).toBe('F');
    expect(inferSpectralClassFromTeff(5778)).toBe('G');
    expect(inferSpectralClassFromTeff(4500)).toBe('K');
    expect(inferSpectralClassFromTeff(3000)).toBe('M');
    expect(inferSpectralClassFromTeff(1800)).toBe('L');
    expect(inferSpectralClassFromTeff(900)).toBe('T');
    expect(inferSpectralClassFromTeff(400)).toBe('Y');
    expect(inferSpectralClassFromTeff(0)).toBeUndefined();
  });

  it('builds CSV header indices and extracts typed row fields', () => {
    const header = buildCsvHeaderIndex([' name ', 'val', '']);
    expect(header.get('name')).toBe(0);
    expect(header.get('val')).toBe(1);

    const row = ['  Alpha ', '42.5'];
    expect(strAt(row, header.get('name'))).toBe('Alpha');
    expect(numAt(row, header.get('val'))).toBeCloseTo(42.5, 5);
    expect(finiteOrUndefined(Number.NaN)).toBeUndefined();
    expect(finiteOrUndefined(10)).toBe(10);
    expect(normalizeExoHostKey('Tau Ceti-A')).toBe('taucetia');
  });

  it('registers hosts, resolves IAU NameExoWorlds aliases, and prefers NASA metadata over EU', () => {
    const hostMap = new Map<string, ExoplanetRecord[]>();
    const { registerEntry, buildCanonicalHosts } = createExoplanetHostRegistry(
      hostMap,
      (existing, incoming) => ({ ...existing, discoveryYear: existing.discoveryYear ?? incoming.discoveryYear }),
    );

    registerEntry(
      '51 Peg b',
      '51 Pegasi b',
      { id: '51-peg-b', name: '51 Pegasi b', letter: 'b' },
      '51 Peg',
      'eu',
      { hostName: '51 Peg', raDeg: 344.0, decDeg: 20.0, distPc: 15.5, spect: 'G5V' },
      false,
    );
    registerEntry(
      '51 Peg b',
      '51 Pegasi b',
      { id: '51-peg-b', name: '51 Pegasi b', letter: 'b', discoveryYear: 1995 },
      '51 Peg',
      'nasa',
      { hostName: '51 Peg', raDeg: 344.366, decDeg: 20.768, distPc: 15.46, spect: 'G2IV' },
      true,
    );

    const hosts = buildCanonicalHosts();
    expect(hosts).toHaveLength(1);
    expect(hosts[0]?.host.spect).toBe('G2IV');
    expect(hosts[0]?.host.confirmed).toBe(true);
    expect(hosts[0]?.planets[0]?.discoveryYear).toBe(1995);
    expect(hostMap.has('helvetios')).toBe(true);
  });
});
