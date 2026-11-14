// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Cover } from './Cover';

describe('<Cover />', () => {
  it('renders children within principal container inside default div', () => {
    render(
      <Cover data-testid="cover-container">
        <span>Principal Content</span>
      </Cover>
    );

    const container = screen.getByTestId('cover-container');
    expect(container).toBeDefined();
    expect(container.tagName.toLowerCase()).toBe('div');

    const principal = container.querySelector('[data-principal="true"]');
    expect(principal).toBeDefined();
    expect(principal?.textContent).toBe('Principal Content');
  });

  it('sets default data-min-height="viewport" and data-gap="default"', () => {
    render(<Cover data-testid="cover-container" />);

    const container = screen.getByTestId('cover-container');
    expect(container.getAttribute('data-min-height')).toBe('viewport');
    expect(container.getAttribute('data-gap')).toBe('default');
  });

  it('reflects custom minHeight prop on data-min-height', () => {
    const { rerender } = render(<Cover minHeight="full" data-testid="cover-container" />);
    expect(screen.getByTestId('cover-container').getAttribute('data-min-height')).toBe('full');

    rerender(<Cover minHeight="viewport" data-testid="cover-container" />);
    expect(screen.getByTestId('cover-container').getAttribute('data-min-height')).toBe('viewport');
  });

  it('reflects custom gap prop on data-gap', () => {
    const { rerender } = render(<Cover gap="none" data-testid="cover-container" />);
    expect(screen.getByTestId('cover-container').getAttribute('data-gap')).toBe('none');

    rerender(<Cover gap="dense" data-testid="cover-container" />);
    expect(screen.getByTestId('cover-container').getAttribute('data-gap')).toBe('dense');

    rerender(<Cover gap="tight" data-testid="cover-container" />);
    expect(screen.getByTestId('cover-container').getAttribute('data-gap')).toBe('tight');

    rerender(<Cover gap="loose" data-testid="cover-container" />);
    expect(screen.getByTestId('cover-container').getAttribute('data-gap')).toBe('loose');

    rerender(<Cover gap="section" data-testid="cover-container" />);
    expect(screen.getByTestId('cover-container').getAttribute('data-gap')).toBe('section');

    rerender(<Cover gap="fib-5" data-testid="cover-container" />);
    expect(screen.getByTestId('cover-container').getAttribute('data-gap')).toBe('fib-5');
  });

  it('renders optional header and footer slots when provided', () => {
    const { rerender } = render(
      <Cover
        data-testid="cover-container"
        header={<header data-testid="cover-header">Cover Header</header>}
        footer={<footer data-testid="cover-footer">Cover Footer</footer>}
      >
        <span>Main Body</span>
      </Cover>
    );

    expect(screen.getByTestId('cover-header')).toBeDefined();
    expect(screen.getByTestId('cover-footer')).toBeDefined();
    expect(screen.getByText('Main Body')).toBeDefined();

    rerender(
      <Cover data-testid="cover-container">
        <span>Only Main Body</span>
      </Cover>
    );

    expect(screen.queryByTestId('cover-header')).toBeNull();
    expect(screen.queryByTestId('cover-footer')).toBeNull();
  });

  it('renders custom HTML elements via polymorphic as prop', () => {
    const { rerender } = render(<Cover as="section" data-testid="cover-container" />);
    expect(screen.getByTestId('cover-container').tagName.toLowerCase()).toBe('section');

    rerender(<Cover as="main" data-testid="cover-container" />);
    expect(screen.getByTestId('cover-container').tagName.toLowerCase()).toBe('main');
  });

  it('forwards HTML and accessibility attributes', () => {
    render(
      <Cover
        role="region"
        aria-label="Mission Briefing Cover"
        data-testid="cover-container"
      />
    );

    const container = screen.getByTestId('cover-container');
    expect(container.getAttribute('role')).toBe('region');
    expect(container.getAttribute('aria-label')).toBe('Mission Briefing Cover');
  });

  it('binds scoped module class statically without custom className per DEC-R050', () => {
    render(<Cover data-testid="cover-container" />);

    const container = screen.getByTestId('cover-container');
    expect(container.className).toBeTruthy();
  });
});
