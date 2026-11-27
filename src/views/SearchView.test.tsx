import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SearchView } from './SearchView';
import { SpatialEntityProvider } from '../components/canvas/entity/SpatialEntityProvider';

describe('<SearchView />', () => {
  it('renders search view root, breadcrumbs, and search panel with alwaysOpen results', () => {
    render(
      <SpatialEntityProvider>
        <SearchView />
      </SpatialEntityProvider>,
    );

    const root = screen.getByTestId('search-view-root');
    expect(root).toBeTruthy();
    expect(root.tagName).toBe('MAIN');
    expect(root.getAttribute('data-mode')).toBe('document');

    expect(screen.getByTestId('console-dock')).toBeTruthy();
    expect(screen.getByTestId('console-dock-map').getAttribute('data-active')).toBe('true');

    const breadcrumbs = screen.getByTestId('view-breadcrumbs');
    expect(breadcrumbs).toBeTruthy();
    expect(breadcrumbs.textContent).toContain('Galaxy');
    expect(breadcrumbs.textContent).toContain('Search');

    const searchRoot = screen.getByTestId('search-root');
    expect(searchRoot).toBeTruthy();

    const searchInput = screen.getByRole('searchbox');
    expect(searchInput).toBeTruthy();
  });
});
