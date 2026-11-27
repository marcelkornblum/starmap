import React, { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { Button } from '../../interface';
import { useIsomorphicLayoutEffect } from '../../../hooks/useIsomorphicLayoutEffect';
import { useLayerIndex } from '../../../hooks/useLayerData';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import { handleSpaNavigation } from '../../../hooks/spaNavigation';
import { useOptionalRouter, useSpaLocation } from '../../../hooks/useSpaLocation';
import type { MinimapOrientationSummary } from '../../../services/details/detailsNavigationTypes';
import { extractUrlLayerId } from '../../../services/search/searchUrlSelection';
import { useUIStore } from '../../../stores/useUIStore';
import { resolveAppHref } from '../../../utils/url';
import { ConsoleDock } from '../ConsoleDock';
import { DiscoverPanel } from '../DiscoverPanel';
import { VisorScalePill } from '../VisorScalePill';
import { SpatialShellBodiesDrawer } from './spatialShellBodiesDrawer';
import {
  isSpatialMapPath,
  resolveConsoleDockConfig,
  resolvePrimaryPanelsMeta,
  useIsWideViewport,
  useSpatialKeyboardShortcuts,
  useSpatialShellBodiesDrawerState,
} from './spatialShellHelpers';
import { useViewportSafeRectObserver } from './useViewportSafeRectObserver';
import styles from './SpatialShell.module.css';

export interface SpatialShellProps {
  readonly testId?: string;
  readonly mode?: 'spatial' | 'document';
  readonly activeWorkspace?: 'map' | 'discover' | 'guide';
  readonly companionMapHref?: string;
  readonly minimapOrientation?: MinimapOrientationSummary | null;
  readonly canvas?: React.ReactNode;
  readonly breadcrumbs?: React.ReactNode;
  readonly search?: React.ReactNode;
  readonly layerCard?: React.ReactNode;
  readonly detailsPanel?: React.ReactNode;
  readonly directionsPanel?: React.ReactNode;
  readonly preview?: React.ReactNode;
  readonly minimap?: React.ReactNode;
  readonly bodies?: React.ReactNode;
  readonly initialBodiesDrawerOpen?: boolean;
  readonly isBodiesDrawerOpen?: boolean;
  readonly onBodiesDrawerOpenChange?: (isOpen: boolean) => void;
  readonly children?: React.ReactNode;
  readonly [key: `data-${string}`]: string | undefined;
}

export const SpatialShell: React.FC<SpatialShellProps> = memo(function SpatialShell({
  testId = 'spatial-shell-root',
  mode = 'spatial',
  activeWorkspace,
  companionMapHref,
  minimapOrientation,
  canvas,
  breadcrumbs,
  search,
  layerCard,
  detailsPanel,
  directionsPanel,
  preview,
  minimap,
  bodies,
  initialBodiesDrawerOpen,
  isBodiesDrawerOpen: controlledBodiesOpen,
  onBodiesDrawerOpenChange,
  children,
  ...rest
}) {
  const router = useOptionalRouter();
  const { pathname, search: locationSearch } = useSpaLocation();
  const layerIndex = useLayerIndex();

  const isDiscoverOpen = useUIStore((s) => s.isDiscoverOpen);
  const setDiscoverOpen = useUIStore((s) => s.setDiscoverOpen);
  const toggleDiscover = useUIStore((s) => s.toggleDiscover);
  const lastMapHref = useUIStore((s) => s.lastMapHref);

  const isDetailsOpen = useUIStore((s) => s.isDetailsOpen);
  const isDirectionsOpen = useUIStore((s) => s.isDirectionsOpen);
  const primaryPanelPriority = useUIStore((s) => s.primaryPanelPriority);
  const dualPanelPolicy = useUIStore((s) => s.dualPanelPolicy);
  const prefersReducedMotion = useReducedMotion();
  const isWideViewport = useIsWideViewport();

  const shellRef = useRef<HTMLElement>(null);
  const topBarRef = useRef<HTMLElement>(null);
  const floatingLeftRef = useRef<HTMLDivElement>(null);
  const bodiesRegionRef = useRef<HTMLElement>(null);
  const minimapRegionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mode === 'spatial' && isSpatialMapPath(pathname)) {
      useUIStore.getState().setLastMapHref(`${pathname}${locationSearch}`);
    }
  }, [mode, pathname, locationSearch]);

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

  const { isBodiesDrawerOpen, handleToggle, handleClose } = useSpatialShellBodiesDrawerState(
    initialBodiesDrawerOpen,
    controlledBodiesOpen,
    onBodiesDrawerOpenChange,
  );

  useSpatialKeyboardShortcuts(mode === 'spatial');
  useViewportSafeRectObserver({ shellRef, topBarRef, floatingLeftRef, bodiesRegionRef }, isBodiesDrawerOpen);

  const dockConfig = useMemo(
    () => resolveConsoleDockConfig({ mode, activeWorkspace, companionMapHref, lastMapHref, pathname, isDiscoverOpen }),
    [mode, activeWorkspace, companionMapHref, lastMapHref, pathname, isDiscoverOpen],
  );

  const handleToggleDiscover = useCallback(
    (event?: React.MouseEvent<HTMLElement>) => {
      if (mode === 'document') {
        setDiscoverOpen(true);
        if (event) {
          handleSpaNavigation(event, dockConfig.mapHref, router);
        } else {
          const targetHref = resolveAppHref(dockConfig.mapHref) ?? dockConfig.mapHref;
          if (router && typeof router.navigate === 'function') {
            void router.navigate({ href: targetHref });
          } else if (router?.history?.push) {
            router.history.push(targetHref);
          }
        }
        return;
      }

      toggleDiscover();
      if (isBodiesDrawerOpen) {
        handleClose();
      }
    },
    [mode, setDiscoverOpen, dockConfig.mapHref, router, toggleDiscover, isBodiesDrawerOpen, handleClose],
  );

  const handleNavigateItem = useCallback(() => {
    setDiscoverOpen(false);
  }, [setDiscoverOpen]);

  const activeLayerSlug = useMemo(
    () => extractUrlLayerId(locationSearch, layerIndex),
    [locationSearch, layerIndex],
  );

  const { content: resolvedPrimaryFloat, isShowingDetails } = resolvePrimaryPanelsMeta({
    detailsPanel,
    directionsPanel,
    isDetailsOpen,
    isDirectionsOpen,
    primaryPanelPriority,
    dualPanelPolicy,
    isWideViewport,
  });

  const resolvedPreview = isShowingDetails ? null : preview;

  const ssrInFlightAttr =
    typeof window === 'undefined'
      ? useUIStore.getState().isCameraTransitioning && !prefersReducedMotion
        ? 'true'
        : 'false'
      : undefined;

  return (
    <main
      {...rest}
      ref={shellRef}
      className={styles.spatialShell}
      data-spatial-shell
      data-testid={testId}
      data-mode={mode}
      data-bodies-drawer-open={isBodiesDrawerOpen ? 'true' : 'false'}
      data-camera-in-flight={ssrInFlightAttr}
    >
      <div className={styles.dockRegion} data-spatial-region="console-dock">
        <ConsoleDock
          activeItem={dockConfig.activeItem}
          mapHref={dockConfig.mapHref}
          guideHref={dockConfig.guideHref}
          isDiscoverOpen={isDiscoverOpen}
          onToggleDiscover={handleToggleDiscover}
          onNavigateItem={handleNavigateItem}
        />
      </div>

      {mode === 'document' ? (
        <div className={styles.documentRegion} data-spatial-region="document">
          {children}
        </div>
      ) : (
        <>
          <div className={styles.stage} data-detent-stage="true">
            <div className={styles.canvasRegion} data-spatial-region="canvas">
              {canvas}
            </div>
            <div className={styles.leftColumn}>
              <header ref={topBarRef} className={styles.topBar} data-spatial-region="top-bar">
                <div className={styles.visorTopRow} data-spatial-region="visor-top-row">
                  <div className={styles.breadcrumbsRegion} data-spatial-region="breadcrumbs">
                    {breadcrumbs}
                  </div>
                  <div className={styles.visorScaleRegion} data-spatial-region="visor-scale">
                    {minimapOrientation ? <VisorScalePill orientation={minimapOrientation} /> : null}
                  </div>
                </div>
                <div className={styles.visorDiscoveryRow} data-spatial-region="visor-discovery-row">
                  <div className={styles.searchRegion} data-spatial-region="search">
                    {search}
                  </div>
                  {bodies ? (
                    <div className={styles.bodiesTriggerRegion} data-spatial-region="bodies-trigger">
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
                  ) : null}
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
                {isDiscoverOpen ? (
                  <div className={styles.discoverSurface}>
                    <DiscoverPanel
                      activeLayerSlug={activeLayerSlug}
                      onClose={() => setDiscoverOpen(false)}
                      onSelectLayer={() => setDiscoverOpen(false)}
                    />
                  </div>
                ) : (
                  <>
                    {resolvedPrimaryFloat}
                    {resolvedPreview}
                  </>
                )}
              </div>
            </div>
            <div
              ref={minimapRegionRef}
              className={styles.minimapRegion}
              data-spatial-region="minimap"
              data-camera-retracted={ssrInFlightAttr}
            >
              {minimap}
            </div>
          </div>
          <SpatialShellBodiesDrawer
            bodies={bodies}
            bodiesRegionRef={bodiesRegionRef}
            isBodiesDrawerOpen={isBodiesDrawerOpen}
            onClose={handleClose}
          />
          {children}
        </>
      )}
    </main>
  );
});

SpatialShell.displayName = 'SpatialShell';
