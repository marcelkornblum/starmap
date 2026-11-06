// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Grid } from './Grid';

describe('<Grid />', () => {
  it('renders children within a default div container', () => {
    render(
      <Grid data-testid="grid-container">
        <div>Card 1</div>
        <div>Card 2</div>
      </Grid>
    );

    const container = screen.getByTestId('grid-container');
    expect(container).toBeDefined();
    expect(container.tagName.toLowerCase()).toBe('div');
    expect(screen.getByText('Card 1')).toBeDefined();
    expect(screen.getByText('Card 2')).toBeDefined();
  });

  it('sets default data-min="md" and data-gap="default"', () => {
    render(<Grid data-testid="grid-container" />);

    const container = screen.getByTestId('grid-container');
    expect(container.getAttribute('data-min')).toBe('md');
    expect(container.getAttribute('data-gap')).toBe('default');
  });

  it('reflects custom minWidth prop on data-min', () => {
    const { rerender } = render(<Grid minWidth="xs" data-testid="grid-container" />);
    expect(screen.getByTestId('grid-container').getAttribute('data-min')).toBe('xs');

    rerender(<Grid minWidth="sm" data-testid="grid-container" />);
    expect(screen.getByTestId('grid-container').getAttribute('data-min')).toBe('sm');

    rerender(<Grid minWidth="lg" data-testid="grid-container" />);
    expect(screen.getByTestId('grid-container').getAttribute('data-min')).toBe('lg');

    rerender(<Grid minWidth="xl" data-testid="grid-container" />);
    expect(screen.getByTestId('grid-container').getAttribute('data-min')).toBe('xl');
  });

  it('reflects custom gap prop on data-gap', () => {
    const { rerender } = render(<Grid gap="none" data-testid="grid-container" />);
    expect(screen.getByTestId('grid-container').getAttribute('data-gap')).toBe('none');

    rerender(<Grid gap="tight" data-testid="grid-container" />);
    expect(screen.getByTestId('grid-container').getAttribute('data-gap')).toBe('tight');

    rerender(<Grid gap="loose" data-testid="grid-container" />);
    expect(screen.getByTestId('grid-container').getAttribute('data-gap')).toBe('loose');

    rerender(<Grid gap="fib-4" data-testid="grid-container" />);
    expect(screen.getByTestId('grid-container').getAttribute('data-gap')).toBe('fib-4');
  });

  it('renders custom HTML elements via polymorphic as prop', () => {
    const { rerender } = render(<Grid as="ul" data-testid="grid-container" />);
    expect(screen.getByTestId('grid-container').tagName.toLowerCase()).toBe('ul');

    rerender(<Grid as="section" data-testid="grid-container" />);
    expect(screen.getByTestId('grid-container').tagName.toLowerCase()).toBe('section');
  });

  it('forwards HTML and accessibility attributes', () => {
    render(
      <Grid
        role="list"
        aria-label="Catalogue Grid"
        data-testid="grid-container"
      />
    );

    const container = screen.getByTestId('grid-container');
    expect(container.getAttribute('role')).toBe('list');
    expect(container.getAttribute('aria-label')).toBe('Catalogue Grid');
  });

  it('merges custom className with scoped module class', () => {
    render(<Grid className="custom-grid" data-testid="grid-container" />);

    const container = screen.getByTestId('grid-container');
    expect(container.className).toContain('custom-grid');
  });
});
