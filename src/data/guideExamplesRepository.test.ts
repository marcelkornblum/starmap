import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GuideExamplesDataset } from '../types/guideData';
import {
  clearGuideExamplesCache,
  fetchGuideExamples,
  getCachedGuideExamples,
  getCachedGuideExamplesForEntry,
  getGuideExamplesVersion,
  seedGuideExamples,
  subscribeGuideExamples,
} from './guideExamplesRepository';

const MOCK_GUIDE_EXAMPLES: GuideExamplesDataset = {
  version: 1,
  generatedAt: '2026-01-01T00:00:00.000Z',
  sections: {
    starTypes: {
      g: [
        {
          id: 'sol',
          name: 'Sol',
          href: '/system/sol',
          note: 'Solar System primary (G2V).',
          reticleType: 'stellar-system',
        },
      ],
    },
    planetTypes: {
      terrestrial: [
        {
          id: 'earth',
          name: 'Earth',
          href: '/system/sol?focus=earth',
          note: 'Terrestrial benchmark.',
          reticleType: 'terrestrial',
        },
      ],
    },
    metricTypes: {},
    hazardTypes: {},
  },
};

describe('guideExamplesRepository', () => {
  beforeEach(() => {
    clearGuideExamplesCache();
  });

  it('fetches, caches, and resolves examples by section and entryId', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => MOCK_GUIDE_EXAMPLES,
    }));

    expect(getCachedGuideExamples()).toBeUndefined();
    expect(getCachedGuideExamplesForEntry('starTypes', 'g')).toEqual([]);

    const [a, b] = await Promise.all([
      fetchGuideExamples(fetchMock as unknown as typeof fetch),
      fetchGuideExamples(fetchMock as unknown as typeof fetch),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(a).toEqual(b);
    expect(getCachedGuideExamplesForEntry('starTypes', 'g')).toHaveLength(1);
    expect(getCachedGuideExamplesForEntry('starTypes', 'g')[0]?.name).toBe('Sol');
    expect(getCachedGuideExamplesForEntry('planetTypes', 'terrestrial')[0]?.href).toBe('/system/sol?focus=earth');
  });

  it('notifies subscribers when seeded or cleared', () => {
    const listener = vi.fn();
    const unsub = subscribeGuideExamples(listener);
    const v0 = getGuideExamplesVersion();

    seedGuideExamples(MOCK_GUIDE_EXAMPLES);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(getGuideExamplesVersion()).toBeGreaterThan(v0);

    clearGuideExamplesCache();
    expect(listener).toHaveBeenCalledTimes(2);
    expect(getCachedGuideExamplesForEntry('starTypes', 'g')).toEqual([]);
    unsub();
  });

  it('rejects guide-examples.json with missing or mismatched version', async () => {
    const missingFetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ generatedAt: '2026-01-01T00:00:00.000Z', sections: MOCK_GUIDE_EXAMPLES.sections }),
    }));
    await expect(
      fetchGuideExamples(missingFetch as unknown as typeof fetch),
    ).rejects.toThrow(/unsupported schema version/i);

    const wrongFetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ ...MOCK_GUIDE_EXAMPLES, version: 2 }),
    }));
    await expect(
      fetchGuideExamples(wrongFetch as unknown as typeof fetch),
    ).rejects.toThrow(/unsupported schema version/i);
  });
});
