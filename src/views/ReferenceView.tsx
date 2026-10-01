import type React from 'react';
import { ScenePortal } from '../components/canvas/SceneBridge';
import { ReferenceScene3D } from '../components/canvas/scenes/ReferenceScene3D';
import { useStarmapNav } from '../router/navigation';
import styles from './ReferenceView.module.css';

export interface ReferenceViewProps {}

export const ReferenceView: React.FC<ReferenceViewProps> = () => {
  const nav = useStarmapNav();

  return (
    <>
      <ScenePortal sceneKey="reference">
        <ReferenceScene3D />
      </ScenePortal>

      <div data-testid="reference-view-hud" className={styles.hudPanel}>
        <span className={styles.badge}>
          Astrodynamics Reference
        </span>
        <h2 className={styles.heading}>
          Astronomical Encyclopedia
        </h2>
        <p className={styles.description}>
          Reference definitions, celestial coordinate systems (ICRS / J2000), and conversion standards.
        </p>

        <button
          type="button"
          onClick={() => nav.toGalaxy()}
          className={styles.actionButton}
        >
          Return to Galaxy Atlas →
        </button>
      </div>
    </>
  );
};

