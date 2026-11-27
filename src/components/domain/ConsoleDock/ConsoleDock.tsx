import React, { type ReactNode } from 'react';
import { Button, Dock, Icon } from '../../interface';
import styles from './ConsoleDock.module.css';

export interface ConsoleDockProps {
  readonly activeItem: 'map' | 'discover' | 'guide';
  readonly mapHref?: string;
  readonly guideHref?: string;
  readonly isDiscoverOpen?: boolean;
  readonly onToggleDiscover?: (e: React.MouseEvent<HTMLElement>) => void;
  readonly onNavigateItem?: (item: 'map' | 'guide') => void;
}

const MapIcon = (): ReactNode => (
  <Icon size="md">
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="6.5" />
      <circle cx="10" cy="10" r="1.5" />
      <line x1="10" y1="1.5" x2="10" y2="4.5" />
      <line x1="10" y1="15.5" x2="10" y2="18.5" />
      <line x1="1.5" y1="10" x2="4.5" y2="10" />
      <line x1="15.5" y1="10" x2="18.5" y2="10" />
    </svg>
  </Icon>
);

const DiscoverIcon = (): ReactNode => (
  <Icon size="md">
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 2.5L12.5 7.5L17.5 10L12.5 12.5L10 17.5L7.5 12.5L2.5 10L7.5 7.5Z" />
    </svg>
  </Icon>
);

const GuideIcon = (): ReactNode => (
  <Icon size="md">
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 4.5C3 3.9 3.4 3.5 4 3.5H8.5C9.3 3.5 10 4.2 10 5V16.5C10 15.9 9.5 15.5 8.8 15.5H4C3.4 15.5 3 15.1 3 14.5V4.5Z" />
      <path d="M17 4.5C17 3.9 16.6 3.5 16 3.5H11.5C10.7 3.5 10 4.2 10 5V16.5C10 15.9 10.5 15.5 11.2 15.5H16C16.6 15.5 17 15.1 17 14.5V4.5Z" />
    </svg>
  </Icon>
);

export const ConsoleDock = React.memo(function ConsoleDock({
  activeItem,
  mapHref = '/galaxy',
  guideHref = '/guide/star-types',
  isDiscoverOpen,
  onToggleDiscover,
  onNavigateItem,
}: ConsoleDockProps): ReactNode {
  const isMapActive = activeItem === 'map';
  const isDiscoverActive = activeItem === 'discover' || Boolean(isDiscoverOpen);
  const isGuideActive = activeItem === 'guide';

  const handleNavClick = (item: 'map' | 'guide') =>
    onNavigateItem
      ? (e: React.MouseEvent<HTMLElement>) => {
          if (e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
            onNavigateItem(item);
          }
        }
      : undefined;

  return (
    <Dock padded={false}>
      <nav
        aria-label="Primary navigation"
        className={styles.consoleDock}
        data-testid="console-dock"
      >
        <Button
          variant={isMapActive ? 'primary' : 'subtle'}
          href={mapHref}
          onClick={handleNavClick('map')}
          aria-current={isMapActive ? 'page' : undefined}
          data-dock-item=""
          data-active={isMapActive ? 'true' : undefined}
          data-testid="console-dock-map"
        >
          <MapIcon />
          <span className={styles.label}>Map</span>
        </Button>

        <Button
          variant={isDiscoverActive ? 'primary' : 'subtle'}
          onClick={onToggleDiscover}
          aria-pressed={onToggleDiscover ? Boolean(isDiscoverOpen) : undefined}
          aria-current={!onToggleDiscover && activeItem === 'discover' ? 'page' : undefined}
          data-dock-item=""
          data-active={isDiscoverActive ? 'true' : undefined}
          data-testid="console-dock-discover"
        >
          <DiscoverIcon />
          <span className={styles.label}>Discover</span>
        </Button>

        <Button
          variant={isGuideActive ? 'primary' : 'subtle'}
          href={guideHref}
          onClick={handleNavClick('guide')}
          aria-current={isGuideActive ? 'page' : undefined}
          data-dock-item=""
          data-active={isGuideActive ? 'true' : undefined}
          data-testid="console-dock-guide"
        >
          <GuideIcon />
          <span className={styles.label}>Guide</span>
        </Button>
      </nav>
    </Dock>
  );
});

ConsoleDock.displayName = 'ConsoleDock';
