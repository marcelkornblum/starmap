import React, { useEffect, useRef, useState } from 'react';
import { Button } from '../../interface';
import { useUIStore } from '../../../stores/useUIStore';
import styles from './SpatialShell.module.css';

export interface SpatialShellProps {
  readonly testId?: string;
  readonly className?: string;
  readonly canvas?: React.ReactNode;
  readonly breadcrumbs?: React.ReactNode;
  readonly search?: React.ReactNode;
  readonly layerCard?: React.ReactNode;
  readonly primaryFloat?: React.ReactNode;
  readonly detailsPanel?: React.ReactNode;
  readonly directionsPanel?: React.ReactNode;
  readonly preview?: React.ReactNode;
  readonly controls?: React.ReactNode;
  readonly minimap?: React.ReactNode;
  readonly bodies?: React.ReactNode;
  readonly initialBodiesDrawerOpen?: boolean;
  readonly isBodiesDrawerOpen?: boolean;
  readonly onBodiesDrawerOpenChange?: (isOpen: boolean) => void;
  readonly children?: React.ReactNode;
}

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
    return (
      <React.Fragment>
        {primaryPanelPriority === 'directions' ? (
          <>
            {directionsPanel}
            {detailsPanel}
          </>
        ) : (
          <>
            {detailsPanel}
            {directionsPanel}
          </>
        )}
      </React.Fragment>
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

export const SpatialShell: React.FC<SpatialShellProps> = ({
  testId = 'spatial-shell-root',
  className,
  canvas,
  breadcrumbs,
  search,
  layerCard,
  primaryFloat,
  detailsPanel,
  directionsPanel,
  preview,
  controls,
  minimap,
  bodies,
  initialBodiesDrawerOpen,
  isBodiesDrawerOpen: controlledBodiesOpen,
  onBodiesDrawerOpenChange,
  children,
}) => {
  const isDrawerExplicitlySetRef = useRef(false);
  const activeDrawer = useUIStore((s) => s.activeDrawer);
  const isStoreBodiesOpen = activeDrawer === 'bodies';
  const setActiveDrawer = useUIStore((s) => s.setActiveDrawer);

  const isDetailsOpen = useUIStore((s) => s.isDetailsOpen);
  const isDirectionsOpen = useUIStore((s) => s.isDirectionsOpen);
  const primaryPanelPriority = useUIStore((s) => s.primaryPanelPriority);
  const dualPanelPolicy = useUIStore((s) => s.dualPanelPolicy);
  const isWideViewport = useIsWideViewport();

  useEffect(() => {
    if (initialBodiesDrawerOpen !== undefined && !isDrawerExplicitlySetRef.current) {
      setActiveDrawer(initialBodiesDrawerOpen ? 'bodies' : null);
    }
  }, [initialBodiesDrawerOpen, setActiveDrawer]);

  const isBodiesDrawerOpen =
    controlledBodiesOpen !== undefined
      ? controlledBodiesOpen
      : initialBodiesDrawerOpen !== undefined && !isDrawerExplicitlySetRef.current
        ? initialBodiesDrawerOpen
        : isStoreBodiesOpen;

  const setDrawerState = (next: boolean) => {
    isDrawerExplicitlySetRef.current = true;
    setActiveDrawer(next ? 'bodies' : null);
    onBodiesDrawerOpenChange?.(next);
  };

  const handleToggle = () => {
    setDrawerState(!isBodiesDrawerOpen);
  };

  const handleClose = () => {
    setDrawerState(false);
  };

  const combinedClassName = className
    ? `${styles.spatialShell} ${className}`
    : styles.spatialShell;

  const resolvedPrimaryFloat = resolvePrimaryPanels({
    primaryFloat,
    detailsPanel,
    directionsPanel,
    isDetailsOpen,
    isDirectionsOpen,
    primaryPanelPriority,
    dualPanelPolicy,
    isWideViewport,
  });

  const isShowingDetails =
    Boolean(detailsPanel && isDetailsOpen) &&
    (!directionsPanel ||
      !isDirectionsOpen ||
      primaryPanelPriority === 'details' ||
      dualPanelPolicy === 'simultaneous' ||
      (dualPanelPolicy === 'auto' && isWideViewport));

  const resolvedPreview = isShowingDetails ? null : preview;

  return (
    <main
      className={combinedClassName}
      data-spatial-shell
      data-testid={testId}
      data-bodies-drawer-open={isBodiesDrawerOpen ? 'true' : 'false'}
    >
      <div className={styles.stage}>
        <div className={styles.canvasRegion} data-spatial-region="canvas">
          {canvas}
        </div>
        <div className={styles.leftColumn}>
          <header className={styles.topBar} data-spatial-region="top-bar">
            <div
              className={styles.breadcrumbsRegion}
              data-spatial-region="breadcrumbs"
            >
              {breadcrumbs}
            </div>
            <div className={styles.searchRegion} data-spatial-region="search">
              {search}
            </div>
            <div
              className={styles.layerCardRegion}
              data-spatial-region="layer-card"
            >
              {layerCard}
            </div>
          </header>
          <div
            className={styles.floatingLeft}
            data-spatial-region="floating-left"
          >
            {resolvedPrimaryFloat}
            {resolvedPreview}
          </div>
        </div>
        <div className={styles.topBarActions}>
          <Button
            size="sm"
            variant={isBodiesDrawerOpen ? 'primary' : 'default'}
            data-testid="spatial-shell-bodies-toggle"
            aria-expanded={isBodiesDrawerOpen}
            onClick={handleToggle}
          >
            {isBodiesDrawerOpen ? 'Close Bodies' : 'Bodies'}
          </Button>
        </div>
        <div className={styles.minimapRegion} data-spatial-region="minimap">
          {minimap}
        </div>
        <div className={styles.controlsRegion} data-spatial-region="controls">
          {controls}
        </div>
      </div>
      <div
        className={styles.bodiesBackdrop}
        data-testid="spatial-shell-bodies-backdrop"
        data-bodies-drawer-open={isBodiesDrawerOpen ? 'true' : 'false'}
        onClick={handleClose}
        aria-hidden="true"
      />
      <aside
        className={styles.bodiesRegion}
        data-spatial-region="bodies"
        data-bodies-drawer-open={isBodiesDrawerOpen ? 'true' : 'false'}
      >
        {bodies}
      </aside>
      {children}
    </main>
  );
};
