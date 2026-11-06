// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LayerCard } from './LayerCard';
import type {
  ActiveLayerOverviewCardModel,
  ActiveLayerItemCardModel,
} from '../../../services/layerCardService';

const mockOverviewCard: ActiveLayerOverviewCardModel = {
  mode: 'overview',
  layerId: 'hard-scifi',
  layerSlug: 'hard-scifi',
  title: 'Hard Sci-Fi Canon',
  subtitle: 'Hard science fiction celestial references',
  kind: 'fictional-canon',
  kindLabel: 'Fictional Canon',
  description: 'A curated overlay of worlds and systems from hard science fiction works.',
  itemCount: 12,
  source: {
    creator: 'Andy Weir',
    summary: 'Project Source',
    url: 'https://example.com/source',
  },
  closeHref: '/galaxy',
  startHref: '/galaxy?focus=tau-ceti&layer=hard-scifi:tau-ceti',
  firstItemTitle: 'Tau Ceti',
};

const mockItemCard: ActiveLayerItemCardModel = {
  mode: 'item',
  layerId: 'hard-scifi',
  layerSlug: 'hard-scifi',
  layerTitle: 'Hard Sci-Fi Canon',
  kind: 'fictional-canon',
  kindLabel: 'Fictional Canon',
  itemSlug: 'tau-ceti',
  itemTitle: 'Tau Ceti',
  subtitle: 'Project Hail Mary (Andy Weir)',
  text: 'Destination star system of the Hail Mary mission to synthesize Taumoeba.',
  stepIndex: 1,
  totalItems: 12,
  confidence: 'confirmed',
  closeHref: '/galaxy',
  overviewHref: '/galaxy?layer=hard-scifi',
  prevHref: '/galaxy?layer=hard-scifi:sol',
  prevLabel: 'Sol',
  nextHref: '/galaxy?layer=hard-scifi:alpha-centauri',
  nextLabel: 'Alpha Centauri',
};

describe('<LayerCard />', () => {
  it('returns null when card is null', () => {
    const { container } = render(<LayerCard card={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders overview mode with description, count, and start action', () => {
    render(<LayerCard card={mockOverviewCard} />);

    const card = screen.getByTestId('layer-card');
    expect(card.getAttribute('data-card-mode')).toBe('overview');
    expect(card.getAttribute('data-layer-id')).toBe('hard-scifi');

    expect(screen.getByTestId('layer-card-title').textContent).toBe('Hard Sci-Fi Canon');
    expect(screen.getByTestId('layer-card-kind').textContent).toBe('Fictional Canon');
    expect(screen.getByTestId('layer-card-count')).toBeDefined();
    expect(screen.getByTestId('layer-card-source').getAttribute('href')).toBe('https://example.com/source');
    expect(screen.getByTestId('layer-card-start').textContent).toContain('Explore: Tau Ceti');
  });

  it('renders item mode with step counter, text, confidence, and navigation', () => {
    render(<LayerCard card={mockItemCard} />);

    const card = screen.getByTestId('layer-card');
    expect(card.getAttribute('data-card-mode')).toBe('item');

    expect(screen.getByTestId('layer-card-overview-link').textContent).toBe('Hard Sci-Fi Canon');
    expect(screen.getByTestId('layer-card-step')).toBeDefined();
    expect(screen.getByTestId('layer-card-text').textContent).toContain('Destination star system');
    expect(screen.getByTestId('layer-card-confidence')).toBeDefined();

    expect(screen.getByTestId('layer-card-prev').textContent).toContain('Sol');
    expect(screen.getByTestId('layer-card-next').textContent).toContain('Alpha Centauri');
  });
});
