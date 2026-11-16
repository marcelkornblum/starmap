import { useEffect } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { RootLayout } from './RootLayout';
import * as spaNav from '../hooks/spaNavigation';
import { registerAppRouter } from '../hooks/useSpaLocation';

const galaxyViewMountSpy = vi.fn();
const galaxyViewUnmountSpy = vi.fn();

vi.mock('../views/GalaxyView', () => ({
  GalaxyView: () => {
    useEffect(() => {
      galaxyViewMountSpy();
      return () => {
        galaxyViewUnmountSpy();
      };
    }, []);
    return <div data-testid="mock-galaxy-view">Mock Galaxy View</div>;
  },
}));

vi.mock('@tanstack/react-router', () => ({
  Outlet: () => (
    <div data-testid="router-outlet">
      <a href="/galaxy?focus=sol" data-testid="test-link">
        Go to Sol
      </a>
      <a
        href="/galaxy?focus=sirius"
        data-testid="prevented-link"
        onClick={(e) => {
          e.preventDefault();
        }}
      >
        Go to Sirius
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
    expect(rootEl).not.toBeNull();
    expect(screen.getByTestId('theme-token-bridge')).toBeInTheDocument();
    expect(screen.getByTestId('root-canvas-host')).toBeInTheDocument();
    expect(screen.getByTestId('router-outlet')).toBeInTheDocument();
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

  it('triggers handleSpaNavigation once on plain links and skips duplicate calls when child onClick called event.preventDefault()', () => {
    const handleSpaNavSpy = vi.spyOn(spaNav, 'handleSpaNavigation').mockImplementation(() => true);

    render(<RootLayout />);

    const plainLink = screen.getByTestId('test-link');
    fireEvent.click(plainLink);
    expect(handleSpaNavSpy).toHaveBeenCalledTimes(1);

    handleSpaNavSpy.mockClear();

    const preventedLink = screen.getByTestId('prevented-link');
    fireEvent.click(preventedLink);
    expect(handleSpaNavSpy).not.toHaveBeenCalled();
  });

  it('keeps GalaxyView mounted without remounting when router transitions between / and /galaxy', () => {
    let resolvedCallback: (() => void) | undefined;
    let routerState = {
      matches: [{ routeId: '/' }],
    };

    registerAppRouter({
      get state() {
        return routerState;
      },
      subscribe: (_event: string, callback: () => void) => {
        resolvedCallback = callback;
        return () => {
          resolvedCallback = undefined;
        };
      },
    });

    try {
      window.history.pushState({}, '', '/');
      render(<RootLayout />);

      expect(screen.getByTestId('mock-galaxy-view')).toBeInTheDocument();
      expect(galaxyViewMountSpy).toHaveBeenCalledTimes(1);
      expect(galaxyViewUnmountSpy).not.toHaveBeenCalled();

      // Transition to /galaxy
      act(() => {
        window.history.pushState({}, '', '/galaxy?focus=tau-ceti');
        routerState = {
          matches: [{ routeId: '/galaxy' }],
        };
        resolvedCallback?.();
      });

      expect(screen.getByTestId('mock-galaxy-view')).toBeInTheDocument();
      expect(galaxyViewMountSpy).toHaveBeenCalledTimes(1);
      expect(galaxyViewUnmountSpy).not.toHaveBeenCalled();

      // Transition to /search to verify it unmounts and renders outlet
      act(() => {
        window.history.pushState({}, '', '/search');
        routerState = {
          matches: [{ routeId: '/search' }],
        };
        resolvedCallback?.();
      });

      expect(screen.getByTestId('router-outlet')).toBeInTheDocument();
      expect(galaxyViewUnmountSpy).toHaveBeenCalledTimes(1);
    } finally {
      registerAppRouter(null);
    }
  });
});
