import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useKeyboardShortcuts } from '../../../hooks/useKeyboardShortcuts';
import { useUIStore } from '../../../stores/useUIStore';

export function useSpatialKeyboardShortcuts(enabled: boolean): void {
  const options = useMemo(() => ({ enabled }), [enabled]);
  useKeyboardShortcuts(options);
}

export const DESKTOP_DOCK_BREAKPOINT_PX = 1280;

export interface ResolvePrimaryPanelsOptions {
  readonly detailsPanel?: React.ReactNode;
  readonly directionsPanel?: React.ReactNode;
  readonly isDetailsOpen?: boolean;
  readonly isDirectionsOpen?: boolean;
  readonly primaryPanelPriority?: 'details' | 'directions';
  readonly dualPanelPolicy?: 'auto' | 'single' | 'simultaneous';
  readonly isWideViewport?: boolean;
}

export interface ResolvePrimaryPanelsMetaResult {
  readonly content: React.ReactNode;
  readonly isShowingDetails: boolean;
}

export function resolvePrimaryPanelsMeta({
  detailsPanel,
  directionsPanel,
  isDetailsOpen = true,
  isDirectionsOpen = true,
  primaryPanelPriority = 'directions',
  dualPanelPolicy = 'auto',
  isWideViewport = false,
}: ResolvePrimaryPanelsOptions): ResolvePrimaryPanelsMetaResult {
  const showDetails = Boolean(detailsPanel && isDetailsOpen);
  const showDirections = Boolean(directionsPanel && isDirectionsOpen);

  if (!showDetails && !showDirections) {
    return { content: null, isShowingDetails: false };
  }
  if (showDetails && !showDirections) {
    return { content: detailsPanel, isShowingDetails: true };
  }
  if (!showDetails && showDirections) {
    return { content: directionsPanel, isShowingDetails: false };
  }

  const isSimultaneous =
    dualPanelPolicy === 'simultaneous' || (dualPanelPolicy === 'auto' && isWideViewport);

  if (isSimultaneous) {
    const content = React.createElement(
      React.Fragment,
      null,
      primaryPanelPriority === 'directions'
        ? React.createElement(React.Fragment, null, directionsPanel, detailsPanel)
        : React.createElement(React.Fragment, null, detailsPanel, directionsPanel),
    );
    return { content, isShowingDetails: true };
  }

  const isShowingDetails = primaryPanelPriority === 'details';
  return {
    content: isShowingDetails ? detailsPanel : directionsPanel,
    isShowingDetails,
  };
}

export function resolvePrimaryPanels(options: ResolvePrimaryPanelsOptions): React.ReactNode {
  return resolvePrimaryPanelsMeta(options).content;
}

export function useIsWideViewport(): boolean {
  const [isWide, setIsWide] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return typeof window.matchMedia === 'function'
      ? window.matchMedia('(min-width: 1920px)').matches
      : window.innerWidth >= 1920;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const mql = window.matchMedia('(min-width: 1920px)');
    const onChange = (e: MediaQueryListEvent) => {
      setIsWide(e.matches);
    };
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    } else if (typeof mql.addListener === 'function') {
      mql.addListener(onChange);
      return () => mql.removeListener(onChange);
    }
  }, []);

  return isWide;
}

export function isSpatialMapPath(pathname: string): boolean {
  return (
    pathname === '/' ||
    pathname === '/galaxy' ||
    pathname.startsWith('/system/') ||
    pathname.startsWith('/planet/')
  );
}

export interface ResolveConsoleDockConfigOptions {
  readonly mode: 'spatial' | 'document';
  readonly activeWorkspace?: 'map' | 'discover' | 'guide';
  readonly companionMapHref?: string;
  readonly lastMapHref: string;
  readonly pathname: string;
  readonly locationSearch?: string;
  readonly isDiscoverOpen: boolean;
}

export function resolveConsoleDockConfig({
  mode,
  activeWorkspace,
  companionMapHref,
  lastMapHref,
  pathname,
  locationSearch,
  isDiscoverOpen,
}: ResolveConsoleDockConfigOptions): {
  readonly activeItem: 'map' | 'discover' | 'guide';
  readonly mapHref: string;
  readonly guideHref: string;
} {
  const activeItem = isDiscoverOpen
    ? 'discover'
    : activeWorkspace ?? (mode === 'document' && pathname.startsWith('/guide') ? 'guide' : 'map');

  const mapHref =
    mode === 'document'
      ? lastMapHref && lastMapHref !== '/galaxy'
        ? lastMapHref
        : (companionMapHref ?? lastMapHref ?? '/galaxy')
      : isDiscoverOpen && isSpatialMapPath(pathname)
        ? `${pathname}${locationSearch ?? ''}`
        : '/galaxy';

  return {
    activeItem,
    mapHref,
    guideHref: '/guide/star-types',
  };
}

export function shouldCloseBodiesDrawerOnClick(
  target: EventTarget | null,
  viewportWidth: number,
): boolean {
  if (viewportWidth >= DESKTOP_DOCK_BREAKPOINT_PX) {
    return false;
  }
  const el = target && typeof (target as Element).closest === 'function' ? (target as Element) : null;
  if (!el) {
    return false;
  }
  if (el.closest('[data-bodies-select="true"]')) {
    return true;
  }
  const anchor = el.closest('a[href]');
  if (!anchor) {
    return false;
  }
  if (anchor.getAttribute('data-stretch-link') === 'true') {
    return true;
  }
  const href = anchor.getAttribute('href') ?? '';
  return !href.startsWith('/guide/') && !href.includes('/guide/');
}

export function useSpatialShellBodiesDrawerState(
  initialBodiesDrawerOpen: boolean | undefined,
  controlledBodiesOpen: boolean | undefined,
  onBodiesDrawerOpenChange: ((isOpen: boolean) => void) | undefined,
) {
  const activeDrawer = useUIStore((s) => s.activeDrawer);
  const setActiveDrawer = useUIStore((s) => s.setActiveDrawer);
  const [isLocallyOverridden, setIsLocallyOverridden] = useState(false);
  const [initialStoreDrawer] = useState(activeDrawer);

  useEffect(() => {
    if (controlledBodiesOpen === undefined && initialBodiesDrawerOpen !== undefined && !isLocallyOverridden) {
      setActiveDrawer(initialBodiesDrawerOpen ? 'bodies' : null);
    }
  }, [controlledBodiesOpen, initialBodiesDrawerOpen, isLocallyOverridden, setActiveDrawer]);

  const isBodiesDrawerOpen =
    controlledBodiesOpen !== undefined
      ? controlledBodiesOpen
      : initialBodiesDrawerOpen !== undefined && !isLocallyOverridden && activeDrawer === initialStoreDrawer
        ? initialBodiesDrawerOpen
        : activeDrawer === 'bodies';

  const setDrawerState = useCallback(
    (next: boolean) => {
      setIsLocallyOverridden(true);
      if (controlledBodiesOpen !== undefined) {
        onBodiesDrawerOpenChange?.(next);
      } else {
        setActiveDrawer(next ? 'bodies' : null);
        onBodiesDrawerOpenChange?.(next);
      }
    },
    [controlledBodiesOpen, onBodiesDrawerOpenChange, setActiveDrawer],
  );

  const handleToggle = useCallback(() => setDrawerState(!isBodiesDrawerOpen), [isBodiesDrawerOpen, setDrawerState]);
  const handleClose = useCallback(() => setDrawerState(false), [setDrawerState]);

  return { isBodiesDrawerOpen, handleToggle, handleClose };
}
