import type React from 'react';
import { useParams } from '@tanstack/react-router';
import { ScenePortal } from '../components/canvas/SceneBridge';
import { PlanetScene3D } from '../components/canvas/scenes/PlanetScene3D';
import { useStarmapNav } from '../router/navigation';
import { Panel } from '../components/surfaces';
import { Stack, Cluster, Button, Metric, Datum } from '../components/primitives';
import styles from './PlanetView.module.css';

export interface PlanetViewProps {}

export const PlanetView: React.FC<PlanetViewProps> = () => {
  const params: Record<string, string | undefined> = useParams({ strict: false });
  const planetId = params.planetId ?? 'unknown';
  const nav = useStarmapNav();

  const isEarth = planetId.toLowerCase() === 'earth';

  return (
    <>
      <ScenePortal sceneKey={`planet-${planetId}`}>
        <PlanetScene3D planetId={planetId} />
      </ScenePortal>

      <div data-testid="planet-view-hud" className={styles.hudOverlay}>
        <Panel padding="default">
          <Stack gap="default">
            <Stack gap="tight">
              <span className={styles.eyebrow}>Planetary Body</span>
              <h2 className={styles.title}>{planetId.toUpperCase()}</h2>
              <p className={styles.description}>
                Surface inspection and atmospheric telemetry readout.
              </p>
            </Stack>

            <Cluster gap="tight">
              <Button
                variant="primary"
                onClick={() => nav.toSystem('sol')}
              >
                ← Sol System
              </Button>
              <Button
                variant="secondary"
                onClick={() => nav.toGalaxy()}
              >
                Galaxy Atlas
              </Button>
            </Cluster>

            <Cluster gap="default">
              <Metric label="Radius" value={isEarth ? '6,371' : '—'} unit={isEarth ? 'km' : undefined} />
              <Metric label="Gravity" value={isEarth ? '1.00' : '—'} unit={isEarth ? 'g' : undefined} />
              <Metric label="Period" value={isEarth ? '365.25' : '—'} unit={isEarth ? 'd' : undefined} />
            </Cluster>

            <Stack gap="none">
              <Datum
                label="Semi-Major Axis"
                value={isEarth ? '1.000' : '—'}
                unit={isEarth ? 'AU' : undefined}
              />
              <Datum
                label="Eccentricity"
                value={isEarth ? '0.0167' : '—'}
              />
              <Datum
                label="Axial Tilt"
                value={isEarth ? '23.44' : '—'}
                unit={isEarth ? '°' : undefined}
              />
              <Datum
                label="Escape Velocity"
                value={isEarth ? '11.19' : '—'}
                unit={isEarth ? 'km/s' : undefined}
              />
              <Datum
                label="Atmospheric Telemetry"
                value={isEarth ? 'N₂ 78%, O₂ 21%, Ar 1%' : 'Awaiting Spectroscopy'}
              />
              <Datum
                label="Habitable Zone"
                value={isEarth ? 'Confirmed Habitable' : 'Undetermined'}
                status={isEarth ? 'nominal' : 'caution'}
              />
            </Stack>
          </Stack>
        </Panel>
      </div>
    </>
  );
};
