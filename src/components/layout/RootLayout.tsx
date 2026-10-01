import type React from 'react';
import { Outlet, Link } from '@tanstack/react-router';
import { SceneProvider } from '../canvas/SceneBridge';
import { GlobalCanvas } from '../canvas/GlobalCanvas';
import styles from './RootLayout.module.css';

export interface RootLayoutProps {}

export const RootLayout: React.FC<RootLayoutProps> = () => {
  return (
    <SceneProvider>
      <div className={`starmap-app ${styles.appLayout}`}>
        {/* Persistent 3D WebGL Canvas Layer */}
        <GlobalCanvas />

        {/* Global HUD Header */}
        <header className={styles.header}>
          <div className={styles.brandGroup}>
            <span className={styles.brandTitle}>
              ✦ STARMAP
            </span>
          </div>

          <nav className={styles.nav}>
            <Link
              to="/galaxy"
              className={styles.navLink}
              activeProps={{ className: `${styles.navLink} ${styles.navLinkActive}` }}
            >
              Galaxy
            </Link>
            <Link
              to="/system/$systemId"
              params={{ systemId: 'sol' }}
              className={styles.navLink}
              activeProps={{ className: `${styles.navLink} ${styles.navLinkActive}` }}
            >
              System (Sol)
            </Link>
            <Link
              to="/planet/$planetId"
              params={{ planetId: 'earth' }}
              className={styles.navLink}
              activeProps={{ className: `${styles.navLink} ${styles.navLinkActive}` }}
            >
              Planet (Earth)
            </Link>
            <Link
              to="/reference"
              className={styles.navLink}
              activeProps={{ className: `${styles.navLink} ${styles.navLinkActive}` }}
            >
              Reference
            </Link>
          </nav>
        </header>

        {/* Active Route Content */}
        <main className={styles.mainContent}>
          <Outlet />
        </main>
      </div>
    </SceneProvider>
  );
};

