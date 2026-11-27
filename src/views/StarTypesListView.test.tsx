import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { StarTypesListView } from './StarTypesListView';

describe('<StarTypesListView />', () => {
  it('renders root, breadcrumbs, section nav, heading, and all star type items', () => {
    render(<StarTypesListView />);

    const root = screen.getByTestId('star-types-list-view-root');
    expect(root).toBeTruthy();
    expect(root.tagName).toBe('MAIN');
    expect(root.getAttribute('data-mode')).toBe('document');

    expect(screen.getByTestId('console-dock')).toBeTruthy();
    expect(screen.getByTestId('console-dock-guide').getAttribute('data-active')).toBe('true');

    const breadcrumbs = screen.getByTestId('view-breadcrumbs');
    expect(breadcrumbs).toBeTruthy();
    expect(breadcrumbs.textContent).toContain('Guide');
    expect(breadcrumbs.textContent).toContain('Star Types');

    const sectionNav = screen.getByTestId('guide-section-nav');
    expect(sectionNav).toBeTruthy();

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.textContent).toBe('Star Types');

    const list = screen.getByTestId('star-types-guide-list');
    expect(list).toBeTruthy();

    const items = screen.getAllByTestId('star-types-guide-item');
    expect(items.length).toBe(9);

    const gItem = items.find((item) => item.getAttribute('data-star-type') === 'g');
    expect(gItem).toBeTruthy();
    if (gItem) {
      const link = within(gItem).getByTestId('star-types-guide-link');
      expect(link.getAttribute('href')).toBe('/guide/star-types/g');
      expect(link.textContent).toContain('G-Type Solar-Type Stars');
      expect(link.textContent).toContain('Effective Temp');

      const preview = within(gItem).getByTestId('guide-3d-preview');
      expect(preview.getAttribute('data-preview-kind')).toBe('star');
    }
  });
});
