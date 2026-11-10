import React, { useCallback } from 'react';
import { Outlet } from '@tanstack/react-router';
import { RootCanvasHost } from '../components/domain/CanvasLayer';
import { ThemeTokenBridge } from '../components/canvas/ThemeTokenBridge';
import { SpatialEntityProvider } from '../components/canvas/entity/SpatialEntityContext';
import { handleSpaNavigation } from '../hooks/spaNavigation';

export const RootLayout: React.FC = () => {
  const handleRootClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as Element | null;
    const anchor = target?.closest?.('a[href]') as HTMLAnchorElement | null;
    if (!anchor) return;
    if (anchor.target && anchor.target !== '_self') return;
    if (anchor.hasAttribute('download')) return;
    const href = anchor.getAttribute('href');
    if (!href) return;
    handleSpaNavigation(event, href);
  }, []);

  return (
    <SpatialEntityProvider>
      <div id="starmap-app-root" onClickCapture={handleRootClick}>
        <ThemeTokenBridge />
        <RootCanvasHost />
        <Outlet />
      </div>
    </SpatialEntityProvider>
  );
};
