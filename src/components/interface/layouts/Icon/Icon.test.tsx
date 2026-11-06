// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Icon } from './Icon';

describe('<Icon />', () => {
  it('renders children within a default span container with aria-hidden="true"', () => {
    render(
      <Icon data-testid="icon-container">
        <svg data-testid="test-svg" />
      </Icon>
    );

    const container = screen.getByTestId('icon-container');
    expect(container).toBeDefined();
    expect(container.tagName.toLowerCase()).toBe('span');
    expect(container.getAttribute('aria-hidden')).toBe('true');
    expect(screen.getByTestId('test-svg')).toBeDefined();
  });

  it('sets default data-size="md"', () => {
    render(<Icon data-testid="icon-container" />);

    const container = screen.getByTestId('icon-container');
    expect(container.getAttribute('data-size')).toBe('md');
  });

  it('reflects custom size prop on data-size', () => {
    const { rerender } = render(<Icon size="sm" data-testid="icon-container" />);
    expect(screen.getByTestId('icon-container').getAttribute('data-size')).toBe('sm');

    rerender(<Icon size="lg" data-testid="icon-container" />);
    expect(screen.getByTestId('icon-container').getAttribute('data-size')).toBe('lg');

    rerender(<Icon size="xl" data-testid="icon-container" />);
    expect(screen.getByTestId('icon-container').getAttribute('data-size')).toBe('xl');

    rerender(<Icon size="md" data-testid="icon-container" />);
    expect(screen.getByTestId('icon-container').getAttribute('data-size')).toBe('md');
  });

  it('renders custom HTML elements via polymorphic as prop', () => {
    const { rerender } = render(<Icon as="i" data-testid="icon-container" />);
    expect(screen.getByTestId('icon-container').tagName.toLowerCase()).toBe('i');

    rerender(<Icon as="div" data-testid="icon-container" />);
    expect(screen.getByTestId('icon-container').tagName.toLowerCase()).toBe('div');
  });

  it('forwards HTML attributes and allows overriding aria-hidden', () => {
    render(
      <Icon
        aria-hidden={false}
        role="img"
        aria-label="Star Glyph"
        data-testid="icon-container"
      />
    );

    const container = screen.getByTestId('icon-container');
    expect(container.getAttribute('aria-hidden')).toBe('false');
    expect(container.getAttribute('role')).toBe('img');
    expect(container.getAttribute('aria-label')).toBe('Star Glyph');
  });

  it('merges custom className with scoped module class', () => {
    render(<Icon className="custom-icon" data-testid="icon-container" />);

    const container = screen.getByTestId('icon-container');
    expect(container.className).toContain('custom-icon');
  });
});
