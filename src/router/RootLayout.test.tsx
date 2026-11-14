import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RootLayout } from './RootLayout';
import * as spaNav from '../hooks/spaNavigation';

vi.mock('@tanstack/react-router', () => ({
  Outlet: () => (
    <div data-testid="router-outlet">
      <a href="/galaxy?focus=sol" data-testid="test-link">
        Go to Sol
      </a>
    </div>
  ),
}));

vi.mock('../components/domain/CanvasLayer', () => ({
  RootCanvasHost: () => <div data-testid="root-canvas-host">Mock Canvas Host</div>,
}));

vi.mock('../components/canvas/ThemeTokenBridge', () => ({
  ThemeTokenBridge: () => <div data-testid="theme-token-bridge">Mock Token Bridge</div>,
}));

describe('<RootLayout />', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders root layout container, canvas host, theme bridge, and router outlet', () => {
    const { container } = render(<RootLayout />);

    const rootEl = container.querySelector('#starmap-app-root');
    expect(rootEl).toBeDefined();
    expect(screen.getByTestId('theme-token-bridge')).toBeDefined();
    expect(screen.getByTestId('root-canvas-host')).toBeDefined();
    expect(screen.getByTestId('router-outlet')).toBeDefined();
  });

  it('delegates internal link clicks to handleSpaNavigation', () => {
    const handleSpaNavSpy = vi.spyOn(spaNav, 'handleSpaNavigation').mockImplementation(() => true);

    render(<RootLayout />);

    const link = screen.getByTestId('test-link');
    fireEvent.click(link);

    expect(handleSpaNavSpy).toHaveBeenCalledWith(
      expect.anything(),
      '/galaxy?focus=sol',
    );
  });
});
