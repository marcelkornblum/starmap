import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { PlanetView } from './PlanetView';
import { SpatialEntityProvider } from '../components/canvas/entity/SpatialEntityProvider';
import {
  clearDetailsRepositoryCache,
  seedDetailRecord,
  seedSummaryNode,
} from '../data/detailsRepository';
import type { SystemManifest, SystemSummaryNode } from '../types/astro';
import type { CompactSearchEntry } from '../utils/compactDataCodec';

const SOL_FIXTURE: SystemManifest = {
  id: 'sol',
  name: 'Sol',
  x: 0,
  y: 0,
  z: 0,
  dist: 0,
  sectorId: 'sector_0_0_0',
  stars: [
    {
      id: 'sol-star',
      name: 'Sol',
      componentDesignation: 'A',
      spectralType: 'G2V',
      mag: -26.7,
      absmag: 4.83,
    },
  ],
  planets: [
    {
      id: 'earth',
      name: 'Earth',
      letter: 'd',
      composition: 'terrestrial',
      satellites: [
        {
          id: 'moon',
          name: 'Moon',
          parentId: 'earth',
          radiusEarth: 0.27,
          massEarth: 0.012,
          orbit: {
            semiMajorAxis: 0.00257,
            eccentricity: 0.0549,
            inclination: 5.145,
            ascendingNode: 125.08,
            argumentOfPeriapsis: 318.15,
            meanAnomaly: 115.36,
            periodDays: 27.32,
          },
        },
      ],
    },
  ],
};

const SOL_SUMMARY: SystemSummaryNode = {
  id: 'sol',
  name: 'Sol',
  x: 0,
  y: 0,
  z: 0,
  dist: 0,
  mag: -26.7,
  absmag: 4.83,
  spect: 'G2V',
  starCount: 1,
  planetCount: 1,
  hasHabitableCandidate: true,
  sectorId: 'sector_0_0_0',
};

const corpus: CompactSearchEntry[] = [
  { i: 'earth', n: 'Earth', s: 'sol', p: [0, 0, 0] },
  { i: 'moon', n: 'Moon', s: 'sol', o: 'earth', p: [0, 0, 0] },
  { i: 'mars', n: 'Mars', s: 'sol', p: [1.5, 0, 0] },
];

describe('<PlanetView />', () => {
  beforeEach(() => {
    clearDetailsRepositoryCache();
    seedDetailRecord('sol', { kind: 'system', record: SOL_FIXTURE });
    seedSummaryNode('sol', SOL_SUMMARY);
    seedDetailRecord('earth', { kind: 'system', record: SOL_FIXTURE });
  });

  it('renders planet spatial shell, breadcrumbs, search, control bar, and canvas layer', async () => {
    await act(async () => {
      render(
        <SpatialEntityProvider>
          <PlanetView
            planetId="earth"
            initialCorpus={corpus}
            locationPathname="/planet/earth"
            locationSearch=""
          />
        </SpatialEntityProvider>,
      );
    });

    expect(screen.getByTestId('planet-view-root')).toBeInTheDocument();
    expect(screen.getByTestId('view-breadcrumbs')).toBeInTheDocument();
    expect(screen.getByTestId('view-breadcrumbs').textContent).toContain('Galaxy');
    expect(screen.getByTestId('view-breadcrumbs').textContent).toContain('Earth');
    expect(screen.getByTestId('search-root')).toBeInTheDocument();
    expect(screen.getByTestId('control-bar')).toBeInTheDocument();
    const canvas = screen.getByTestId('canvas-layer');
    expect(canvas.getAttribute('data-scope')).toBe('planet');
  });

  it('renders details panel when satellite is focused and cached in planet scope', async () => {
    await act(async () => {
      render(
        <SpatialEntityProvider>
          <PlanetView
            planetId="earth"
            initialCorpus={corpus}
            locationPathname="/planet/earth"
            locationSearch="?focus=moon"
          />
        </SpatialEntityProvider>,
      );
    });

    expect(screen.getByTestId('planet-view-root')).toBeInTheDocument();
    expect(screen.getByTestId('details-panel')).toBeInTheDocument();
  });

  it('renders directions panel when route query is provided', async () => {
    await act(async () => {
      render(
        <SpatialEntityProvider>
          <PlanetView
            planetId="earth"
            initialCorpus={corpus}
            locationPathname="/planet/earth"
            locationSearch="?route=earth,mars"
          />
        </SpatialEntityProvider>,
      );
    });

    expect(screen.getByTestId('directions-panel')).toBeInTheDocument();
  });
});
