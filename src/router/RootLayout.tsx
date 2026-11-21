import React, { Suspense, lazy, useCallback } from 'react';
import { Outlet } from '@tanstack/react-router';
import { RootCanvasHost } from '../components/domain/CanvasLayer';
import { ThemeTokenBridge } from '../components/canvas/ThemeTokenBridge';
import { SpatialEntityProvider } from '../components/canvas/entity/SpatialEntityProvider';
import { handleSpaNavigation } from '../hooks/spaNavigation';
import { appRouter, useSpaLocation } from '../hooks/useSpaLocation';
import { RootCanvasStageContext } from '../stores/useCanvasStageStore';

const LazyGalaxyView = lazy(() =>
  import('../views/GalaxyView').then((m) => ({ default: m.GalaxyView })),
);

export const RootLayout: React.FC = () => {
  const { pathname } = useSpaLocation(undefined, undefined, '');

  const handleRootClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (event.defaultPrevented) return;
    const target = event.target as Element | null;
    const anchor = target?.closest?.('a[href]') as HTMLAnchorElement | null;
    if (!anchor) return;
    if (anchor.target && anchor.target !== '_self') return;
    if (anchor.hasAttribute('download')) return;
    const href = anchor.getAttribute('href');
    if (!href) return;
    handleSpaNavigation(event, href);
  }, []);

  const hasRegisteredRouter = appRouter.state !== undefined;
  const isPersistentGalaxyRoute =
    hasRegisteredRouter && (pathname === '/' || pathname === '/galaxy');

  return (
    <SpatialEntityProvider>
      <div id="starmap-app-root" onClick={handleRootClick}>
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
