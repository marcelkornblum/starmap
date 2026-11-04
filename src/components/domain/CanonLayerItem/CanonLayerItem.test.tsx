// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CanonLayerItem } from './CanonLayerItem';
import type { FocusedCanonAnnotation } from '../../../services/details/types';

const mockAnnotation: FocusedCanonAnnotation = {
  layerId: 'hard-scifi',
  layerTitle: 'Hard Sci-Fi Canon',
  layerHref: '/galaxy?select=layer:hard-scifi&layer=hard-scifi',
  href: '/galaxy?focus=tau-ceti&select=layer:hard-scifi&layer=hard-scifi:tau-ceti',
  kind: 'fictional-canon',
  targetId: 'tau-ceti',
  targetType: 'system',
  inUniverseName: 'Tau Ceti Prime',
  workTitle: 'Project Hail Mary',
  subtitle: 'Project Hail Mary (Andy Weir)',
  text: 'Destination star system of the Hail Mary mission.',
};

describe('<CanonLayerItem />', () => {
  it('renders li element by default with link, subtitle, and layer badge', () => {
    render(<CanonLayerItem annotation={mockAnnotation} />);

    const item = screen.getByTestId('details-canon-item');
    expect(item.tagName.toLowerCase()).toBe('li');
    expect(item.getAttribute('data-layer-id')).toBe('hard-scifi');
    expect(item.getAttribute('data-layer-kind')).toBe('fictional-canon');

    const link = screen.getByTestId('details-canon-item-link');
    expect(link.getAttribute('href')).toContain('/galaxy?focus=tau-ceti');

    expect(screen.getByTestId('details-canon-item-title').textContent).toBe('Tau Ceti Prime');
    expect(screen.getByTestId('details-canon-item-subtitle').textContent).toBe('Project Hail Mary (Andy Weir)');

    const badgeLink = screen.getByTestId('details-canon-link');
    expect(badgeLink.textContent).toContain('Hard Sci-Fi Canon');
  });

  it('renders div element when as="div" is specified, and fallback title without link', () => {
    const withoutLinkAnnotation: FocusedCanonAnnotation = {
      layerId: 'scientific-overlays',
      layerTitle: 'Scientific Overlays',
      kind: 'scientific-overlay',
      targetId: 'trappist-1',
      targetType: 'system',
      resolvedName: 'TRAPPIST-1 System',
      workTitle: 'NASA Exoplanet Archive',
      text: 'Ultra-cool red dwarf star with seven terrestrial planets.',
    };

    render(<CanonLayerItem annotation={withoutLinkAnnotation} as="div" />);

    const item = screen.getByTestId('details-canon-item');
    expect(item.tagName.toLowerCase()).toBe('div');
    expect(screen.queryByTestId('details-canon-item-link')).toBeNull();
    expect(screen.getByTestId('details-canon-item-title').textContent).toBe('TRAPPIST-1 System');
  });
});
