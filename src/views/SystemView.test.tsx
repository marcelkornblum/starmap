import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { SystemView } from './SystemView';

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
  { i: 'sol', n: 'Sol', p: [0, 0, 0] },
  { i: 'earth', n: 'Earth', s: 'sol', p: [0, 0, 0] },
  { i: 'alpha-centauri', n: 'Alpha Centauri', p: [1.3, 0, 0] },
];

describe('<SystemView />', () => {
  beforeEach(() => {
    clearDetailsRepositoryCache();
    seedDetailRecord('sol', { kind: 'system', record: SOL_FIXTURE });
    seedSummaryNode('sol', SOL_SUMMARY);
    seedDetailRecord('earth', { kind: 'system', record: SOL_FIXTURE });
  });

  it('renders system spatial shell, console dock, breadcrumbs, visor scale pill, search, and canvas layer without control bar', async () => {
    await act(async () => {
      render(
        <SpatialEntityProvider>
          <SystemView
            systemId="sol"
            initialCorpus={corpus}
            locationPathname="/system/sol"
            locationSearch=""
          />
        </SpatialEntityProvider>,
      );
    });

    expect(screen.getByTestId('system-view-root')).toBeInTheDocument();
    expect(screen.getByTestId('console-dock')).toBeInTheDocument();
    expect(screen.getByTestId('view-breadcrumbs')).toBeInTheDocument();
    expect(screen.getByTestId('view-breadcrumbs').textContent).toContain('Galaxy');
    expect(screen.getByTestId('view-breadcrumbs').textContent).toContain('Sol');
    expect(screen.getByTestId('visor-scale-pill')).toBeInTheDocument();
    expect(screen.getByTestId('search-root')).toBeInTheDocument();
    expect(screen.queryByTestId('control-bar')).toBeNull();
    const canvas = screen.getByTestId('canvas-layer');
    expect(canvas.getAttribute('data-scope')).toBe('system');
  });

  it('renders details panel when entity is focused and cached in system', async () => {
    await act(async () => {
      render(
        <SpatialEntityProvider>
          <SystemView
            systemId="sol"
            initialCorpus={corpus}
            locationPathname="/system/sol"
            locationSearch="?focus=earth"
          />
        </SpatialEntityProvider>,
      );
    });

    expect(screen.getByTestId('system-view-root')).toBeInTheDocument();
    expect(screen.getByTestId('details-panel')).toBeInTheDocument();
  });

  it('renders directions panel when route query is provided', async () => {
    await act(async () => {
      render(
        <SpatialEntityProvider>
          <SystemView
            systemId="sol"
            initialCorpus={corpus}
            locationPathname="/system/sol"
            locationSearch="?route=sol,alpha-centauri"
          />
        </SpatialEntityProvider>,
      );
    });

    expect(screen.getByTestId('directions-panel')).toBeInTheDocument();
  });

  it('enables Objects in View toggle when system bodies are active and disables it when empty', async () => {
    const { rerender } = await act(async () =>
      render(
        <SpatialEntityProvider>
          <SystemView
            systemId="sol"
            initialCorpus={corpus}
            locationPathname="/system/sol"
            locationSearch=""
          />
        </SpatialEntityProvider>,
      ),
    );

    expect(screen.getByTestId('spatial-shell-bodies-toggle')).toBeEnabled();

    await act(async () => {
      rerender(
        <SpatialEntityProvider>
          <SystemView
            systemId="unseeded-system"
            initialCorpus={[]}
            locationPathname="/system/unseeded-system"
            locationSearch=""
          />
        </SpatialEntityProvider>,
      );
    });

    expect(screen.getByTestId('spatial-shell-bodies-toggle')).toBeDisabled();
  });
});
