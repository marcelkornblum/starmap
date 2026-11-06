// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Cluster } from './Cluster';

describe('<Cluster />', () => {
  it('renders children within a default div container', () => {
    render(
      <Cluster data-testid="cluster-container">
        <button type="button">Action A</button>
        <button type="button">Action B</button>
      </Cluster>
    );

    const container = screen.getByTestId('cluster-container');
    expect(container).toBeDefined();
    expect(container.tagName.toLowerCase()).toBe('div');
    expect(screen.getByRole('button', { name: 'Action A' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Action B' })).toBeDefined();
  });

  it('sets default data-gap="default", data-align="center", and data-justify="start"', () => {
    render(<Cluster data-testid="cluster-container" />);

    const container = screen.getByTestId('cluster-container');
    expect(container.getAttribute('data-gap')).toBe('default');
    expect(container.getAttribute('data-align')).toBe('center');
    expect(container.getAttribute('data-justify')).toBe('start');
  });

  it('reflects custom gap prop on data-gap', () => {
    const { rerender } = render(<Cluster gap="none" data-testid="cluster-container" />);
    expect(screen.getByTestId('cluster-container').getAttribute('data-gap')).toBe('none');

    rerender(<Cluster gap="dense" data-testid="cluster-container" />);
    expect(screen.getByTestId('cluster-container').getAttribute('data-gap')).toBe('dense');

    rerender(<Cluster gap="loose" data-testid="cluster-container" />);
    expect(screen.getByTestId('cluster-container').getAttribute('data-gap')).toBe('loose');

    rerender(<Cluster gap="fib-2" data-testid="cluster-container" />);
    expect(screen.getByTestId('cluster-container').getAttribute('data-gap')).toBe('fib-2');
  });

  it('reflects custom align prop on data-align', () => {
    const { rerender } = render(<Cluster align="start" data-testid="cluster-container" />);
    expect(screen.getByTestId('cluster-container').getAttribute('data-align')).toBe('start');

    rerender(<Cluster align="stretch" data-testid="cluster-container" />);
    expect(screen.getByTestId('cluster-container').getAttribute('data-align')).toBe('stretch');

    rerender(<Cluster align="baseline" data-testid="cluster-container" />);
    expect(screen.getByTestId('cluster-container').getAttribute('data-align')).toBe('baseline');
  });

  it('reflects custom justify prop on data-justify', () => {
    const { rerender } = render(<Cluster justify="between" data-testid="cluster-container" />);
    expect(screen.getByTestId('cluster-container').getAttribute('data-justify')).toBe('between');

    rerender(<Cluster justify="center" data-testid="cluster-container" />);
    expect(screen.getByTestId('cluster-container').getAttribute('data-justify')).toBe('center');

    rerender(<Cluster justify="end" data-testid="cluster-container" />);
    expect(screen.getByTestId('cluster-container').getAttribute('data-justify')).toBe('end');

    rerender(<Cluster justify="evenly" data-testid="cluster-container" />);
    expect(screen.getByTestId('cluster-container').getAttribute('data-justify')).toBe('evenly');
  });

  it('renders custom HTML elements via polymorphic as prop', () => {
    const { rerender } = render(<Cluster as="nav" data-testid="cluster-container" />);
    expect(screen.getByTestId('cluster-container').tagName.toLowerCase()).toBe('nav');

    rerender(<Cluster as="header" data-testid="cluster-container" />);
    expect(screen.getByTestId('cluster-container').tagName.toLowerCase()).toBe('header');
  });

  it('forwards HTML and accessibility attributes', () => {
    render(
      <Cluster
        role="toolbar"
        aria-label="Viewport Controls"
        data-testid="cluster-container"
      />
    );

    const container = screen.getByTestId('cluster-container');
    expect(container.getAttribute('role')).toBe('toolbar');
    expect(container.getAttribute('aria-label')).toBe('Viewport Controls');
  });

  it('merges custom className with scoped module class', () => {
    render(<Cluster className="custom-cluster" data-testid="cluster-container" />);

    const container = screen.getByTestId('cluster-container');
    expect(container.className).toContain('custom-cluster');
  });
});
