// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Dock } from './Dock';

describe('<Dock />', () => {
  it('renders with default floating position and padded attribute', () => {
    render(<Dock data-testid="dock">Navigation Controls</Dock>);
    const dock = screen.getByTestId('dock');
    expect(dock.textContent).toBe('Navigation Controls');
    expect(dock.getAttribute('data-position')).toBe('floating');
    expect(dock.getAttribute('data-padded')).toBeNull();
  });

  it('renders custom position and unpadded attributes', () => {
    const { rerender } = render(
      <Dock position="bottom" padded={false} data-testid="dock">
        Bottom Bar
      </Dock>
    );

    let dock = screen.getByTestId('dock');
    expect(dock.getAttribute('data-position')).toBe('bottom');
    expect(dock.getAttribute('data-padded')).toBe('false');

    rerender(
      <Dock position="left" padded={true} data-testid="dock">
        Left Bar
      </Dock>
    );

    dock = screen.getByTestId('dock');
    expect(dock.getAttribute('data-position')).toBe('left');
    expect(dock.getAttribute('data-padded')).toBeNull();
  });

  it('binds scoped module class statically without custom className per DEC-R050', () => {
    render(
      <Dock role="toolbar" aria-label="Quick actions" data-testid="dock">
        Tools
      </Dock>
    );

    const dock = screen.getByTestId('dock');
    expect(dock.className).toBeTruthy();
    expect(dock.getAttribute('role')).toBe('toolbar');
    expect(dock.getAttribute('aria-label')).toBe('Quick actions');
  });
});
