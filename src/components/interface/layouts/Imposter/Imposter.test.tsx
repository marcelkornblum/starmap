// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Imposter } from './Imposter';

describe('<Imposter />', () => {
  it('renders children within a default div container', () => {
    render(
      <Imposter data-testid="imposter-container">
        <span>Overlay Modal</span>
      </Imposter>
    );

    const container = screen.getByTestId('imposter-container');
    expect(container).toBeDefined();
    expect(container.tagName.toLowerCase()).toBe('div');
    expect(screen.getByText('Overlay Modal')).toBeDefined();
  });

  it('sets default data-position="center", data-margin="default", and omits data-fixed', () => {
    render(<Imposter data-testid="imposter-container" />);

    const container = screen.getByTestId('imposter-container');
    expect(container.getAttribute('data-position')).toBe('center');
    expect(container.getAttribute('data-margin')).toBe('default');
    expect(container.getAttribute('data-fixed')).toBeNull();
  });

  it('reflects fixed prop on data-fixed attribute', () => {
    const { rerender } = render(<Imposter fixed data-testid="imposter-container" />);
    expect(screen.getByTestId('imposter-container').getAttribute('data-fixed')).toBe('true');

    rerender(<Imposter fixed={false} data-testid="imposter-container" />);
    expect(screen.getByTestId('imposter-container').getAttribute('data-fixed')).toBeNull();
  });

  it('reflects custom position prop on data-position', () => {
    const { rerender } = render(<Imposter position="top-left" data-testid="imposter-container" />);
    expect(screen.getByTestId('imposter-container').getAttribute('data-position')).toBe('top-left');

    rerender(<Imposter position="top-right" data-testid="imposter-container" />);
    expect(screen.getByTestId('imposter-container').getAttribute('data-position')).toBe('top-right');

    rerender(<Imposter position="bottom-left" data-testid="imposter-container" />);
    expect(screen.getByTestId('imposter-container').getAttribute('data-position')).toBe('bottom-left');

    rerender(<Imposter position="bottom-right" data-testid="imposter-container" />);
    expect(screen.getByTestId('imposter-container').getAttribute('data-position')).toBe('bottom-right');

    rerender(<Imposter position="top" data-testid="imposter-container" />);
    expect(screen.getByTestId('imposter-container').getAttribute('data-position')).toBe('top');

    rerender(<Imposter position="bottom" data-testid="imposter-container" />);
    expect(screen.getByTestId('imposter-container').getAttribute('data-position')).toBe('bottom');

    rerender(<Imposter position="center" data-testid="imposter-container" />);
    expect(screen.getByTestId('imposter-container').getAttribute('data-position')).toBe('center');
  });

  it('reflects custom margin prop on data-margin', () => {
    const { rerender } = render(<Imposter margin="none" data-testid="imposter-container" />);
    expect(screen.getByTestId('imposter-container').getAttribute('data-margin')).toBe('none');

    rerender(<Imposter margin="dense" data-testid="imposter-container" />);
    expect(screen.getByTestId('imposter-container').getAttribute('data-margin')).toBe('dense');

    rerender(<Imposter margin="loose" data-testid="imposter-container" />);
    expect(screen.getByTestId('imposter-container').getAttribute('data-margin')).toBe('loose');
  });

  it('renders custom HTML elements via polymorphic as prop', () => {
    const { rerender } = render(<Imposter as="dialog" data-testid="imposter-container" />);
    expect(screen.getByTestId('imposter-container').tagName.toLowerCase()).toBe('dialog');

    rerender(<Imposter as="aside" data-testid="imposter-container" />);
    expect(screen.getByTestId('imposter-container').tagName.toLowerCase()).toBe('aside');
  });

  it('forwards HTML and accessibility attributes', () => {
    render(
      <Imposter
        role="dialog"
        aria-modal="true"
        aria-label="Target System Details"
        data-testid="imposter-container"
      />
    );

    const container = screen.getByTestId('imposter-container');
    expect(container.getAttribute('role')).toBe('dialog');
    expect(container.getAttribute('aria-modal')).toBe('true');
    expect(container.getAttribute('aria-label')).toBe('Target System Details');
  });

  it('binds scoped module class statically without custom className per DEC-R050', () => {
    render(<Imposter data-testid="imposter-container" />);

    const container = screen.getByTestId('imposter-container');
    expect(container.className).toBeTruthy();
  });
});
