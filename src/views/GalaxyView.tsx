import type React from 'react';
import { ScenePortal } from '../components/canvas/SceneBridge';
import { GalaxyScene3D } from '../components/canvas/scenes/GalaxyScene3D';
import { useStarmapNav } from '../router/navigation';
import styles from './GalaxyView.module.css';

export interface GalaxyViewProps {}

export const GalaxyView: React.FC<GalaxyViewProps> = () => {
  const nav = useStarmapNav();

  return (
    <>
      <ScenePortal sceneKey="galaxy">
        <GalaxyScene3D />
      </ScenePortal>

      <div data-testid="galaxy-view-hud" className={styles.hudPanel}>
        <h2 className={styles.heading}>
          Milky Way Atlas
        </h2>
        <p className={styles.description}>
          Top-level navigational view of the local stellar neighborhood.
        </p>
        <button
          type="button"
          onClick={() => nav.toSystem('sol')}
          className={styles.actionButton}
        >
          Target Sol System →
        </button>
      </div>
    </>
  );
};

