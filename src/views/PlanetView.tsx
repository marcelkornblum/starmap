import type React from 'react';
import { useParams } from '@tanstack/react-router';
import { ScenePortal } from '../components/canvas/SceneBridge';
import { PlanetScene3D } from '../components/canvas/scenes/PlanetScene3D';
import { useStarmapNav } from '../router/navigation';

export interface PlanetViewProps {}

export const PlanetView: React.FC<PlanetViewProps> = () => {
  const params: Record<string, string | undefined> = useParams({ strict: false });
  const planetId = params.planetId ?? 'unknown';
  const nav = useStarmapNav();

  return (
    <>
      <ScenePortal sceneKey={`planet-${planetId}`}>
        <PlanetScene3D planetId={planetId} />
      </ScenePortal>

      <div
        data-testid="planet-view-hud"
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
        <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#10b981' }}>
          Planetary Body
        </span>
        <h2 style={{ margin: '0.25rem 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 700 }}>
          {planetId.toUpperCase()}
        </h2>
        <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.4 }}>
          Surface inspection and atmospheric telemetry readout.
        </p>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => nav.toSystem('sol')}
            style={{
              background: '#10b981',
              color: '#fff',
              border: 'none',
              padding: '0.5rem 0.75rem',
              borderRadius: '4px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ← Sol System
          </button>
        </div>
      </div>
    </>
  );
};
