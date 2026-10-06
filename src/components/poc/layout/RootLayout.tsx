import { useState, useEffect, useCallback } from 'react';
import type React from 'react';
import { Outlet, Link, useNavigate } from '@tanstack/react-router';
import { SceneProvider } from '../canvas/SceneBridge';
import { GlobalCanvas } from '../canvas/GlobalCanvas';
import { ThemeTokenBridge } from '../canvas/ThemeTokenBridge';
import { CommandPalette, type CommandPaletteItem } from '../domain';
import { Button } from '../primitives';
import styles from './RootLayout.module.css';

export interface RootLayoutProps {}

const DEFAULT_COMMAND_ITEMS: CommandPaletteItem[] = [
  {
    id: 'galaxy',
    title: 'Milky Way Atlas',
    subtitle: 'Top-level galactic neighborhood view',
    category: 'coordinate',
    badge: 'Atlas',
  },
  {
    id: 'sol',
    title: 'Sol System',
    subtitle: 'Yellow dwarf G2V with 8 planetary bodies',
    category: 'star',
    badge: 'G2V',
  },
  {
    id: 'earth',
    title: 'Earth',
    subtitle: 'Terrestrial world in Sol habitable zone',
    category: 'planet',
    badge: '1.0 AU',
  },
  {
    id: 'mars',
    title: 'Mars',
    subtitle: 'Terrestrial world with active rovers',
    category: 'planet',
    badge: '1.52 AU',
  },
  {
    id: 'alpha-centauri',
    title: 'Alpha Centauri',
    subtitle: 'Triple star system nearest to Sol',
    category: 'star',
    badge: '4.37 ly',
  },
  {
    id: 'reference',
    title: 'Astrodynamics Reference',
    subtitle: 'Encyclopedia, ICRS/J2000 coordinate frames & constants',
    category: 'command',
    badge: 'Docs',
  },
];

export const RootHeader: React.FC = () => {
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const navigate = useNavigate();

  const handleOpenPalette = useCallback(() => {
    setIsPaletteOpen(true);
  }, []);

  const handleClosePalette = useCallback(() => {
    setIsPaletteOpen(false);
  }, []);

  const handleSelectItem = useCallback(
    (item: CommandPaletteItem) => {
      setIsPaletteOpen(false);
      if (item.id === 'galaxy') {
        void navigate({ to: '/galaxy' });
      } else if (item.category === 'planet') {
        void navigate({ to: '/planet/$planetId', params: { planetId: item.id } });
      } else if (item.category === 'star' || item.category === 'system') {
        void navigate({ to: '/system/$systemId', params: { systemId: item.id } });
      } else if (item.id === 'reference') {
        void navigate({ to: '/reference' });
      }
    },
    [navigate],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <header className={styles.header}>
        <div className={styles.brandGroup}>
          <span className={styles.brandLogo}>✦ STARMAP</span>
        </div>

        <nav className={styles.navGroup} aria-label="Primary Navigation">
          <Link
            to="/galaxy"
            className={styles.navLink}
            activeProps={{ className: styles.navLinkActive }}
          >
            Galaxy
          </Link>
          <Link
            to="/system/$systemId"
            params={{ systemId: 'sol' }}
            className={styles.navLink}
            activeProps={{ className: styles.navLinkActive }}
          >
            System (Sol)
          </Link>
          <Link
            to="/planet/$planetId"
            params={{ planetId: 'earth' }}
            className={styles.navLink}
            activeProps={{ className: styles.navLinkActive }}
          >
            Planet (Earth)
          </Link>
          <Link
            to="/reference"
            className={styles.navLink}
            activeProps={{ className: styles.navLinkActive }}
          >
            Reference
          </Link>
        </nav>

        <div className={styles.actionGroup}>
          <Button
            variant="default"
            size="sm"
            className={styles.searchButton}
            onClick={handleOpenPalette}
            aria-label="Search celestial catalog (Command or Control K)"
          >
            <span>Search...</span>
            <kbd className={styles.shortcutKey}>⌘K</kbd>
          </Button>
        </div>
      </header>

      <CommandPalette
        isOpen={isPaletteOpen}
        onClose={handleClosePalette}
        items={DEFAULT_COMMAND_ITEMS}
        onSelectItem={handleSelectItem}
        placeholder="Search stars, planets, catalogs..."
      />
    </>
  );
};

export const RootLayout: React.FC<RootLayoutProps> = () => {
  return (
    <SceneProvider>
      <ThemeTokenBridge />
      <div className={[styles.starmapApp, 'starmap-app'].join(' ')}>
        {/* Persistent 3D WebGL Canvas Layer */}
        <GlobalCanvas />

        {/* Global HUD Header */}
        <RootHeader />

        {/* Active Route Content */}
        <main className={styles.main}>
          <Outlet />
        </main>
      </div>
    </SceneProvider>
  );
};
