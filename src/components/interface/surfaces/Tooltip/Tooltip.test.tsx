import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
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

    expect(screen.getByRole('tooltip')).toBeInTheDocument();
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

    expect(screen.getByRole('tooltip')).toBeInTheDocument();

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

  it('does not calculate placement or attach window listeners on mount when uncontrolled, activating on mouseEnter and detaching on mouseLeave', () => {
    const rectSpy = vi.spyOn(Element.prototype, 'getBoundingClientRect');
    const addListenerSpy = vi.spyOn(window, 'addEventListener');
    const removeListenerSpy = vi.spyOn(window, 'removeEventListener');

    rectSpy.mockClear();
    addListenerSpy.mockClear();
    removeListenerSpy.mockClear();

    const { container } = render(
      <Tooltip text="Star">
        <button type="button">Trigger</button>
      </Tooltip>
    );

    const scrollAddsOnMount = addListenerSpy.mock.calls.filter(([event]) => event === 'scroll' || event === 'resize');
    expect(scrollAddsOnMount).toHaveLength(0);
    expect(rectSpy).not.toHaveBeenCalled();

    const wrapper = container.firstElementChild as HTMLElement;

    fireEvent.mouseEnter(wrapper);

    const scrollAddsOnHover = addListenerSpy.mock.calls.filter(([event]) => event === 'scroll' || event === 'resize');
    expect(scrollAddsOnHover.length).toBeGreaterThan(0);
    expect(rectSpy).toHaveBeenCalled();

    fireEvent.mouseLeave(wrapper);

    const scrollRemovesOnLeave = removeListenerSpy.mock.calls.filter(([event]) => event === 'scroll' || event === 'resize');
    expect(scrollRemovesOnLeave.length).toBeGreaterThan(0);

    rectSpy.mockRestore();
    addListenerSpy.mockRestore();
    removeListenerSpy.mockRestore();
  });
});
