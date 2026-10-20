import React, { useState } from 'react';
import { Button } from '../../interface';
import styles from './SpatialShell.module.css';

export interface SpatialShellProps {
  readonly testId?: string;
  readonly className?: string;
  readonly canvas?: React.ReactNode;
  readonly breadcrumbs?: React.ReactNode;
  readonly search?: React.ReactNode;
  readonly layerCard?: React.ReactNode;
  readonly primaryFloat?: React.ReactNode;
  readonly preview?: React.ReactNode;
  readonly controls?: React.ReactNode;
  readonly minimap?: React.ReactNode;
  readonly bodies?: React.ReactNode;
  readonly initialBodiesDrawerOpen?: boolean;
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
  preview,
  controls,
  minimap,
  bodies,
  initialBodiesDrawerOpen = false,
  children,
}) => {
  const [isBodiesDrawerOpen, setIsBodiesDrawerOpen] = useState(
    initialBodiesDrawerOpen,
  );

  const combinedClassName = className
    ? `${styles.spatialShell} ${className}`
    : styles.spatialShell;

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
            <div className={styles.topBarContent}>
              {breadcrumbs}
              {search}
              {layerCard}
            </div>
          </header>
          <div
            className={styles.floatingLeft}
            data-spatial-region="floating-left"
          >
            {primaryFloat}
            {preview}
          </div>
          <div className={styles.controlsRegion} data-spatial-region="controls">
            {controls}
          </div>
        </div>
        <div className={styles.topBarActions}>
          <Button
            size="sm"
            variant="default"
            data-testid="spatial-shell-bodies-toggle"
            aria-expanded={isBodiesDrawerOpen}
            onClick={() => setIsBodiesDrawerOpen((prev) => !prev)}
          >
            {isBodiesDrawerOpen ? 'Close Bodies' : 'Bodies'}
          </Button>
        </div>
        <div className={styles.minimapRegion} data-spatial-region="minimap">
          {minimap}
        </div>
      </div>
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
