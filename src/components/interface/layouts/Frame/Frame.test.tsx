// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Frame } from './Frame';

describe('<Frame />', () => {
  it('renders children within a default div container', () => {
    render(
      <Frame data-testid="frame-container">
        <img src="test.jpg" alt="Test frame target" />
      </Frame>
    );

    const container = screen.getByTestId('frame-container');
    expect(container).toBeDefined();
    expect(container.tagName.toLowerCase()).toBe('div');
    expect(screen.getByAltText('Test frame target')).toBeDefined();
  });

  it('sets default data-ratio="16:9"', () => {
    render(<Frame data-testid="frame-container" />);

    const container = screen.getByTestId('frame-container');
    expect(container.getAttribute('data-ratio')).toBe('16:9');
  });

  it('reflects custom ratio prop on data-ratio', () => {
    const { rerender } = render(<Frame ratio="1:1" data-testid="frame-container" />);
    expect(screen.getByTestId('frame-container').getAttribute('data-ratio')).toBe('1:1');

    rerender(<Frame ratio="4:3" data-testid="frame-container" />);
    expect(screen.getByTestId('frame-container').getAttribute('data-ratio')).toBe('4:3');

    rerender(<Frame ratio="16:9" data-testid="frame-container" />);
    expect(screen.getByTestId('frame-container').getAttribute('data-ratio')).toBe('16:9');

    rerender(<Frame ratio="21:9" data-testid="frame-container" />);
    expect(screen.getByTestId('frame-container').getAttribute('data-ratio')).toBe('21:9');
  });

  it('renders custom HTML elements via polymorphic as prop', () => {
    const { rerender } = render(<Frame as="figure" data-testid="frame-container" />);
    expect(screen.getByTestId('frame-container').tagName.toLowerCase()).toBe('figure');

    rerender(<Frame as="section" data-testid="frame-container" />);
    expect(screen.getByTestId('frame-container').tagName.toLowerCase()).toBe('section');
  });

  it('forwards HTML and accessibility attributes', () => {
    render(
      <Frame
        role="img"
        aria-label="Target System Sensor View"
        data-testid="frame-container"
      />
    );

    const container = screen.getByTestId('frame-container');
    expect(container.getAttribute('role')).toBe('img');
    expect(container.getAttribute('aria-label')).toBe('Target System Sensor View');
  });

  it('merges custom className with scoped module class', () => {
    render(<Frame className="custom-frame" data-testid="frame-container" />);

    const container = screen.getByTestId('frame-container');
    expect(container.className).toContain('custom-frame');
  });
});
