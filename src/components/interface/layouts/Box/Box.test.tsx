// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Box } from './Box';

describe('<Box />', () => {
  it('renders children within a default div container', () => {
    render(
      <Box data-testid="box-container">
        <span>Box content</span>
      </Box>
    );

    const container = screen.getByTestId('box-container');
    expect(container).toBeDefined();
    expect(container.tagName.toLowerCase()).toBe('div');
    expect(screen.getByText('Box content')).toBeDefined();
  });

  it('sets default data-padding="default", data-border="none", and omits data-background', () => {
    render(<Box data-testid="box-container" />);

    const container = screen.getByTestId('box-container');
    expect(container.getAttribute('data-padding')).toBe('default');
    expect(container.getAttribute('data-border')).toBe('none');
    expect(container.getAttribute('data-background')).toBeNull();
  });

  it('reflects custom padding prop on data-padding', () => {
    const { rerender } = render(<Box padding="none" data-testid="box-container" />);
    expect(screen.getByTestId('box-container').getAttribute('data-padding')).toBe('none');

    rerender(<Box padding="dense" data-testid="box-container" />);
    expect(screen.getByTestId('box-container').getAttribute('data-padding')).toBe('dense');

    rerender(<Box padding="tight" data-testid="box-container" />);
    expect(screen.getByTestId('box-container').getAttribute('data-padding')).toBe('tight');

    rerender(<Box padding="loose" data-testid="box-container" />);
    expect(screen.getByTestId('box-container').getAttribute('data-padding')).toBe('loose');

    rerender(<Box padding="section" data-testid="box-container" />);
    expect(screen.getByTestId('box-container').getAttribute('data-padding')).toBe('section');

    rerender(<Box padding="fib-5" data-testid="box-container" />);
    expect(screen.getByTestId('box-container').getAttribute('data-padding')).toBe('fib-5');
  });

  it('reflects custom border prop on data-border', () => {
    const { rerender } = render(<Box border="subtle" data-testid="box-container" />);
    expect(screen.getByTestId('box-container').getAttribute('data-border')).toBe('subtle');

    rerender(<Box border="default" data-testid="box-container" />);
    expect(screen.getByTestId('box-container').getAttribute('data-border')).toBe('default');

    rerender(<Box border="accent" data-testid="box-container" />);
    expect(screen.getByTestId('box-container').getAttribute('data-border')).toBe('accent');

    rerender(<Box border="none" data-testid="box-container" />);
    expect(screen.getByTestId('box-container').getAttribute('data-border')).toBe('none');
  });

  it('reflects custom background prop on data-background', () => {
    const { rerender } = render(<Box background="canvas" data-testid="box-container" />);
    expect(screen.getByTestId('box-container').getAttribute('data-background')).toBe('canvas');

    rerender(<Box background="sunken" data-testid="box-container" />);
    expect(screen.getByTestId('box-container').getAttribute('data-background')).toBe('sunken');

    rerender(<Box background="panel" data-testid="box-container" />);
    expect(screen.getByTestId('box-container').getAttribute('data-background')).toBe('panel');

    rerender(<Box background="dock" data-testid="box-container" />);
    expect(screen.getByTestId('box-container').getAttribute('data-background')).toBe('dock');

    rerender(<Box background="overlay" data-testid="box-container" />);
    expect(screen.getByTestId('box-container').getAttribute('data-background')).toBe('overlay');
  });

  it('renders custom HTML elements via polymorphic as prop', () => {
    const { rerender } = render(<Box as="section" data-testid="box-container" />);
    expect(screen.getByTestId('box-container').tagName.toLowerCase()).toBe('section');

    rerender(<Box as="aside" data-testid="box-container" />);
    expect(screen.getByTestId('box-container').tagName.toLowerCase()).toBe('aside');
  });

  it('forwards HTML and accessibility attributes', () => {
    render(
      <Box
        role="group"
        aria-label="Sensor Matrix Box"
        data-testid="box-container"
      />
    );

    const container = screen.getByTestId('box-container');
    expect(container.getAttribute('role')).toBe('group');
    expect(container.getAttribute('aria-label')).toBe('Sensor Matrix Box');
  });

  it('binds scoped module class statically without custom className per DEC-R050', () => {
    render(<Box data-testid="box-container" />);

    const container = screen.getByTestId('box-container');
    expect(container.className).toBeTruthy();
  });
});
