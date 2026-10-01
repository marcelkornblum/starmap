import type React from 'react';
import { ScenePortal } from '../components/canvas/SceneBridge';
import { ReferenceScene3D } from '../components/canvas/scenes/ReferenceScene3D';
import { useStarmapNav } from '../router/navigation';

export interface ReferenceViewProps {}

export const ReferenceView: React.FC<ReferenceViewProps> = () => {
  const nav = useStarmapNav();

  return (
    <>
      <ScenePortal sceneKey="reference">
        <ReferenceScene3D />
      </ScenePortal>

      <div
        data-testid="reference-view-hud"
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
          maxWidth: '360px',
          pointerEvents: 'auto',
        }}
      >
        <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#a855f7' }}>
          Astrodynamics Reference
        </span>
        <h2 style={{ margin: '0.25rem 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 700 }}>
          Astronomical Encyclopedia
        </h2>
        <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.4 }}>
          Reference definitions, celestial coordinate systems (ICRS / J2000), and conversion standards.
        </p>

        <button
          type="button"
          onClick={() => nav.toGalaxy()}
          style={{
            background: '#a855f7',
            color: '#fff',
            border: 'none',
            padding: '0.5rem 0.75rem',
            borderRadius: '4px',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Return to Galaxy Atlas →
        </button>
      </div>
    </>
  );
};
