import type React from 'react';
import { Outlet, Link } from '@tanstack/react-router';
import { SceneProvider } from '../canvas/SceneBridge';
import { GlobalCanvas } from '../canvas/GlobalCanvas';

export interface RootLayoutProps {}

export const RootLayout: React.FC<RootLayoutProps> = () => {
  return (
    <SceneProvider>
      <div
        className="starmap-app"
        style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          background: '#05070f',
        }}
      >
        {/* Persistent 3D WebGL Canvas Layer */}
        <GlobalCanvas />

        {/* Global HUD Header */}
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem 2rem',
            background: 'rgba(5, 7, 15, 0.65)',
            backdropFilter: 'blur(10px)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            color: '#fff',
            zIndex: 100,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontWeight: 800, letterSpacing: '0.12em', fontSize: '1.1rem', color: '#646cff' }}>
              ✦ STARMAP
            </span>
          </div>

          <nav style={{ display: 'flex', gap: '1.25rem', fontSize: '0.9rem' }}>
            <Link
              to="/galaxy"
              style={{ color: '#94a3b8', textDecoration: 'none' }}
              activeProps={{ style: { color: '#ffffff', fontWeight: 600 } }}
            >
              Galaxy
            </Link>
            <Link
              to="/system/$systemId"
              params={{ systemId: 'sol' }}
              style={{ color: '#94a3b8', textDecoration: 'none' }}
              activeProps={{ style: { color: '#ffffff', fontWeight: 600 } }}
            >
              System (Sol)
            </Link>
            <Link
              to="/planet/$planetId"
              params={{ planetId: 'earth' }}
              style={{ color: '#94a3b8', textDecoration: 'none' }}
              activeProps={{ style: { color: '#ffffff', fontWeight: 600 } }}
            >
              Planet (Earth)
            </Link>
            <Link
              to="/reference"
              style={{ color: '#94a3b8', textDecoration: 'none' }}
              activeProps={{ style: { color: '#ffffff', fontWeight: 600 } }}
            >
              Reference
            </Link>
          </nav>
        </header>

        {/* Active Route Content */}
        <main
          style={{
            flex: 1,
            position: 'relative',
            zIndex: 10,
            pointerEvents: 'none',
          }}
        >
          <Outlet />
        </main>
      </div>
    </SceneProvider>
  );
};
