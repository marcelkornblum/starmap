import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { act, render, renderHook, screen } from '@testing-library/react';
import {
  CanvasRouterBridgeContext,
  type AppRouterAdapter,
} from '../../../hooks/useSpaLocation';
import {
  getPendingSpatialRouteTarget,
  setPendingSpatialNavigationHref,
} from '../../../utils/spatialRoute';
import type { SpatialScale } from '../../../utils/referenceFrameOrientation';
import {
  useCrossScaleReadySwap,
  useRequestedSpatialTarget,
} from './useCrossScaleReadySwap';

function TargetProbe(props: {
  fallbackScope: SpatialScale;
  fallbackTargetId?: string;
  isSpatialSceneMounted: boolean;
}) {
  const result = useRequestedSpatialTarget(
    props.fallbackScope,
    props.fallbackTargetId,
    props.isSpatialSceneMounted,
  );
  return createElement('div', {
    'data-testid': 'target-probe',
    'data-scope': result.requestedScope,
    'data-target-id': result.requestedTargetId ?? '',
  });
}

describe('useCrossScaleReadySwap', () => {
  beforeEach(() => {
    vi.useRealTimers();
    setPendingSpatialNavigationHref(null);
  });

  afterEach(() => {
    vi.useRealTimers();
    setPendingSpatialNavigationHref(null);
  });

  it('resolves requested target from pending intent, pendingLocation, or current location with safe state narrowing', () => {
    let currentPathname = '/galaxy';
    let pendingLocation: unknown = { pathname: '/system/pending-target' };
    const historyListeners = new Set<() => void>();
    const mockRouter: AppRouterAdapter = {
      get state() {
        return {
          location: { pathname: currentPathname, searchStr: '' },
          pendingLocation,
        } as AppRouterAdapter['state'];
      },
      history: {
        subscribe: (cb) => {
          historyListeners.add(cb);
          return () => historyListeners.delete(cb);
        },
      },
    };

    const { rerender } = render(
      createElement(
        CanvasRouterBridgeContext.Provider,
        { value: mockRouter },
        createElement(TargetProbe, {
          fallbackScope: 'galaxy',
          fallbackTargetId: 'fallback-id',
          isSpatialSceneMounted: true,
        }),
      ),
    );

    expect(screen.getByTestId('target-probe')).toHaveAttribute('data-scope', 'system');
    expect(screen.getByTestId('target-probe')).toHaveAttribute(
      'data-target-id',
      'pending-target',
    );

    act(() => {
      pendingLocation = { pathname: 12345 };
      for (const listener of historyListeners) listener();
    });
    expect(screen.getByTestId('target-probe')).toHaveAttribute('data-scope', 'galaxy');

    act(() => {
      setPendingSpatialNavigationHref('/planet/intent-target');
    });
    expect(screen.getByTestId('target-probe')).toHaveAttribute('data-scope', 'planet');
    expect(screen.getByTestId('target-probe')).toHaveAttribute(
      'data-target-id',
      'intent-target',
    );

    act(() => {
      currentPathname = '/planet/intent-target';
      for (const listener of historyListeners) listener();
    });
    expect(getPendingSpatialRouteTarget()).toBeNull();

    rerender(
      createElement(
        CanvasRouterBridgeContext.Provider,
        { value: mockRouter },
        createElement(TargetProbe, {
          fallbackScope: 'galaxy',
          fallbackTargetId: 'fallback-id',
          isSpatialSceneMounted: false,
        }),
      ),
    );
    expect(screen.getByTestId('target-probe')).toHaveAttribute('data-scope', 'galaxy');
    expect(screen.getByTestId('target-probe')).toHaveAttribute('data-target-id', 'fallback-id');
  });

  it('commits immediately when ready, holds and flushes when waiting, and falls back after 800ms', () => {
    vi.useFakeTimers();
    const { result, unmount } = renderHook(() => useCrossScaleReadySwap());

    const immediateSwap = vi.fn();
    result.current.scheduleReadySwap(immediateSwap, () => false, () => true);
    expect(immediateSwap).toHaveBeenCalledTimes(1);

    const staleSwap = vi.fn();
    result.current.scheduleReadySwap(staleSwap, () => false, () => false);
    expect(staleSwap).not.toHaveBeenCalled();

    const flushedSwap = vi.fn();
    result.current.scheduleReadySwap(flushedSwap, () => true, () => true);
    expect(flushedSwap).not.toHaveBeenCalled();
    result.current.flushPendingReadySwap();
    expect(flushedSwap).toHaveBeenCalledTimes(1);

    const fallbackSwap = vi.fn();
    result.current.scheduleReadySwap(fallbackSwap, () => true, () => true);
    act(() => {
      vi.advanceTimersByTime(799);
    });
    expect(fallbackSwap).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(fallbackSwap).toHaveBeenCalledTimes(1);

    const cancelledSwap = vi.fn();
    result.current.scheduleReadySwap(cancelledSwap, () => true, () => true);
    result.current.clearPendingReadySwap();
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(cancelledSwap).not.toHaveBeenCalled();

    unmount();
  });
});
