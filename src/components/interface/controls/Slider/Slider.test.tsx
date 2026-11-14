// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Slider } from './Slider';

describe('<Slider />', () => {
  it('renders a range input with specified min, max, step, and value', () => {
    render(
      <Slider
        min={0}
        max={100}
        step={5}
        value={25}
        onChange={vi.fn()}
        aria-label="Sensor Gain"
      />
    );

    const slider = screen.getByRole('slider', { name: 'Sensor Gain' }) as HTMLInputElement;
    expect(slider).toBeDefined();
    expect(slider.type).toBe('range');
    expect(slider.min).toBe('0');
    expect(slider.max).toBe('100');
    expect(slider.step).toBe('5');
    expect(slider.value).toBe('25');
  });

  it('uses default step=1 when step is omitted', () => {
    render(
      <Slider
        min={1}
        max={10}
        value={3}
        onChange={vi.fn()}
        aria-label="Magnitude"
      />
    );

    const slider = screen.getByRole('slider', { name: 'Magnitude' }) as HTMLInputElement;
    expect(slider.step).toBe('1');
  });

  it('invokes onChange with parsed numeric value on change', () => {
    const handleChange = vi.fn();
    render(
      <Slider
        min={0}
        max={100}
        value={50}
        onChange={handleChange}
        aria-label="FOV Scale"
      />
    );

    const slider = screen.getByRole('slider', { name: 'FOV Scale' });
    fireEvent.change(slider, { target: { value: '75' } });

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith(75);
  });

  it('renders label and current value readout when label is provided', () => {
    render(
      <Slider
        min={0}
        max={50}
        value={15}
        onChange={vi.fn()}
        label="Parallax Threshold"
      />
    );

    expect(screen.getByText('Parallax Threshold')).toBeDefined();
    expect(screen.getByText('15')).toBeDefined();
    const slider = screen.getByRole('slider', { name: 'Parallax Threshold' });
    expect(slider).toBeDefined();
  });

  it('respects explicitly provided id for label association', () => {
    render(
      <Slider
        id="custom-slider-id"
        min={0}
        max={100}
        value={40}
        onChange={vi.fn()}
        label="Exposure Time"
      />
    );

    const slider = screen.getByRole('slider', { name: 'Exposure Time' });
    expect(slider.id).toBe('custom-slider-id');
  });

  it('respects disabled state', () => {
    render(
      <Slider
        min={0}
        max={100}
        value={0}
        disabled
        onChange={vi.fn()}
        aria-label="Locked Slider"
      />
    );

    const slider = screen.getByRole('slider', { name: 'Locked Slider' }) as HTMLInputElement;
    expect(slider.disabled).toBe(true);
  });

  it('forwards containerProps to outer container', () => {
    render(
      <Slider
        min={0}
        max={10}
        value={5}
        onChange={vi.fn()}
        aria-label="Volume"
        containerProps={{ id: 'custom-container' }}
      />
    );

    const container = document.getElementById('custom-container');
    expect(container).not.toBeNull();
    expect(container?.className).toBeTruthy();
  });

  it('binds scoped module class statically without custom className per DEC-R050', () => {
    render(
      <Slider
        min={0}
        max={10}
        value={5}
        onChange={vi.fn()}
        aria-label="Density"
      />
    );

    const slider = screen.getByRole('slider', { name: 'Density' });
    expect(slider.className).toBeTruthy();
  });
});
