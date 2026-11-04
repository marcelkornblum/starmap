// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Reel } from './Reel';

describe('<Reel />', () => {
  it('renders children within a default div container', () => {
    render(
      <Reel data-testid="reel-container">
        <div>Item 1</div>
        <div>Item 2</div>
      </Reel>
    );

    const container = screen.getByTestId('reel-container');
    expect(container).toBeDefined();
    expect(container.tagName.toLowerCase()).toBe('div');
    expect(screen.getByText('Item 1')).toBeDefined();
    expect(screen.getByText('Item 2')).toBeDefined();
  });

  it('sets default data-item-width="md", data-gap="default", and data-snap="true"', () => {
    render(<Reel data-testid="reel-container" />);

    const container = screen.getByTestId('reel-container');
    expect(container.getAttribute('data-item-width')).toBe('md');
    expect(container.getAttribute('data-gap')).toBe('default');
    expect(container.getAttribute('data-snap')).toBe('true');
  });

  it('reflects snap prop on data-snap attribute', () => {
    const { rerender } = render(<Reel snap={false} data-testid="reel-container" />);
    expect(screen.getByTestId('reel-container').getAttribute('data-snap')).toBeNull();

    rerender(<Reel snap data-testid="reel-container" />);
    expect(screen.getByTestId('reel-container').getAttribute('data-snap')).toBe('true');
  });

  it('reflects custom itemWidth prop on data-item-width', () => {
    const { rerender } = render(<Reel itemWidth="sm" data-testid="reel-container" />);
    expect(screen.getByTestId('reel-container').getAttribute('data-item-width')).toBe('sm');

    rerender(<Reel itemWidth="lg" data-testid="reel-container" />);
    expect(screen.getByTestId('reel-container').getAttribute('data-item-width')).toBe('lg');

    rerender(<Reel itemWidth="md" data-testid="reel-container" />);
    expect(screen.getByTestId('reel-container').getAttribute('data-item-width')).toBe('md');
  });

  it('reflects custom gap prop on data-gap', () => {
    const { rerender } = render(<Reel gap="none" data-testid="reel-container" />);
    expect(screen.getByTestId('reel-container').getAttribute('data-gap')).toBe('none');

    rerender(<Reel gap="tight" data-testid="reel-container" />);
    expect(screen.getByTestId('reel-container').getAttribute('data-gap')).toBe('tight');

    rerender(<Reel gap="loose" data-testid="reel-container" />);
    expect(screen.getByTestId('reel-container').getAttribute('data-gap')).toBe('loose');
  });

  it('renders custom HTML elements via polymorphic as prop', () => {
    const { rerender } = render(<Reel as="section" data-testid="reel-container" />);
    expect(screen.getByTestId('reel-container').tagName.toLowerCase()).toBe('section');

    rerender(<Reel as="ul" data-testid="reel-container" />);
    expect(screen.getByTestId('reel-container').tagName.toLowerCase()).toBe('ul');
  });

  it('forwards HTML and accessibility attributes', () => {
    render(
      <Reel
        role="region"
        aria-label="Spectral Gallery"
        data-testid="reel-container"
      />
    );

    const container = screen.getByTestId('reel-container');
    expect(container.getAttribute('role')).toBe('region');
    expect(container.getAttribute('aria-label')).toBe('Spectral Gallery');
  });

  it('merges custom className with scoped module class', () => {
    render(<Reel className="custom-reel" data-testid="reel-container" />);

    const container = screen.getByTestId('reel-container');
    expect(container.className).toContain('custom-reel');
  });
});
