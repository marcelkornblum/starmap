import type React from 'react';
import { useParams } from '@tanstack/react-router';
import { ScenePortal } from '../components/canvas/SceneBridge';
import { SystemScene3D } from '../components/canvas/scenes/SystemScene3D';
import { useStarmapNav } from '../router/navigation';
import styles from './SystemView.module.css';

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

      <div data-testid="system-view-hud" className={styles.hudPanel}>
        <span className={styles.badge}>
          Star System
        </span>
        <h2 className={styles.heading}>
          {systemId.toUpperCase()}
        </h2>
        <p className={styles.description}>
          Orbital view of planetary bodies and satellites.
        </p>

        <div className={styles.buttonGroup}>
          <button
            type="button"
            onClick={() => nav.toPlanet('earth')}
            className={styles.primaryButton}
          >
            Target Earth →
          </button>
          <button
            type="button"
            onClick={() => nav.toGalaxy()}
            className={styles.secondaryButton}
          >
            ← Galaxy
          </button>
        </div>
      </div>
    </>
  );
};

