// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Kbd } from './Kbd';

describe('<Kbd />', () => {
  it('renders a kbd element with children and data attribute', () => {
    render(<Kbd>⌘K</Kbd>);
    const kbd = screen.getByText('⌘K');
    expect(kbd.tagName.toLowerCase()).toBe('kbd');
    expect(kbd.getAttribute('data-kbd')).toBe('true');
  });

  it('merges custom className and forwards extra attributes', () => {
    render(
      <Kbd className="custom-key" aria-label="Command Key" data-testid="kbd-key">
        Ctrl
      </Kbd>
    );

    const kbd = screen.getByTestId('kbd-key');
    expect(kbd.className).toContain('custom-key');
    expect(kbd.getAttribute('aria-label')).toBe('Command Key');
  });
});
