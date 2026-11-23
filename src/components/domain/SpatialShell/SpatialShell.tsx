import React, { memo, useEffect, useRef, useState } from 'react';
import { Button } from '../../interface';
import { useIsomorphicLayoutEffect } from '../../../hooks/useIsomorphicLayoutEffect';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import { useUIStore } from '../../../stores/useUIStore';
import { resolvePrimaryPanels, useIsWideViewport } from './spatialShellHelpers';
import { useViewportSafeRectObserver } from './useViewportSafeRectObserver';
import styles from './SpatialShell.module.css';

export interface SpatialShellProps {
  readonly testId?: string;
  readonly canvas?: React.ReactNode;
  readonly breadcrumbs?: React.ReactNode;
  readonly search?: React.ReactNode;
  readonly layerCard?: React.ReactNode;
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

export const SpatialShell: React.FC<SpatialShellProps> = memo(function SpatialShell({
  testId = 'spatial-shell-root',
  canvas,
  breadcrumbs,
  search,
  layerCard,
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
}) {
  const activeDrawer = useUIStore((s) => s.activeDrawer);
  const isStoreBodiesOpen = activeDrawer === 'bodies';
  const setActiveDrawer = useUIStore((s) => s.setActiveDrawer);

  const isDetailsOpen = useUIStore((s) => s.isDetailsOpen);
  const isDirectionsOpen = useUIStore((s) => s.isDirectionsOpen);
  const primaryPanelPriority = useUIStore((s) => s.primaryPanelPriority);
  const dualPanelPolicy = useUIStore((s) => s.dualPanelPolicy);
  const prefersReducedMotion = useReducedMotion();
  const isWideViewport = useIsWideViewport();

  const shellRef = useRef<HTMLElement>(null);
  const topBarRef = useRef<HTMLElement>(null);
  const floatingLeftRef = useRef<HTMLDivElement>(null);
  const minimapRegionRef = useRef<HTMLDivElement>(null);
  const bodiesRegionRef = useRef<HTMLElement>(null);
  const controlsRegionRef = useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    const applyInFlightAttr = (inFlight: boolean) => {
      const attrValue = inFlight && !prefersReducedMotion ? 'true' : 'false';
      shellRef.current?.setAttribute('data-camera-in-flight', attrValue);
      floatingLeftRef.current?.setAttribute('data-camera-retracted', attrValue);
      minimapRegionRef.current?.setAttribute('data-camera-retracted', attrValue);
    };
    applyInFlightAttr(useUIStore.getState().isCameraTransitioning);
    let prev = useUIStore.getState().isCameraTransitioning;
    return useUIStore.subscribe((state) => {
      if (state.isCameraTransitioning !== prev) {
        prev = state.isCameraTransitioning;
        applyInFlightAttr(state.isCameraTransitioning);
      }
    });
  }, [prefersReducedMotion]);

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
        : isStoreBodiesOpen;

  useViewportSafeRectObserver(
    {
      shellRef,
      topBarRef,
      floatingLeftRef,
      bodiesRegionRef,
      controlsRegionRef,
    },
    isBodiesDrawerOpen,
  );

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

  const resolvedPrimaryFloat = resolvePrimaryPanels({
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

  const ssrInFlightAttr =
    typeof window === 'undefined'
      ? useUIStore.getState().isCameraTransitioning && !prefersReducedMotion
        ? 'true'
        : 'false'
      : undefined;

  return (
    <main
      ref={shellRef}
      className={styles.spatialShell}
      data-spatial-shell
      data-testid={testId}
      data-bodies-drawer-open={isBodiesDrawerOpen ? 'true' : 'false'}
      data-camera-in-flight={ssrInFlightAttr}
    >
      <div className={styles.stage}>
        <div className={styles.canvasRegion} data-spatial-region="canvas">
          {canvas}
        </div>
        <div className={styles.leftColumn}>
          <header ref={topBarRef} className={styles.topBar} data-spatial-region="top-bar">
            <div className={styles.breadcrumbsRegion} data-spatial-region="breadcrumbs">
              {breadcrumbs}
            </div>
            <div className={styles.searchRegion} data-spatial-region="search">
              {search}
            </div>
            <div className={styles.layerCardRegion} data-spatial-region="layer-card">
              {layerCard}
            </div>
          </header>
          <div
            ref={floatingLeftRef}
            className={styles.floatingLeft}
            data-spatial-region="floating-left"
            data-camera-retracted={ssrInFlightAttr}
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
        <div
          ref={minimapRegionRef}
          className={styles.minimapRegion}
          data-spatial-region="minimap"
          data-camera-retracted={ssrInFlightAttr}
        >
          {minimap}
        </div>
        <div ref={controlsRegionRef} className={styles.controlsRegion} data-spatial-region="controls">
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
        ref={bodiesRegionRef}
        className={styles.bodiesRegion}
        data-spatial-region="bodies"
        data-bodies-drawer-open={isBodiesDrawerOpen ? 'true' : 'false'}
      >
        {bodies}
      </aside>
      {children}
    </main>
  );
});

SpatialShell.displayName = 'SpatialShell';
