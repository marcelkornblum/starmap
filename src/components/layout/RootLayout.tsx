import type React from 'react';
import { Outlet, Link } from '@tanstack/react-router';

export interface RootLayoutProps {}

export const RootLayout: React.FC<RootLayoutProps> = () => {
  return (
    <div className="starmap-app" style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          display: 'flex',
          gap: '1.5rem',
          padding: '1rem',
          background: 'rgba(10, 10, 10, 0.8)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          color: '#fff',
          zIndex: 100,
        }}
      >
        <span style={{ fontWeight: 'bold', letterSpacing: '0.05em' }}>STARMAP</span>
        <nav style={{ display: 'flex', gap: '1rem' }}>
          <Link to="/galaxy" style={{ color: '#aaa', textDecoration: 'none' }} activeProps={{ style: { color: '#646cff', fontWeight: 'bold' } }}>
            Galaxy
          </Link>
          <Link
            to="/system/$systemId"
            params={{ systemId: 'sol' }}
            style={{ color: '#aaa', textDecoration: 'none' }}
            activeProps={{ style: { color: '#646cff', fontWeight: 'bold' } }}
          >
            System (Sol)
          </Link>
          <Link
            to="/planet/$planetId"
            params={{ planetId: 'earth' }}
            style={{ color: '#aaa', textDecoration: 'none' }}
            activeProps={{ style: { color: '#646cff', fontWeight: 'bold' } }}
          >
            Planet (Earth)
          </Link>
          <Link to="/reference" style={{ color: '#aaa', textDecoration: 'none' }} activeProps={{ style: { color: '#646cff', fontWeight: 'bold' } }}>
            Reference
          </Link>
        </nav>
      </header>

      <main style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <Outlet />
      </main>
    </div>
  );
};
