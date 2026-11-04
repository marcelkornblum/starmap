// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Toast } from './Toast';

describe('<Toast />', () => {
  it('renders role="status" and aria-live="polite" with default info status', () => {
    render(<Toast title="Trajectory Locked" />);

    const toast = screen.getByRole('status');
    expect(toast.getAttribute('aria-live')).toBe('polite');
    expect(toast.getAttribute('data-status')).toBe('info');
    expect(screen.getByRole('heading', { level: 4, name: 'Trajectory Locked' })).toBeDefined();
  });

  it('renders message body and custom status attribute', () => {
    render(
      <Toast
        title="Orbital Decay Warning"
        message="Apoapsis below safety threshold."
        status="critical"
      />
    );

    const toast = screen.getByRole('status');
    expect(toast.getAttribute('data-status')).toBe('critical');
    expect(screen.getByText('Apoapsis below safety threshold.')).toBeDefined();
  });

  it('renders dismiss button when onClose is provided and handles click', () => {
    const handleClose = vi.fn();
    render(
      <Toast
        title="Calibration Complete"
        onClose={handleClose}
      />
    );

    const dismissBtn = screen.getByRole('button', { name: 'Dismiss notification' });
    fireEvent.click(dismissBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('omits dismiss button when onClose is not provided', () => {
    render(<Toast title="System Steady" />);
    expect(screen.queryByRole('button', { name: 'Dismiss notification' })).toBeNull();
  });
});
