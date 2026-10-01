import type React from 'react';
import { ScenePortal } from '../components/canvas/SceneBridge';
import { GalaxyScene3D } from '../components/canvas/scenes/GalaxyScene3D';
import { useStarmapNav } from '../router/navigation';

export interface GalaxyViewProps {}

export const GalaxyView: React.FC<GalaxyViewProps> = () => {
  const nav = useStarmapNav();

  return (
    <>
      <ScenePortal sceneKey="galaxy">
        <GalaxyScene3D />
      </ScenePortal>

      <div
        data-testid="galaxy-view-hud"
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
        <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 700 }}>
          Milky Way Atlas
        </h2>
        <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.4 }}>
          Top-level navigational view of the local stellar neighborhood.
        </p>
        <button
          type="button"
          onClick={() => nav.toSystem('sol')}
          style={{
            background: '#646cff',
            color: '#fff',
            border: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '4px',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Target Sol System →
        </button>
      </div>
    </>
  );
};
