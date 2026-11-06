// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Toggle } from './Toggle';

describe('<Toggle />', () => {
  it('renders a switch button with default unchecked state', () => {
    render(<Toggle checked={false} onChange={vi.fn()} aria-label="Constellation grid" />);

    const toggle = screen.getByRole('switch', { name: 'Constellation grid' });
    expect(toggle).toBeDefined();
    expect(toggle.getAttribute('type')).toBe('button');
    expect(toggle.getAttribute('aria-checked')).toBe('false');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(toggle.getAttribute('data-checked')).toBeNull();
    expect(toggle.getAttribute('data-disabled')).toBeNull();
  });

  it('reflects checked state via attributes', () => {
    render(<Toggle checked={true} onChange={vi.fn()} aria-label="Habitable zone filter" />);

    const toggle = screen.getByRole('switch', { name: 'Habitable zone filter' });
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(toggle.getAttribute('data-checked')).toBe('true');
  });

  it('invokes onChange with inverted boolean when clicked', () => {
    const handleChange = vi.fn();
    const { rerender } = render(
      <Toggle checked={false} onChange={handleChange} aria-label="Audio telemetry" />
    );

    const toggle = screen.getByRole('switch', { name: 'Audio telemetry' });
    fireEvent.click(toggle);

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith(true);

    rerender(<Toggle checked={true} onChange={handleChange} aria-label="Audio telemetry" />);
    fireEvent.click(toggle);

    expect(handleChange).toHaveBeenCalledTimes(2);
    expect(handleChange).toHaveBeenLastCalledWith(false);
  });

  it('respects disabled state and ignores clicks', () => {
    const handleChange = vi.fn();
    render(
      <Toggle
        checked={false}
        onChange={handleChange}
        disabled
        aria-label="Locked feature"
      />
    );

    const toggle = screen.getByRole('switch', { name: 'Locked feature' }) as HTMLButtonElement;
    expect(toggle.disabled).toBe(true);
    expect(toggle.getAttribute('data-disabled')).toBe('true');

    fireEvent.click(toggle);
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('renders optional label element', () => {
    render(<Toggle checked={false} onChange={vi.fn()} label="Spectral Classification" />);

    expect(screen.getByText('Spectral Classification')).toBeDefined();
    const toggle = screen.getByRole('switch', { name: 'Spectral Classification' });
    expect(toggle).toBeDefined();
  });

  it('merges custom className with container style', () => {
    render(
      <Toggle
        checked={false}
        onChange={vi.fn()}
        className="custom-toggle"
        aria-label="Toggle"
      />
    );

    const toggle = screen.getByRole('switch', { name: 'Toggle' });
    expect(toggle.className).toContain('custom-toggle');
  });
});
