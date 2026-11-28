import React, { memo, useEffect, useRef, type RefObject } from 'react';
import { Button, Heading, Icon } from '../../interface';
import {
  DESKTOP_DOCK_BREAKPOINT_PX,
  shouldCloseBodiesDrawerOnClick,
} from './spatialShellHelpers';
import styles from './SpatialShell.module.css';

const TOUCH_SWIPE_DISMISS_THRESHOLD_PX = 48;

export const BodiesOrbitalIcon = (): React.ReactNode => (
  <Icon size="sm">
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <ellipse cx="8" cy="8" rx="6.25" ry="3.25" transform="rotate(-28 8 8)" />
      <circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12.6" cy="5.4" r="1.35" fill="currentColor" stroke="none" />
    </svg>
  </Icon>
);

export interface SpatialShellBodiesDrawerProps {
  readonly bodies?: React.ReactNode;
  readonly bodiesRegionRef: RefObject<HTMLElement | null>;
  readonly isBodiesDrawerOpen: boolean;
  readonly onClose: () => void;
}

export const SpatialShellBodiesDrawer = memo(function SpatialShellBodiesDrawer({
  bodies,
  bodiesRegionRef,
  isBodiesDrawerOpen,
  onClose,
}: SpatialShellBodiesDrawerProps) {
  const touchStartRef = useRef<{ readonly x: number; readonly y: number } | null>(null);

  useEffect(() => {
    if (!isBodiesDrawerOpen || typeof window === 'undefined') {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && window.innerWidth < DESKTOP_DOCK_BREAKPOINT_PX) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isBodiesDrawerOpen, onClose]);

  const handleTouchStart = (event: React.TouchEvent<HTMLElement>) => {
    if (
      typeof window === 'undefined' ||
      window.innerWidth >= DESKTOP_DOCK_BREAKPOINT_PX ||
      !isBodiesDrawerOpen
    ) {
      touchStartRef.current = null;
      return;
    }
    const touch = event.touches[0];
    touchStartRef.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLElement>) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (
      !start ||
      typeof window === 'undefined' ||
      window.innerWidth >= DESKTOP_DOCK_BREAKPOINT_PX ||
      !isBodiesDrawerOpen
    ) {
      return;
    }
    const touch = event.changedTouches[0];
    if (!touch) return;
    const deltaX = touch.clientX - start.x;
    const deltaY = Math.abs(touch.clientY - start.y);
    if (deltaX > TOUCH_SWIPE_DISMISS_THRESHOLD_PX && deltaX > deltaY * 1.5) {
      onClose();
    }
  };

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    if (typeof window === 'undefined' || !isBodiesDrawerOpen) {
      return;
    }
    if (shouldCloseBodiesDrawerOnClick(event.target, window.innerWidth)) {
      onClose();
    }
  };

  return (
    <>
      <div
        className={styles.bodiesBackdrop}
        data-testid="spatial-shell-bodies-backdrop"
        data-bodies-drawer-open={isBodiesDrawerOpen ? 'true' : 'false'}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        ref={bodiesRegionRef}
        className={styles.bodiesRegion}
        aria-label="Objects in view"
        data-spatial-region="bodies"
        data-bodies-drawer-open={isBodiesDrawerOpen ? 'true' : 'false'}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={handleClick}
      >
        <div className={styles.bodiesDrawerHeader}>
          <Heading as="h2" size="eyebrow">
            Objects in View
          </Heading>
          <Button
            variant="subtle"
            size="sm"
            onClick={onClose}
            aria-label="Close objects in view drawer"
            data-testid="spatial-shell-bodies-close"
          >
            <Icon size="sm">
              <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M3 3L9 9M9 3L3 9" />
              </svg>
            </Icon>
          </Button>
        </div>
        {bodies}
      </aside>
    </>
  );
});

SpatialShellBodiesDrawer.displayName = 'SpatialShellBodiesDrawer';
