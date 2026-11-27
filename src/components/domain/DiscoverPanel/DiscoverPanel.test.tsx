import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import type { DatasetLayerIndexEntry } from '../../../types/datasetLayers';
import { useLayerStore } from '../../../stores/useLayerStore';
import { DiscoverPanel } from './DiscoverPanel';

const SAMPLE_LAYERS: readonly DatasetLayerIndexEntry[] = [
  {
    layerId: 'overlay-recent-discoveries',
    title: 'Recent Discoveries',
    kind: 'scientific-overlay',
    description: 'Newly confirmed nearby exoplanets within 100 parsecs.',
    source: {
      summary: 'NASA Exoplanet Archive',
      creator: 'NASA Exoplanet Science Institute',
    },
    entryCount: 4,
    path: '/data/overlays/layers/overlay-recent-discoveries.json',
  },
  {
    layerId: 'overlay-jwst-targets',
    title: 'JWST Targets',
    kind: 'scientific-overlay',
    description: 'Atmospheric spectroscopy targets observed by James Webb.',
    entryCount: 1,
    path: '/data/overlays/layers/overlay-jwst-targets.json',
  },
  {
    layerId: 'canon-project-hail-mary',
    title: 'Project Hail Mary',
    kind: 'fictional-canon',
    description: 'Interstellar journey to save Earth from Astrophage.',
    source: {
      summary: 'Novel',
      creator: 'Andy Weir',
    },
    entryCount: 2,
    path: '/data/overlays/layers/canon-project-hail-mary.json',
  },
  {
    layerId: 'canon-three-body',
    title: 'Remembrance of Earth’s Past',
    kind: 'fictional-canon',
    description: 'First contact and dark forest deterrence.',
    source: {
      summary: 'Novel Trilogy',
      creator: 'Cixin Liu',
    },
    entryCount: 3,
    path: '/data/overlays/layers/canon-three-body.json',
  },
];

const CUSTOM_LAYER: DatasetLayerIndexEntry = {
  layerId: 'custom-field-notes',
  title: 'Field Notes',
  kind: 'custom-user',
  description: 'Personal survey route bookmarks.',
  entryCount: 5,
  path: '/data/overlays/layers/custom-field-notes.json',
};

describe('<DiscoverPanel />', () => {
  beforeEach(() => {
    useLayerStore.setState({ index: [] });
  });

  it('renders heading, search filter, and groups scientific highlights and fictional universes', () => {
    render(<DiscoverPanel layers={SAMPLE_LAYERS} />);

    expect(screen.getByTestId('discover-panel')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Discover' })).toBeInTheDocument();
    expect(screen.getByTestId('discover-filter-input')).toBeInTheDocument();

    const sciGroup = screen.getByTestId('discover-scientific-group');
    expect(within(sciGroup).getByText('Recent Discoveries')).toBeInTheDocument();
    expect(within(sciGroup).getByText('JWST Targets')).toBeInTheDocument();
    expect(within(sciGroup).queryByText('Project Hail Mary')).not.toBeInTheDocument();

    const canonGroup = screen.getByTestId('discover-canon-group');
    expect(within(canonGroup).getByText('Project Hail Mary')).toBeInTheDocument();
    expect(within(canonGroup).getByText('Remembrance of Earth’s Past')).toBeInTheDocument();
    expect(within(canonGroup).queryByText('Recent Discoveries')).not.toBeInTheDocument();

    expect(screen.queryByTestId('discover-custom-group')).not.toBeInTheDocument();
  });

  it('renders Saved Collections group when custom-user layers are present', () => {
    render(<DiscoverPanel layers={[...SAMPLE_LAYERS, CUSTOM_LAYER]} />);

    const customGroup = screen.getByTestId('discover-custom-group');
    expect(within(customGroup).getByText('Field Notes')).toBeInTheDocument();
    expect(within(customGroup).getByText('5')).toBeInTheDocument();
    expect(within(customGroup).getByText('stops')).toBeInTheDocument();
  });

  it('reads layers from useLayerIndex() when layers prop is omitted', () => {
    useLayerStore.setState({ index: SAMPLE_LAYERS });

    render(<DiscoverPanel />);

    expect(screen.getByText('Recent Discoveries')).toBeInTheDocument();
    expect(screen.getByText('Project Hail Mary')).toBeInTheDocument();
  });

  it('displays title, optional creator, singular/plural stop quantity, description, and canonical hrefs', () => {
    render(<DiscoverPanel layers={SAMPLE_LAYERS} activeLayerSlug="project-hail-mary" />);

    const items = screen.getAllByTestId('discover-layer-item');
    expect(items).toHaveLength(4);

    const recentItem = items[0];
    expect(recentItem.getAttribute('data-layer-slug')).toBe('recent-discoveries');
    expect(recentItem.getAttribute('data-selected')).toBeNull();
    expect(within(recentItem).getByText('NASA Exoplanet Science Institute')).toBeInTheDocument();
    expect(within(recentItem).getByText('4')).toBeInTheDocument();
    expect(within(recentItem).getByText('stops')).toBeInTheDocument();
    expect(within(recentItem).getByText('Newly confirmed nearby exoplanets within 100 parsecs.')).toBeInTheDocument();

    const jwstItem = items[1];
    expect(within(jwstItem).getByText('1')).toBeInTheDocument();
    expect(within(jwstItem).getByText('stop')).toBeInTheDocument();

    const phmItem = items[2];
    expect(phmItem.getAttribute('data-layer-slug')).toBe('project-hail-mary');
    expect(phmItem.getAttribute('data-selected')).toBe('true');

    const links = screen.getAllByTestId('discover-layer-link');
    expect(links[0].getAttribute('href')).toBe(
      '/galaxy?select=layer:recent-discoveries&layer=recent-discoveries',
    );
    expect(links[2].getAttribute('href')).toBe(
      '/galaxy?select=layer:project-hail-mary&layer=project-hail-mary',
    );
  });

  it('filters case-insensitively across title, description, and source creator', () => {
    render(<DiscoverPanel layers={SAMPLE_LAYERS} />);

    const input = screen.getByTestId('discover-filter-input');

    // Match by creator
    fireEvent.change(input, { target: { value: 'andy weir' } });
    expect(screen.getAllByTestId('discover-layer-item')).toHaveLength(1);
    expect(screen.getByText('Project Hail Mary')).toBeInTheDocument();
    expect(screen.queryByTestId('discover-scientific-group')).not.toBeInTheDocument();

    // Match by description
    fireEvent.change(input, { target: { value: 'SPECTROSCOPY' } });
    expect(screen.getAllByTestId('discover-layer-item')).toHaveLength(1);
    expect(screen.getByText('JWST Targets')).toBeInTheDocument();

    // No matches
    fireEvent.change(input, { target: { value: 'nonexistent-xyz' } });
    expect(screen.queryAllByTestId('discover-layer-item')).toHaveLength(0);
    expect(screen.getByTestId('discover-empty')).toBeInTheDocument();
  });

  it('calls onSelectLayer on link click and onClose on close button click', () => {
    const onSelectLayer = vi.fn();
    const onClose = vi.fn();

    render(
      <DiscoverPanel
        layers={SAMPLE_LAYERS}
        onSelectLayer={onSelectLayer}
        onClose={onClose}
      />,
    );

    const links = screen.getAllByTestId('discover-layer-link');
    fireEvent.click(links[2]);
    expect(onSelectLayer).toHaveBeenCalledTimes(1);
    expect(onSelectLayer).toHaveBeenCalledWith(
      'project-hail-mary',
      '/galaxy?select=layer:project-hail-mary&layer=project-hail-mary',
    );

    const closeBtn = screen.getByTestId('discover-close-button');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('omits close button when onClose is not provided', () => {
    render(<DiscoverPanel layers={SAMPLE_LAYERS} />);
    expect(screen.queryByTestId('discover-close-button')).not.toBeInTheDocument();
  });
});
