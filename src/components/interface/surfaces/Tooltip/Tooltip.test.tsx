// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Tooltip } from './Tooltip';

describe('<Tooltip />', () => {
  it('renders standalone tooltip element with role="tooltip"', () => {
    render(<Tooltip text="Trigonometric parallax in mas" id="parallax-tip" />);

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip.getAttribute('id')).toBe('parallax-tip');
    expect(tooltip.textContent).toBe('Trigonometric parallax in mas');
  });

  it('wraps child trigger and assigns aria-describedby matching tooltip id', () => {
    render(
      <Tooltip text="Spectral class M4.0V" id="spectral-tip">
        <button type="button">Target</button>
      </Tooltip>
    );

    const trigger = screen.getByRole('button', { name: 'Target' });
    expect(trigger.getAttribute('aria-describedby')).toBe('spectral-tip');

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip.getAttribute('id')).toBe('spectral-tip');
    expect(tooltip.textContent).toBe('Spectral class M4.0V');
  });

  it('respects controlled isOpen prop', () => {
    const { rerender } = render(
      <Tooltip text="Radial Velocity" isOpen={false}>
        <button type="button">RV</button>
      </Tooltip>
    );

    expect(screen.queryByRole('tooltip')).toBeNull();

    rerender(
      <Tooltip text="Radial Velocity" isOpen={true}>
        <button type="button">RV</button>
      </Tooltip>
    );

    expect(screen.getByRole('tooltip')).toBeDefined();
  });

  it('dismisses when Escape key is pressed', () => {
    const handleOpenChange = vi.fn();
    render(
      <Tooltip
        text="Escape dismissible"
        defaultOpen={true}
        onOpenChange={handleOpenChange}
      >
        <button type="button">Trigger</button>
      </Tooltip>
    );

    expect(screen.getByRole('tooltip')).toBeDefined();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });

  it('dismisses on outside click', () => {
    const handleOpenChange = vi.fn();
    render(
      <div>
        <button type="button" data-testid="outside-el">
          Outside
        </button>
        <Tooltip
          text="Outside dismissible"
          defaultOpen={true}
          onOpenChange={handleOpenChange}
        >
          <button type="button">Trigger</button>
        </Tooltip>
      </div>
    );

    const outsideEl = screen.getByTestId('outside-el');
    fireEvent.mouseDown(outsideEl);
    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });
});
