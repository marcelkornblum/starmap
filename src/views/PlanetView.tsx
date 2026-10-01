import type React from 'react';
import { useParams } from '@tanstack/react-router';
import { ScenePortal } from '../components/canvas/SceneBridge';
import { PlanetScene3D } from '../components/canvas/scenes/PlanetScene3D';
import { useStarmapNav } from '../router/navigation';
import styles from './PlanetView.module.css';

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

      <div data-testid="planet-view-hud" className={styles.hudPanel}>
        <span className={styles.badge}>
          Planetary Body
        </span>
        <h2 className={styles.heading}>
          {planetId.toUpperCase()}
        </h2>
        <p className={styles.description}>
          Surface inspection and atmospheric telemetry readout.
        </p>

        <div className={styles.buttonGroup}>
          <button
            type="button"
            onClick={() => nav.toSystem('sol')}
            className={styles.primaryButton}
          >
            ← Sol System
          </button>
        </div>
      </div>
    </>
  );
};

