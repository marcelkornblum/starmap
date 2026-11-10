// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Stack } from './Stack';

describe('<Stack />', () => {
  it('renders children within a default div container', () => {
    render(
      <Stack data-testid="stack-container">
        <span>Child 1</span>
        <span>Child 2</span>
      </Stack>
    );

    const container = screen.getByTestId('stack-container');
    expect(container).toBeDefined();
    expect(container.tagName.toLowerCase()).toBe('div');
    expect(screen.getByText('Child 1')).toBeDefined();
    expect(screen.getByText('Child 2')).toBeDefined();
  });

  it('sets default data-gap="default" and data-align="stretch"', () => {
    render(<Stack data-testid="stack-container" />);

    const container = screen.getByTestId('stack-container');
    expect(container.getAttribute('data-gap')).toBe('default');
    expect(container.getAttribute('data-align')).toBe('stretch');
  });

  it('reflects custom gap prop on data-gap', () => {
    const { rerender } = render(<Stack gap="none" data-testid="stack-container" />);
    expect(screen.getByTestId('stack-container').getAttribute('data-gap')).toBe('none');

    rerender(<Stack gap="dense" data-testid="stack-container" />);
    expect(screen.getByTestId('stack-container').getAttribute('data-gap')).toBe('dense');

    rerender(<Stack gap="tight" data-testid="stack-container" />);
    expect(screen.getByTestId('stack-container').getAttribute('data-gap')).toBe('tight');

    rerender(<Stack gap="loose" data-testid="stack-container" />);
    expect(screen.getByTestId('stack-container').getAttribute('data-gap')).toBe('loose');

    rerender(<Stack gap="section" data-testid="stack-container" />);
    expect(screen.getByTestId('stack-container').getAttribute('data-gap')).toBe('section');

    rerender(<Stack gap="fib-3" data-testid="stack-container" />);
    expect(screen.getByTestId('stack-container').getAttribute('data-gap')).toBe('fib-3');
  });

  it('reflects custom align prop on data-align', () => {
    const { rerender } = render(<Stack align="start" data-testid="stack-container" />);
    expect(screen.getByTestId('stack-container').getAttribute('data-align')).toBe('start');

    rerender(<Stack align="center" data-testid="stack-container" />);
    expect(screen.getByTestId('stack-container').getAttribute('data-align')).toBe('center');

    rerender(<Stack align="end" data-testid="stack-container" />);
    expect(screen.getByTestId('stack-container').getAttribute('data-align')).toBe('end');

    rerender(<Stack align="baseline" data-testid="stack-container" />);
    expect(screen.getByTestId('stack-container').getAttribute('data-align')).toBe('baseline');
  });

  it('renders custom HTML elements via the polymorphic as prop', () => {
    const { rerender } = render(<Stack as="section" data-testid="stack-container" />);
    expect(screen.getByTestId('stack-container').tagName.toLowerCase()).toBe('section');

    rerender(<Stack as="ul" data-testid="stack-container" />);
    expect(screen.getByTestId('stack-container').tagName.toLowerCase()).toBe('ul');

    rerender(<Stack as="nav" data-testid="stack-container" />);
    expect(screen.getByTestId('stack-container').tagName.toLowerCase()).toBe('nav');
  });

  it('forwards HTML and accessibility attributes', () => {
    render(
      <Stack
        role="region"
        aria-label="Telemetry Panel"
        data-testid="stack-container"
      />
    );

    const container = screen.getByTestId('stack-container');
    expect(container.getAttribute('role')).toBe('region');
    expect(container.getAttribute('aria-label')).toBe('Telemetry Panel');
  });

  it('binds scoped module class statically without custom className per DEC-R050', () => {
    render(<Stack data-testid="stack-container" />);

    const container = screen.getByTestId('stack-container');
    expect(container.className).toBeTruthy();
  });
});
