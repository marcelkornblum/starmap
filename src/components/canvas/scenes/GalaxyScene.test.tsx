import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, act } from '@testing-library/react';
import type { SpatialEntityDefinition } from '../entity';
import type { SystemSummaryNode } from '../../../types/astro';

let capturedEntities: SpatialEntityDefinition[] = [];
let triggerHydration: ((summaries: readonly SystemSummaryNode[]) => void) | undefined;

vi.mock('../viewport/SpatialViewport', () => ({
  SpatialViewport: ({ entities, children }: { entities: SpatialEntityDefinition[]; children: React.ReactNode }) => {
    capturedEntities = entities;
    return <div data-testid="spatial-viewport">{children}</div>;
  },
}));

vi.mock('../entity/SectorPointCloud', () => ({
  SectorPointCloud: ({
    onHydratedSummariesChange,
  }: {
    onHydratedSummariesChange?: (summaries: readonly SystemSummaryNode[]) => void;
  }) => {
    triggerHydration = onHydratedSummariesChange;
    return <div data-testid="sector-point-cloud" />;
  },
}));

import { GalaxyScene, GALAXY_SCENE_MAX_STREAMED_ENTITIES } from './GalaxyScene';

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

  it('exports 1.5x expanded GALAXY_SCENE_MAX_STREAMED_ENTITIES = 1200', () => {
    expect(GALAXY_SCENE_MAX_STREAMED_ENTITIES).toBe(1200);
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
    const byId = new Map(capturedEntities.map((e) => [e.id, e]));
    expect(byId.get('wd-1')?.classification).toBe('white-dwarf');
    expect(byId.get('bd-1')?.classification).toBe('brown-dwarf');
    expect(byId.get('psr-1')?.classification).toBe('neutron-star');
    const exo = byId.get('exo-1');
    expect(exo?.classification).toBe('star');
    expect(exo?.planets).toHaveLength(2);
    expect(exo?.planets?.[0]?.classification).toBe('terrestrial');
    expect(exo?.planets?.[1]?.classification).toBe('super-earth');
  });

  it('stabilises entity references via WeakMap cache and activates fast-path when additionalEntities match by slug', () => {
    const summary = makeStreamedSummary('hip-8102', 'Tau Ceti', 3.156, 1.54, -1.003, 1, {
      planetCensus: ['terrestrial'],
    });

    const { rerender } = render(<GalaxyScene additionalEntities={[]} />);

    act(() => {
      triggerHydration?.([summary]);
    });

    const firstCapture = capturedEntities;
    const firstPlanets = capturedEntities[0]?.planets;

    // Rerender with additionalEntities matching by display name slug
    const matchingEntity: SpatialEntityDefinition = {
      id: 'tau-ceti-slug',
      name: 'Tau Ceti',
      classification: 'star',
      position: [3.156, 1.54, -1.003],
    };

    rerender(<GalaxyScene additionalEntities={[matchingEntity]} />);

    // Fast-path should return the exact same streamedEntities reference!
    expect(capturedEntities).toBe(firstCapture);
    expect(capturedEntities[0]?.planets).toBe(firstPlanets);
  });

  it('coalesces hydration state updates and skips re-render when summary IDs and focus point are unchanged', () => {
    const summary = makeStreamedSummary('hip-8102', 'Tau Ceti', 3.156, 1.54, -1.003, 1);
    render(<GalaxyScene additionalEntities={[]} />);

    act(() => {
      triggerHydration?.([summary]);
    });
    const firstCapture = capturedEntities;

    // Re-trigger with new array containing identical summary ID
    act(() => {
      triggerHydration?.([{ ...summary }]);
    });

    expect(capturedEntities).toBe(firstCapture);
  });
});
