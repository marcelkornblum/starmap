import React, { useEffect, useState } from 'react';

export interface ResolvePrimaryPanelsOptions {
  readonly primaryFloat?: React.ReactNode;
  readonly detailsPanel?: React.ReactNode;
  readonly directionsPanel?: React.ReactNode;
  readonly isDetailsOpen?: boolean;
  readonly isDirectionsOpen?: boolean;
  readonly primaryPanelPriority?: 'details' | 'directions';
  readonly dualPanelPolicy?: 'auto' | 'single' | 'simultaneous';
  readonly isWideViewport?: boolean;
}

export function resolvePrimaryPanels({
  primaryFloat,
  detailsPanel,
  directionsPanel,
  isDetailsOpen = true,
  isDirectionsOpen = true,
  primaryPanelPriority = 'directions',
  dualPanelPolicy = 'auto',
  isWideViewport = false,
}: ResolvePrimaryPanelsOptions): React.ReactNode {
  // If primaryFloat is explicitly passed alone (e.g. in legacy unit tests), render primaryFloat.
  if (primaryFloat !== undefined && detailsPanel === undefined && directionsPanel === undefined) {
    return primaryFloat;
  }

  // Filter by isDetailsOpen and isDirectionsOpen
  const showDetails = Boolean(detailsPanel && isDetailsOpen);
  const showDirections = Boolean(directionsPanel && isDirectionsOpen);

  // If neither is available/open
  if (!showDetails && !showDirections) {
    return primaryFloat ?? null;
  }

  // If only one is available/open, render that one
  if (showDetails && !showDirections) {
    return detailsPanel;
  }
  if (!showDetails && showDirections) {
    return directionsPanel;
  }

  // Both are available and open:
  const isSimultaneous =
    dualPanelPolicy === 'simultaneous' || (dualPanelPolicy === 'auto' && isWideViewport);

  if (isSimultaneous) {
    // Render both panels in priority order inside the primary float region!
    return React.createElement(
      React.Fragment,
      null,
      primaryPanelPriority === 'directions'
        ? React.createElement(React.Fragment, null, directionsPanel, detailsPanel)
        : React.createElement(React.Fragment, null, detailsPanel, directionsPanel),
    );
  }

  // When dualPanelPolicy === 'single' (or 'auto' on narrower viewports < 1920px),
  // render the panel matching primaryPanelPriority
  return primaryPanelPriority === 'directions' ? directionsPanel : detailsPanel;
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
