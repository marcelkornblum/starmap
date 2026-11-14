import React, { useEffect, useState } from 'react';
import { Button } from '../../interface';
import { useUIStore } from '../../../stores/useUIStore';
import { resolvePrimaryPanels, useIsWideViewport } from './spatialShellHelpers';
import styles from './SpatialShell.module.css';

export type { ResolvePrimaryPanelsOptions } from './spatialShellHelpers';

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
  const activeDrawer = useUIStore((s) => s.activeDrawer);
  const isStoreBodiesOpen = activeDrawer === 'bodies';
  const setActiveDrawer = useUIStore((s) => s.setActiveDrawer);

  const isDetailsOpen = useUIStore((s) => s.isDetailsOpen);
  const isDirectionsOpen = useUIStore((s) => s.isDirectionsOpen);
  const primaryPanelPriority = useUIStore((s) => s.primaryPanelPriority);
  const dualPanelPolicy = useUIStore((s) => s.dualPanelPolicy);
  const isWideViewport = useIsWideViewport();

  const [isLocallyOverridden, setIsLocallyOverridden] = useState(false);
  const [initialStoreDrawer] = useState(activeDrawer);

  // Synchronise store on mount if an initial uncontrolled drawer state was provided
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
        : isStoreBodiesOpen;

  const setDrawerState = (next: boolean) => {
    setIsLocallyOverridden(true);
    if (controlledBodiesOpen !== undefined) {
      onBodiesDrawerOpenChange?.(next);
    } else {
      setActiveDrawer(next ? 'bodies' : null);
      onBodiesDrawerOpenChange?.(next);
    }
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
