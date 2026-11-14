import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { PlanetTypesListView } from './PlanetTypesListView';

describe('<PlanetTypesListView />', () => {
  it('renders root, breadcrumbs, section nav, heading, and all 4 planet type items', () => {
    render(<PlanetTypesListView />);

    const root = screen.getByTestId('planet-types-list-view-root');
    expect(root).toBeTruthy();

    const breadcrumbs = screen.getByTestId('view-breadcrumbs');
    expect(breadcrumbs).toBeTruthy();
    expect(breadcrumbs.textContent).toContain('Guide');
    expect(breadcrumbs.textContent).toContain('Planet Types');

    const sectionNav = screen.getByTestId('guide-section-nav');
    expect(sectionNav).toBeTruthy();

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.textContent).toBe('Planet Types');

    const list = screen.getByTestId('planet-types-guide-list');
    expect(list).toBeTruthy();

    const items = screen.getAllByTestId('planet-types-guide-item');
    expect(items.length).toBe(4);

    const terrestrialItem = items.find((item) => item.getAttribute('data-planet-type') === 'terrestrial');
    expect(terrestrialItem).toBeTruthy();
    if (terrestrialItem) {
      const link = within(terrestrialItem).getByTestId('planet-types-guide-link');
      expect(link.getAttribute('href')).toBe('/guide/planet-types/terrestrial');
      expect(link.textContent).toContain('Terrestrial Worlds');
      expect(link.textContent).toContain('Mass Range');

      const preview = within(terrestrialItem).getByTestId('guide-3d-preview');
      expect(preview.getAttribute('data-preview-kind')).toBe('planet');
    }
  });
});
