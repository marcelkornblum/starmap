import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { StarTypesListView } from './StarTypesListView';

describe('<StarTypesListView />', () => {
  it('renders root, active section nav without duplicate breadcrumbs, heading, and all star type items', () => {
    render(<StarTypesListView />);

    const root = screen.getByTestId('star-types-list-view-root');
    expect(root).toBeTruthy();
    expect(root.tagName).toBe('MAIN');
    expect(root.getAttribute('data-mode')).toBe('document');

    expect(screen.getByTestId('console-dock')).toBeTruthy();
    expect(screen.getByTestId('console-dock-guide').getAttribute('data-active')).toBe('true');

    expect(screen.queryByTestId('view-breadcrumbs')).toBeNull();

    const sectionNav = screen.getByTestId('guide-section-nav');
    expect(sectionNav).toBeTruthy();
    expect(within(sectionNav).getByRole('link', { name: 'Star Types' }).getAttribute('aria-current')).toBe('page');

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.textContent).toBe('Star Types');
    expect(heading).toHaveAttribute('data-visually-hidden', 'true');

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
