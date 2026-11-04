// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Switcher } from './Switcher';

describe('<Switcher />', () => {
  it('renders children within a default div container', () => {
    render(
      <Switcher data-testid="switcher-container">
        <div>Switch 1</div>
        <div>Switch 2</div>
      </Switcher>
    );

    const container = screen.getByTestId('switcher-container');
    expect(container).toBeDefined();
    expect(container.tagName.toLowerCase()).toBe('div');
    expect(screen.getByText('Switch 1')).toBeDefined();
    expect(screen.getByText('Switch 2')).toBeDefined();
  });

  it('sets default data attributes and omits data-limit when not provided', () => {
    render(<Switcher data-testid="switcher-container" />);

    const container = screen.getByTestId('switcher-container');
    expect(container.getAttribute('data-threshold')).toBe('md');
    expect(container.getAttribute('data-gap')).toBe('default');
    expect(container.getAttribute('data-limit')).toBeNull();
  });

  it('reflects custom threshold prop on data-threshold', () => {
    const { rerender } = render(<Switcher threshold="sm" data-testid="switcher-container" />);
    expect(screen.getByTestId('switcher-container').getAttribute('data-threshold')).toBe('sm');

    rerender(<Switcher threshold="lg" data-testid="switcher-container" />);
    expect(screen.getByTestId('switcher-container').getAttribute('data-threshold')).toBe('lg');

    rerender(<Switcher threshold="xl" data-testid="switcher-container" />);
    expect(screen.getByTestId('switcher-container').getAttribute('data-threshold')).toBe('xl');

    rerender(<Switcher threshold="md" data-testid="switcher-container" />);
    expect(screen.getByTestId('switcher-container').getAttribute('data-threshold')).toBe('md');
  });

  it('reflects limit prop on data-limit', () => {
    const { rerender } = render(<Switcher limit={2} data-testid="switcher-container" />);
    expect(screen.getByTestId('switcher-container').getAttribute('data-limit')).toBe('2');

    rerender(<Switcher limit={3} data-testid="switcher-container" />);
    expect(screen.getByTestId('switcher-container').getAttribute('data-limit')).toBe('3');

    rerender(<Switcher limit={4} data-testid="switcher-container" />);
    expect(screen.getByTestId('switcher-container').getAttribute('data-limit')).toBe('4');

    rerender(<Switcher limit={undefined} data-testid="switcher-container" />);
    expect(screen.getByTestId('switcher-container').getAttribute('data-limit')).toBeNull();
  });

  it('reflects gap prop on data-gap', () => {
    const { rerender } = render(<Switcher gap="none" data-testid="switcher-container" />);
    expect(screen.getByTestId('switcher-container').getAttribute('data-gap')).toBe('none');

    rerender(<Switcher gap="tight" data-testid="switcher-container" />);
    expect(screen.getByTestId('switcher-container').getAttribute('data-gap')).toBe('tight');

    rerender(<Switcher gap="loose" data-testid="switcher-container" />);
    expect(screen.getByTestId('switcher-container').getAttribute('data-gap')).toBe('loose');
  });

  it('renders custom HTML elements via polymorphic as prop', () => {
    const { rerender } = render(<Switcher as="fieldset" data-testid="switcher-container" />);
    expect(screen.getByTestId('switcher-container').tagName.toLowerCase()).toBe('fieldset');

    rerender(<Switcher as="section" data-testid="switcher-container" />);
    expect(screen.getByTestId('switcher-container').tagName.toLowerCase()).toBe('section');
  });

  it('forwards HTML and accessibility attributes', () => {
    render(
      <Switcher
        role="group"
        aria-label="Responsive Cluster Switcher"
        data-testid="switcher-container"
      />
    );

    const container = screen.getByTestId('switcher-container');
    expect(container.getAttribute('role')).toBe('group');
    expect(container.getAttribute('aria-label')).toBe('Responsive Cluster Switcher');
  });

  it('merges custom className with scoped module class', () => {
    render(<Switcher className="custom-switcher" data-testid="switcher-container" />);

    const container = screen.getByTestId('switcher-container');
    expect(container.className).toContain('custom-switcher');
  });
});
