// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SearchPanel } from './SearchPanel';

describe('<SearchPanel />', () => {
  it('renders search panel with visuallyHidden heading and search form', () => {
    render(<SearchPanel scope="search" />);

    const panel = screen.getByTestId('search-panel');
    expect(panel).toBeDefined();
    expect(panel.getAttribute('data-scope')).toBe('search');

    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading.textContent).toBe('Search');
    expect(heading.getAttribute('data-visually-hidden')).toBe('true');

    expect(screen.getByRole('search')).toBeDefined();
    expect(screen.getByTestId('search-expanded-drawer')).toBeDefined();
  });
});
