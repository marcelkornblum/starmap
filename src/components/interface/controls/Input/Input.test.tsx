// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { createRef } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from './Input';

describe('<Input />', () => {
  it('renders an input element with default attributes', () => {
    render(<Input placeholder="Search catalog..." />);
    const input = screen.getByPlaceholderText('Search catalog...');
    expect(input).toBeDefined();
    expect(input.tagName.toLowerCase()).toBe('input');
    expect(input.getAttribute('data-size')).toBe('md');
    expect(input.getAttribute('data-status')).toBeNull();
    expect(input.getAttribute('data-tabular')).toBeNull();
  });

  it('renders current value and handles onChange events', () => {
    const handleChange = vi.fn();
    render(<Input value="Sol" onChange={handleChange} aria-label="Target System" />);

    const input = screen.getByLabelText('Target System') as HTMLInputElement;
    expect(input.value).toBe('Sol');

    fireEvent.change(input, { target: { value: 'Alpha Centauri' } });
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('reflects status variants on data-status', () => {
    const { rerender } = render(<Input status="error" aria-label="Sensor input" />);
    expect(screen.getByLabelText('Sensor input').getAttribute('data-status')).toBe('error');

    rerender(<Input status="success" aria-label="Sensor input" />);
    expect(screen.getByLabelText('Sensor input').getAttribute('data-status')).toBe('success');

    rerender(<Input aria-label="Sensor input" />);
    expect(screen.getByLabelText('Sensor input').getAttribute('data-status')).toBeNull();
  });

  it('reflects sizeVariant on data-size', () => {
    const { rerender } = render(<Input sizeVariant="sm" aria-label="Metric" />);
    expect(screen.getByLabelText('Metric').getAttribute('data-size')).toBe('sm');

    rerender(<Input sizeVariant="md" aria-label="Metric" />);
    expect(screen.getByLabelText('Metric').getAttribute('data-size')).toBe('md');
  });

  it('reflects tabular numeric formatting via data-tabular', () => {
    const { rerender } = render(<Input tabular aria-label="Distance" />);
    expect(screen.getByLabelText('Distance').getAttribute('data-tabular')).toBe('true');

    rerender(<Input tabular={false} aria-label="Distance" />);
    expect(screen.getByLabelText('Distance').getAttribute('data-tabular')).toBeNull();
  });

  it('respects disabled state', () => {
    render(<Input disabled placeholder="Offline" />);
    const input = screen.getByPlaceholderText('Offline') as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });

  it('forwards ref to the underlying HTMLInputElement', () => {
    const ref = createRef<HTMLInputElement>();
    render(<Input ref={ref} aria-label="Telemetry" />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('forwards native HTML attributes', () => {
    render(
      <Input
        type="number"
        min={0}
        max={100}
        required
        aria-label="Light-years"
      />
    );
    const input = screen.getByLabelText('Light-years');
    expect(input.getAttribute('type')).toBe('number');
    expect(input.getAttribute('min')).toBe('0');
    expect(input.getAttribute('max')).toBe('100');
    expect(input.hasAttribute('required')).toBe(true);
  });

  it('binds scoped module class statically without custom className per DEC-R050', () => {
    render(<Input placeholder="Custom" />);
    const input = screen.getByPlaceholderText('Custom');
    expect(input.className).toBeTruthy();
  });
});
