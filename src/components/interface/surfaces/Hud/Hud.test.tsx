// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Hud } from './Hud';

describe('<Hud />', () => {
  it('renders a header element with default top position and padded attribute', () => {
    render(<Hud data-testid="hud">Mission Status</Hud>);
    const hud = screen.getByTestId('hud');
    expect(hud.tagName.toLowerCase()).toBe('header');
    expect(hud.textContent).toBe('Mission Status');
    expect(hud.getAttribute('data-position')).toBe('top');
    expect(hud.getAttribute('data-padded')).toBeNull();
  });

  it('renders custom position and unpadded attributes', () => {
    const { rerender } = render(
      <Hud position="bottom" padded={false} data-testid="hud">
        Bottom HUD
      </Hud>
    );

    let hud = screen.getByTestId('hud');
    expect(hud.getAttribute('data-position')).toBe('bottom');
    expect(hud.getAttribute('data-padded')).toBe('false');

    rerender(
      <Hud position="static" padded={true} data-testid="hud">
        Static HUD
      </Hud>
    );

    hud = screen.getByTestId('hud');
    expect(hud.getAttribute('data-position')).toBe('static');
    expect(hud.getAttribute('data-padded')).toBeNull();
  });

  it('binds scoped module class statically without custom className per DEC-R050', () => {
    render(
      <Hud aria-label="Flight telemetry" data-testid="hud">
        Telemetry Readout
      </Hud>
    );

    const hud = screen.getByTestId('hud');
    expect(hud.className).toBeTruthy();
    expect(hud.getAttribute('aria-label')).toBe('Flight telemetry');
  });
});
