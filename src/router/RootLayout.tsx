import React, { Suspense, lazy, useCallback } from 'react';
import { Outlet } from '@tanstack/react-router';
import { RootCanvasHost } from '../components/domain/CanvasLayer';
import { RootCanvasStageContext } from '../components/domain/CanvasLayer/RootCanvasStageContext';
import { preloadGuideListViews } from '../services/navigation/guidePreloader';
import { preloadTargetScaleEntry } from '../services/navigation/scalePreloader';
import { ThemeTokenBridge } from '../components/canvas/ThemeTokenBridge';
import { SpatialEntityProvider } from '../components/canvas/entity/SpatialEntityProvider';
import { handleSpaNavigation } from '../hooks/spaNavigation';
import { useOptionalRouter, useSpaLocation } from '../hooks/useSpaLocation';
import { parseSpatialRouteTarget } from '../utils/spatialRoute';

const LazyGalaxyView = lazy(() =>
  import('../views/GalaxyView').then((m) => ({ default: m.GalaxyView })),
);

export const RootLayout: React.FC = () => {
  const router = useOptionalRouter();
  const { pathname } = useSpaLocation(undefined, undefined, '', false);

  const handleRootClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.defaultPrevented) return;
      const target = event.target instanceof Element ? event.target : null;
      const anchorEl = target?.closest('a[href]');
      const anchor = anchorEl instanceof HTMLAnchorElement ? anchorEl : null;
      if (!anchor) return;
      if (anchor.target && anchor.target !== '_self') return;
      if (anchor.hasAttribute('download')) return;
      const href = anchor.getAttribute('href');
      if (!href) return;
      handleSpaNavigation(event, href, router);
    },
    [router],
  );

  const handleRootIntentPreload = useCallback(
    (event: React.SyntheticEvent<HTMLDivElement>) => {
      const target = event.target instanceof Element ? event.target : null;
      const anchorEl = target?.closest('a[href]');
      const anchor = anchorEl instanceof HTMLAnchorElement ? anchorEl : null;
      const href = anchor?.getAttribute('href');
      if (!href) return;
      const routeTarget = parseSpatialRouteTarget(href);
      if (routeTarget) {
        void preloadTargetScaleEntry(routeTarget.scope, routeTarget.targetId);
        return;
      }
      if (href.startsWith('/') && !href.startsWith('//')) {
        const toPath = href.split('?')[0]?.split('#')[0];
        if (
          toPath &&
          typeof (router as { preloadRoute?: unknown } | undefined)?.preloadRoute === 'function'
        ) {
          void (router as { preloadRoute: (opts: { to: string }) => Promise<unknown> })
            .preloadRoute({ to: toPath })
            .catch(() => {});
        }
        if (toPath?.startsWith('/guide')) {
          void preloadGuideListViews();
        }
      }
    },
    [router],
  );

  const hasRegisteredRouter = router?.state !== undefined;
  const isPersistentGalaxyRoute =
    hasRegisteredRouter && (pathname === '/' || pathname === '/galaxy');

  return (
    <SpatialEntityProvider>
      <div
        id="starmap-app-root"
        onClick={handleRootClick}
        onMouseOver={handleRootIntentPreload}
        onPointerDown={handleRootIntentPreload}
      >
        <ThemeTokenBridge />
        <RootCanvasStageContext.Provider value={true}>
          <RootCanvasHost />
          <Suspense fallback={null}>
            {isPersistentGalaxyRoute ? <LazyGalaxyView /> : <Outlet />}
          </Suspense>
        </RootCanvasStageContext.Provider>
      </div>
    </SpatialEntityProvider>
  );
};
