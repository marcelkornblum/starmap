import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { GalaxyView } from './GalaxyView';

vi.mock('@tanstack/react-router', () => ({
  useParams: vi.fn(() => ({})),
  useSearch: vi.fn(() => ({})),
  useRouter: vi.fn(() => undefined),
}));
import { SpatialEntityProvider } from '../components/canvas/entity/SpatialEntityProvider';
import {
  clearDetailsRepositoryCache,
  seedDetailRecord,
  seedSummaryNode,
} from '../data/detailsRepository';
import type { SystemManifest, SystemSummaryNode } from '../types/astro';
import type { CompactSearchEntry } from '../utils/compactDataTypes';

const TAU_CETI_FIXTURE: SystemManifest = {
  id: 'gaia-2452378776434477184',
  name: 'Tau Ceti',
  x: 3.156,
  y: 1.54,
  z: -1.003,
  dist: 3.65,
  sectorId: 'sector_+000_+000_-025',
  stars: [
    {
      id: '2452378776434477184-A',
      name: 'Tau Ceti',
      componentDesignation: 'A',
      spectralType: 'G8V',
      mag: 3.5,
      absmag: 5.68,
      massMsun: 0.783,
      radiusRsun: 0.793,
      luminosityLsun: 0.52,
      effectiveTempK: 5344,
    },
  ],
  planets: [
    {
      id: 'tau-ceti-e',
      name: 'Tau Ceti e',
      letter: 'e',
      massMearth: 3.93,
      radiusRearth: 1.81,
      equilibriumTempK: 282,
      surfaceGravityG: 1.2,
      composition: 'super-earth',
      isHabitableCandidate: true,
      orbit: {
        semiMajorAxis: 0.538,
        periodDays: 162.87,
        eccentricity: 0.18,
        inclination: 0,
        ascendingNode: 0,
        argumentOfPeriapsis: 22.3,
        meanAnomaly: 0,
      },
    },
  ],
};

const TAU_CETI_SUMMARY: SystemSummaryNode = {
  id: 'tau-ceti',
  name: 'Tau Ceti',
  x: 3.156,
  y: 1.54,
  z: -1.003,
  dist: 3.65,
  mag: 3.5,
  absmag: 5.68,
  spect: 'G8V',
  starCount: 1,
  planetCount: 1,
  hasHabitableCandidate: true,
  sectorId: 'sector_+000_+000_-025',
};

const corpus: CompactSearchEntry[] = [
  { i: 'tau-ceti', n: 'Tau Ceti', p: [3.156, 1.54, -1.003] },
  { i: 'sol', n: 'Sol', p: [0, 0, 0] },
];

describe('<GalaxyView />', () => {
  beforeEach(() => {
    clearDetailsRepositoryCache();
  });

  it('renders spatial shell, console dock, breadcrumbs, visor scale pill, search, and canvas layer without control bar', async () => {
    await act(async () => {
      render(
        <SpatialEntityProvider>
          <GalaxyView
            initialCorpus={corpus}
            locationPathname="/galaxy"
            locationSearch=""
          />
        </SpatialEntityProvider>,
      );
    });

    expect(screen.getByTestId('galaxy-view-root')).toBeInTheDocument();
    expect(screen.getByTestId('console-dock')).toBeInTheDocument();
    expect(screen.getByTestId('view-breadcrumbs')).toBeInTheDocument();
    expect(screen.getByTestId('view-breadcrumbs').textContent).toContain('Galaxy');
    expect(screen.getByTestId('visor-scale-pill')).toBeInTheDocument();
    expect(screen.getByTestId('search-root')).toBeInTheDocument();
    expect(screen.queryByTestId('control-bar')).toBeNull();
    expect(screen.getByTestId('canvas-layer')).toBeInTheDocument();
  });

  it('renders details panel when entity is focused and cached', async () => {
    seedDetailRecord('tau-ceti', { kind: 'system', record: TAU_CETI_FIXTURE });
    seedSummaryNode('tau-ceti', TAU_CETI_SUMMARY);

    await act(async () => {
      render(
        <SpatialEntityProvider>
          <GalaxyView
            initialCorpus={corpus}
            locationPathname="/galaxy"
            locationSearch="?focus=tau-ceti"
          />
        </SpatialEntityProvider>,
      );
    });

    expect(screen.getByTestId('galaxy-view-root')).toBeInTheDocument();
    expect(screen.getByTestId('details-panel')).toBeInTheDocument();
  });

  it('renders directions panel when route query is provided', async () => {
    await act(async () => {
      render(
        <SpatialEntityProvider>
          <GalaxyView
            initialCorpus={corpus}
            locationPathname="/galaxy"
            locationSearch="?route=sol,tau-ceti"
          />
        </SpatialEntityProvider>,
      );
    });

    expect(screen.getByTestId('directions-panel')).toBeInTheDocument();
  });
});
