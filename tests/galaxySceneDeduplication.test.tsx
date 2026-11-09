// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, act } from '@testing-library/react';
import type { SpatialEntityDefinition } from '../src/components/canvas/entity';
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

describe('GalaxyScene - Streamed Stars Deduplication & Classification Derivation', () => {
  beforeEach(() => {
    capturedEntities = [];
    triggerHydration = undefined;
  });

  const baseEntity: SpatialEntityDefinition = {
    id: 'alpha-centauri',
    name: 'Alpha Centauri',
    classification: 'star',
    spectralType: 'G2V',
    position: [-0.495, -0.414, -1.157],
    multiplicity: 1,
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

  it('deduplicates streamed stars matching additionalEntities by canonical ID', () => {
    render(<GalaxyScene additionalEntities={[baseEntity]} />);
    expect(capturedEntities).toHaveLength(1);
    expect(capturedEntities[0]?.id).toBe('alpha-centauri');
    expect(capturedEntities[0]?.multiplicity).toBe(1);

    // Stream a star with matching ID "alpha-centauri"
    act(() => {
      triggerHydration?.([
        makeStreamedSummary('alpha-centauri', 'Alpha Centauri', -0.495, -0.414, -1.157, 3),
      ]);
    });

    expect(capturedEntities).toHaveLength(1);
    expect(capturedEntities[0]?.id).toBe('alpha-centauri');
  });

  it('pushes streamed stars as new reticle entities when their canonical ID does not match additionalEntities', () => {
    render(<GalaxyScene additionalEntities={[baseEntity]} />);
    expect(capturedEntities).toHaveLength(1);

    // Stream a star with a distinct canonical ID
    act(() => {
      triggerHydration?.([
        makeStreamedSummary('hip-8102', 'Tau Ceti', 3.156, 1.54, -1.003, 1),
      ]);
    });

    expect(capturedEntities).toHaveLength(2);
    expect(capturedEntities.map((e) => e.id)).toEqual(['alpha-centauri', 'hip-8102']);
  });

  it('reads precalculated classification and maps planetCensus into planets list', () => {
    render(<GalaxyScene additionalEntities={[]} />);

    act(() => {
      triggerHydration?.([
        makeStreamedSummary('wd-1', 'Sirius B', -0.494, 2.477, -0.759, 1, {
          spect: 'DA2',
          classification: 'white-dwarf',
        }),
        makeStreamedSummary('bd-1', 'Luhman 16 A', -1.137, 0.362, -1.602, 1, {
          spect: 'L7.5',
          classification: 'brown-dwarf',
        }),
        makeStreamedSummary('psr-1', 'Vela Pulsar', 10.0, 5.0, 2.0, 1, {
          spect: 'PSR B0833-45',
          classification: 'neutron-star',
        }),
        makeStreamedSummary('exo-1', 'Trappist-1', 12.0, 2.0, 1.0, 1, {
          spect: 'M8V',
          classification: 'star',
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
