// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchRoot } from './SearchRoot';
import { SpatialEntityProvider } from '../../../canvas/entity/SpatialEntityProvider';
import { createSpatialEntityStore } from '../../../canvas/entity/SpatialEntityStore';

describe('<SearchRoot />', () => {
  it('renders children inside search-root container with focus attributes', () => {
    const store = createSpatialEntityStore();

    render(
      <SpatialEntityProvider store={store}>
        <SearchRoot syncUrl={false} initialCorpus={[]} initialQuery="">
          <input data-testid="dummy-input" />
        </SearchRoot>
      </SpatialEntityProvider>,
    );

    const root = screen.getByTestId('search-root');
    expect(root).toBeDefined();
    expect(root.getAttribute('data-search-focused')).toBe('false');

    const input = screen.getByTestId('dummy-input');
    fireEvent.focus(input);
    expect(root.getAttribute('data-search-focused')).toBe('true');
  });
});
