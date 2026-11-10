// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card } from './Card';

describe('<Card />', () => {
  it('renders children with default padding and no status or interactive by default', () => {
    render(<Card data-testid="card">Card Body Content</Card>);
    const card = screen.getByTestId('card');
    expect(card.textContent).toBe('Card Body Content');
    expect(card.getAttribute('data-padding')).toBe('default');
    expect(card.getAttribute('data-status')).toBeNull();
    expect(card.getAttribute('data-interactive')).toBeNull();
  });

  it('renders status and interactive attributes', () => {
    const { rerender } = render(
      <Card status="nominal" interactive data-testid="card">
        Active System
      </Card>
    );

    let card = screen.getByTestId('card');
    expect(card.getAttribute('data-status')).toBe('nominal');
    expect(card.getAttribute('data-interactive')).toBe('true');

    rerender(
      <Card status="critical" interactive={false} padding="tight" data-testid="card">
        Critical Hazard
      </Card>
    );

    card = screen.getByTestId('card');
    expect(card.getAttribute('data-status')).toBe('critical');
    expect(card.getAttribute('data-interactive')).toBeNull();
    expect(card.getAttribute('data-padding')).toBe('tight');
  });

  it('binds scoped module class statically without custom className per DEC-R050', () => {
    render(
      <Card role="region" aria-label="System telemetry" data-testid="card">
        Details
      </Card>
    );

    const card = screen.getByTestId('card');
    expect(card.className).toBeTruthy();
    expect(card.getAttribute('role')).toBe('region');
    expect(card.getAttribute('aria-label')).toBe('System telemetry');
  });
});
