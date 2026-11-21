import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReferenceBaselinesDataset } from '../types/guideData';
import {
  clearReferenceBaselinesCache,
  fetchReferenceBaselines,
  getCachedReferenceBaselines,
  getReferenceBaselinesVersion,
  seedReferenceBaselines,
  subscribeReferenceBaselines,
} from './referenceBaselinesRepository';

const MOCK_BASELINES: ReferenceBaselinesDataset = {
  version: 1,
  generatedAt: '2026-01-01T00:00:00.000Z',
  targets: {
    sol: {
      id: 'sol',
      name: 'Sol',
      properName: 'Sun',
      systemId: 'sol',
      href: '/system/sol',
      spectralType: 'G2V',
      coordinatesPc: [0, 0, 0],
      massMsun: { value: 1.0, unit: 'M☉' },
      radiusRsun: { value: 1.0, unit: 'R☉' },
      luminosityLsun: { value: 1.0, unit: 'L☉' },
      effectiveTempK: { value: 5778, unit: 'K' },
      visualMagnitude: { value: -26.74, unit: 'V' },
      absoluteMagnitude: { value: 4.83, unit: 'M_V' },
      reticleType: 'stellar-system',
    },
    earth: {
      id: 'earth',
      name: 'Earth',
      systemId: 'sol',
      systemName: 'Sol',
      href: '/planet/earth',
      coordinatesPc: [0, 0, 0],
      massMearth: { value: 1.0, unit: 'M⊕' },
      radiusRearth: { value: 1.0, unit: 'R⊕' },
      semiMajorAxisAu: { value: 1.0, unit: 'AU' },
      periodDays: { value: 365.26, unit: 'd' },
      inclinationDeg: { value: 0, unit: '°' },
      equilibriumTempK: { value: 248.5, unit: 'K' },
      surfaceGravityG: { value: 1.0, unit: 'g' },
      reticleType: 'terrestrial',
    },
    stellarBenchmark: {
      id: 'tau-ceti',
      systemId: 'gaia-2452378776434477184',
      name: 'Tau Ceti',
      href: '/system/tau-ceti',
      spectralType: 'G8V',
      coordinatesPc: [3.156, 1.54, -1.003],
      reticleType: 'stellar-system',
    },
    orbitalBenchmark: {
      id: 'tau-ceti-e',
      systemId: 'gaia-2452378776434477184',
      systemName: 'Tau Ceti',
      name: 'Tau Ceti e',
      href: '/system/tau-ceti?focus=tau-ceti-e',
      reticleType: 'super-earth',
    },
  },
  metrics: {
    'surface-gravity': {
      baselineId: 'earth',
      baselineName: 'Earth',
      baselineHref: '/planet/earth',
      baselineReticleType: 'terrestrial',
      value: '1.00 g',
      familiar: '1.00 g (9.81 m/s²)',
      numericValue: 1.0,
      unit: 'g',
    },
  },
};

describe('referenceBaselinesRepository', () => {
  beforeEach(() => {
    clearReferenceBaselinesCache();
  });

  it('fetches, caches, and deduplicates concurrent requests for reference-baselines.json', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => MOCK_BASELINES,
    }));

    expect(getCachedReferenceBaselines()).toBeUndefined();

    const [a, b] = await Promise.all([
      fetchReferenceBaselines(fetchMock as unknown as typeof fetch),
      fetchReferenceBaselines(fetchMock as unknown as typeof fetch),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(a.targets.sol.effectiveTempK.value).toBe(5778);
    expect(b).toEqual(a);
    expect(getCachedReferenceBaselines()).toEqual(MOCK_BASELINES);
  });

  it('notifies subscribers when seeded or cleared', () => {
    const listener = vi.fn();
    const unsub = subscribeReferenceBaselines(listener);
    const v0 = getReferenceBaselinesVersion();

    seedReferenceBaselines(MOCK_BASELINES);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(getReferenceBaselinesVersion()).toBeGreaterThan(v0);
    expect(getCachedReferenceBaselines()?.targets.earth.name).toBe('Earth');

    clearReferenceBaselinesCache();
    expect(listener).toHaveBeenCalledTimes(2);
    expect(getCachedReferenceBaselines()).toBeUndefined();
    unsub();
  });

  it('clears in-flight cache when fetch fails so subsequent retries succeed', async () => {
    const fetchFail = vi.fn(async () => ({
      ok: false,
      status: 500,
      statusText: 'Server Error',
    }));

    await expect(
      fetchReferenceBaselines(fetchFail as unknown as typeof fetch),
    ).rejects.toThrow(/500/);

    const fetchOk = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => MOCK_BASELINES,
    }));

    const data = await fetchReferenceBaselines(fetchOk as unknown as typeof fetch);
    expect(data.targets.sol.id).toBe('sol');
  });

  it('rejects reference-baselines.json with missing or mismatched version', async () => {
    const missingFetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ generatedAt: '2026-01-01T00:00:00.000Z', targets: MOCK_BASELINES.targets, metrics: MOCK_BASELINES.metrics }),
    }));
    await expect(
      fetchReferenceBaselines(missingFetch as unknown as typeof fetch),
    ).rejects.toThrow(/unsupported schema version/i);

    const wrongFetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ ...MOCK_BASELINES, version: 2 }),
    }));
    await expect(
      fetchReferenceBaselines(wrongFetch as unknown as typeof fetch),
    ).rejects.toThrow(/unsupported schema version/i);
  });
});
