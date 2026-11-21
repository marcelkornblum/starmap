import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import type { GuideExamplesDataset, ReferenceBaselinesDataset } from '../types/guideData';
import {
  clearGuideExamplesCache,
  seedGuideExamples,
} from '../data/guideExamplesRepository';
import {
  clearReferenceBaselinesCache,
  seedReferenceBaselines,
} from '../data/referenceBaselinesRepository';
import { useGuideExamples, useReferenceBaselines } from './useGuideData';

const MOCK_EXAMPLES: GuideExamplesDataset = {
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
    planetTypes: {},
    metricTypes: {},
    hazardTypes: {},
  },
};

const MOCK_BASELINES: ReferenceBaselinesDataset = {
  version: 1,
  generatedAt: '2026-01-01T00:00:00.000Z',
  targets: {
    sol: {
      id: 'sol',
      name: 'Sol',
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
  metrics: {},
};

const Probe = () => {
  const examples = useGuideExamples('starTypes', 'g');
  const baselines = useReferenceBaselines();
  return (
    <div>
      <span data-testid="example-count">{examples.length}</span>
      <span data-testid="sol-name">{baselines?.targets.sol.name ?? 'none'}</span>
    </div>
  );
};

describe('useGuideData hooks', () => {
  beforeEach(() => {
    clearGuideExamplesCache();
    clearReferenceBaselinesCache();
  });

  it('returns cached examples and baselines reactively when seeded', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
    render(<Probe />);
    expect(screen.getByTestId('example-count').textContent).toBe('0');
    expect(screen.getByTestId('sol-name').textContent).toBe('none');

    act(() => {
      seedGuideExamples(MOCK_EXAMPLES);
      seedReferenceBaselines(MOCK_BASELINES);
    });

    expect(screen.getByTestId('example-count').textContent).toBe('1');
    expect(screen.getByTestId('sol-name').textContent).toBe('Sol');
    vi.unstubAllGlobals();
  });
});
