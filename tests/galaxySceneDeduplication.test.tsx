// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, act } from '@testing-library/react';
import type { SpatialEntityDefinition } from '../src/components/canvas/entity';
import type { CandidateSystem } from '../src/data';
import type { SystemSummaryNode } from '../src/types/astro';

let capturedEntities: SpatialEntityDefinition[] = [];
let triggerHydration: ((summaries: readonly SystemSummaryNode[]) => void) | undefined;

vi.mock('../src/components/canvas/viewport/SpatialViewport', () => ({
  SpatialViewport: ({ entities, children }: { entities: SpatialEntityDefinition[]; children: React.ReactNode }) => {
    capturedEntities = entities;
    return <div data-testid="spatial-viewport">{children}</div>;
  },
}));

vi.mock('../src/components/canvas/entity/SectorPointCloud', () => ({
  SectorPointCloud: ({
    onHydratedSummariesChange,
  }: {
    onHydratedSummariesChange?: (summaries: readonly SystemSummaryNode[]) => void;
  }) => {
    triggerHydration = onHydratedSummariesChange;
    return <div data-testid="sector-point-cloud" />;
  },
}));

import { GalaxyScene } from '../src/components/canvas/scenes/GalaxyScene';

describe('GalaxyScene - Streamed Stars Deduplication & Multiplicity Upgrade', () => {
  beforeEach(() => {
    capturedEntities = [];
    triggerHydration = undefined;
  });

  const baseCandidate: CandidateSystem = {
    id: 'alpha-centauri',
    name: 'Alpha Centauri',
    classification: 'star',
    spectralType: 'G2V',
    position: [-0.495, -0.414, -1.157],
    distPc: 1.33,
    multiplicity: 1,
    planetsCount: 0,
    description: 'Triple star system',
  };

  const makeStreamedSummary = (
    id: string,
    name: string,
    x: number,
    y: number,
    z: number,
    starCount: number = 1,
    overrides: Partial<SystemSummaryNode> = {},
  ): SystemSummaryNode => ({
    id,
    name,
    x,
    y,
    z,
    dist: Math.hypot(x, y, z),
    mag: 0,
    absmag: 4,
    spect: 'G2V',
    starCount,
    planetCount: 0,
    hasHabitableCandidate: false,
    sectorId: 'sector_+000_+000_+000',
    ...overrides,
  });

  it('deduplicates streamed stars matching baseEntities by normalized name and upgrades multiplicity', () => {
    render(<GalaxyScene systems={[baseCandidate]} />);
    expect(capturedEntities).toHaveLength(1);
    expect(capturedEntities[0]?.id).toBe('alpha-centauri');
    expect(capturedEntities[0]?.multiplicity).toBe(1);

    // Stream a star with normalized name "alpha centauri" and starCount: 3
    act(() => {
      triggerHydration?.([
        makeStreamedSummary('hip-71683', 'Alpha Centauri', -0.495, -0.414, -1.157, 3),
      ]);
    });

    expect(capturedEntities).toHaveLength(1);
    expect(capturedEntities[0]?.id).toBe('alpha-centauri');
    expect(capturedEntities[0]?.multiplicity).toBe(3);
  });

  it('deduplicates streamed stars matching baseEntities by 3D spatial proximity (<= 0.2 pc) and upgrades multiplicity', () => {
    render(<GalaxyScene systems={[baseCandidate]} />);
    expect(capturedEntities).toHaveLength(1);

    // Stream a star with different name and id but within 0.05 pc Euclidean distance:
    // dx = 0.02, dy = 0.01, dz = 0.02 -> dx^2 + dy^2 + dz^2 = 0.0009 <= 0.04
    act(() => {
      triggerHydration?.([
        makeStreamedSummary('hip-71683', 'Rigil Kentaurus', -0.475, -0.404, -1.137, 3),
      ]);
    });

    expect(capturedEntities).toHaveLength(1);
    expect(capturedEntities[0]?.id).toBe('alpha-centauri');
    expect(capturedEntities[0]?.multiplicity).toBe(3);
  });

  it('pushes streamed stars as new reticle entities when they do not match baseEntities', () => {
    render(<GalaxyScene systems={[baseCandidate]} />);
    expect(capturedEntities).toHaveLength(1);

    // Stream a star located far away (e.g. 5 pc away)
    act(() => {
      triggerHydration?.([
        makeStreamedSummary('hip-8102', 'Tau Ceti', 3.156, 1.54, -1.003, 1),
      ]);
    });

    expect(capturedEntities).toHaveLength(2);
    expect(capturedEntities.map((e) => e.id)).toEqual(['alpha-centauri', 'hip-8102']);
  });

  it('derives classification from spectral type and maps planetCensus into planets list', () => {
    render(<GalaxyScene systems={[]} />);

    act(() => {
      triggerHydration?.([
        makeStreamedSummary('wd-1', 'Sirius B', -0.494, 2.477, -0.759, 1, {
          spect: 'DA2',
        }),
        makeStreamedSummary('bd-1', 'Luhman 16 A', -1.137, 0.362, -1.602, 1, {
          spect: 'L7.5',
        }),
        makeStreamedSummary('psr-1', 'Vela Pulsar', 10.0, 5.0, 2.0, 1, {
          spect: 'PSR B0833-45',
        }),
        makeStreamedSummary('exo-1', 'Trappist-1', 12.0, 2.0, 1.0, 1, {
          spect: 'M8V',
          planetCensus: ['terrestrial', 'super-earth'],
        }),
      ]);
    });

    expect(capturedEntities).toHaveLength(4);
    expect(capturedEntities[0]?.classification).toBe('white-dwarf');
    expect(capturedEntities[1]?.classification).toBe('brown-dwarf');
    expect(capturedEntities[2]?.classification).toBe('neutron-star');
    expect(capturedEntities[3]?.classification).toBe('star');
    expect(capturedEntities[3]?.planets).toHaveLength(2);
    expect(capturedEntities[3]?.planets?.[0]?.classification).toBe('terrestrial');
    expect(capturedEntities[3]?.planets?.[1]?.classification).toBe('super-earth');
  });
});
