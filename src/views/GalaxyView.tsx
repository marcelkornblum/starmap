import type React from 'react';
import { useState } from 'react';
import { ScenePortal } from '../components/poc/canvas/SceneBridge';
import { GalaxyScene } from '../components/poc/canvas/scenes/GalaxyScene';
import { useStarmapNav } from '../router/navigation';
import { Panel } from '../components/poc/surfaces';
import { Stack, Cluster, Button, Metric } from '../components/poc/primitives';
import { SystemControls } from '../components/poc/domain';
import type { ProjectionMode } from '../stores/useSettingsStore';
import styles from './GalaxyView.module.css';

export interface GalaxyViewProps {}

export const GalaxyControlsDock: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [timeSpeed, setTimeSpeed] = useState(1);
  const [projection, setProjection] = useState<ProjectionMode>('3d');
  const [showOrbits, setShowOrbits] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showLabels, setShowLabels] = useState(true);

  return (
    <div className={styles.controlsDock}>
      <SystemControls
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying((p) => !p)}
        timeSpeed={timeSpeed}
        onTimeSpeedChange={setTimeSpeed}
        projection={projection}
        onProjectionChange={setProjection}
        showOrbits={showOrbits}
        onToggleOrbits={setShowOrbits}
        showGrid={showGrid}
        onToggleGrid={setShowGrid}
        showLabels={showLabels}
        onToggleLabels={setShowLabels}
      />
    </div>
  );
};

export const GalaxyView: React.FC<GalaxyViewProps> = () => {
  const nav = useStarmapNav();

  return (
    <>
      <ScenePortal sceneKey="galaxy">
        <GalaxyScene onInspectSystem={(id) => nav.toSystem(id)} />
      </ScenePortal>

      <div data-testid="galaxy-view-hud" className={styles.hudOverlay}>
        <Panel padding="default">
          <Stack gap="default">
            <Stack gap="tight">
              <h2 className={styles.title}>Milky Way Atlas</h2>
              <p className={styles.description}>
                Top-level navigational view of the local stellar neighborhood.
              </p>
            </Stack>

            <Cluster gap="default">
              <Metric label="Diameter" value="100,000" unit="ly" />
              <Metric label="Sol to Core" value="26,000" unit="ly" />
            </Cluster>

            <Stack gap="tight">
              <Button
                variant="primary"
                onClick={() => nav.toSystem('sol')}
              >
                Target Sol System →
              </Button>

              <Cluster gap="tight">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => nav.toSystem('alpha-centauri')}
                >
                  Alpha Centauri
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => nav.toSystem('sirius')}
                >
                  Sirius
                </Button>
              </Cluster>
            </Stack>
          </Stack>
        </Panel>
      </div>

      <GalaxyControlsDock />
    </>
  );
};
