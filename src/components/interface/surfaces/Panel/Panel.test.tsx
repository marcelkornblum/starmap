// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Panel } from './Panel';

describe('<Panel />', () => {
  it('renders body children with default padding and no header or footer by default', () => {
    render(<Panel data-testid="panel">Panel Body</Panel>);

    const panel = screen.getByTestId('panel');
    expect(panel.textContent).toBe('Panel Body');
    expect(panel.getAttribute('data-padding')).toBe('default');
    expect(panel.getAttribute('data-status')).toBeNull();
  });

  it('renders header, footer, status, and padding variants', () => {
    render(
      <Panel
        header={<h3 data-testid="panel-header">Telemetry Header</h3>}
        footer={<span data-testid="panel-footer">Status: Calibrated</span>}
        status="nominal"
        padding="loose"
        data-testid="panel"
      >
        Main Observation Matrix
      </Panel>
    );

    const panel = screen.getByTestId('panel');
    expect(panel.getAttribute('data-status')).toBe('nominal');
    expect(panel.getAttribute('data-padding')).toBe('loose');
    expect(screen.getByTestId('panel-header').textContent).toBe('Telemetry Header');
    expect(screen.getByTestId('panel-footer').textContent).toBe('Status: Calibrated');
    expect(screen.getByText('Main Observation Matrix')).toBeDefined();
  });

  it('applies static module class and forwards extra attributes', () => {
    render(
      <Panel role="region" aria-label="System details" data-testid="panel">
        Content
      </Panel>
    );

    const panel = screen.getByTestId('panel');
    expect(panel.className).toMatch(/panel/);
    expect(panel.getAttribute('role')).toBe('region');
    expect(panel.getAttribute('aria-label')).toBe('System details');
  });
});
