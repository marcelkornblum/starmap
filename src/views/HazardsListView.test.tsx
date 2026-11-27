import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { HazardsListView } from './HazardsListView';

describe('<HazardsListView />', () => {
  it('renders root, breadcrumbs, section nav, heading, and all 8 hazard items', () => {
    render(<HazardsListView />);

    const root = screen.getByTestId('hazards-list-view-root');
    expect(root).toBeTruthy();
    expect(root.tagName).toBe('MAIN');
    expect(root.getAttribute('data-mode')).toBe('document');

    expect(screen.getByTestId('console-dock')).toBeTruthy();
    expect(screen.getByTestId('console-dock-guide').getAttribute('data-active')).toBe('true');

    const breadcrumbs = screen.getByTestId('view-breadcrumbs');
    expect(breadcrumbs).toBeTruthy();
    expect(breadcrumbs.textContent).toContain('Guide');
    expect(breadcrumbs.textContent).toContain('Environmental Hazards');

    const sectionNav = screen.getByTestId('guide-section-nav');
    expect(sectionNav).toBeTruthy();

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.textContent).toBe('Environmental Hazards');

    const list = screen.getByTestId('hazards-guide-list');
    expect(list).toBeTruthy();

    const items = screen.getAllByTestId('hazards-guide-item');
    expect(items.length).toBe(8);

    const flareItem = items.find((item) => item.getAttribute('data-hazard-id') === 'flare-star');
    expect(flareItem).toBeTruthy();
    if (flareItem) {
      const link = within(flareItem).getByTestId('hazards-guide-link');
      expect(link.getAttribute('href')).toBe('/guide/hazards/flare-star');
      expect(link.textContent).toContain('Stellar flare activity');
      expect(link.textContent).toContain('Trigger Threshold');

      const preview = within(flareItem).getByTestId('guide-3d-preview');
      expect(preview.getAttribute('data-preview-kind')).toBe('hazard');
    }
  });
});
