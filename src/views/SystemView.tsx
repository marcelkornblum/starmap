import type React from 'react';
import { useParams } from '@tanstack/react-router';
import { ScenePortal } from '../components/canvas/SceneBridge';
import { SystemScene3D } from '../components/canvas/scenes/SystemScene3D';
import { useStarmapNav } from '../router/navigation';

export interface SystemViewProps {}

export const SystemView: React.FC<SystemViewProps> = () => {
  const params: Record<string, string | undefined> = useParams({ strict: false });
  const systemId = params.systemId ?? 'unknown';
  const nav = useStarmapNav();

  return (
    <>
      <ScenePortal sceneKey={`system-${systemId}`}>
        <SystemScene3D systemId={systemId} />
      </ScenePortal>

      <div
        data-testid="system-view-hud"
        style={{
          position: 'absolute',
          top: '2rem',
          left: '2rem',
          padding: '1.5rem',
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(12px)',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          color: '#fff',
          maxWidth: '320px',
          pointerEvents: 'auto',
        }}
      >
        <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#646cff' }}>
          Star System
        </span>
        <h2 style={{ margin: '0.25rem 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 700 }}>
          {systemId.toUpperCase()}
        </h2>
        <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.4 }}>
          Orbital view of planetary bodies and satellites.
        </p>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => nav.toPlanet('earth')}
            style={{
              background: '#3b82f6',
              color: '#fff',
              border: 'none',
              padding: '0.5rem 0.75rem',
              borderRadius: '4px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Target Earth →
          </button>
          <button
            type="button"
            onClick={() => nav.toGalaxy()}
            style={{
              background: 'transparent',
              color: '#94a3b8',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              padding: '0.5rem 0.75rem',
              borderRadius: '4px',
              fontSize: '0.8rem',
              cursor: 'pointer',
            }}
          >
            ← Galaxy
          </button>
        </div>
      </div>
    </>
  );
};
