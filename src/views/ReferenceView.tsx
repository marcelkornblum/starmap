import type React from 'react';
import { ScenePortal } from '../components/canvas/SceneBridge';
import { ReferenceScene3D } from '../components/canvas/scenes/ReferenceScene3D';
import { useStarmapNav } from '../router/navigation';
import { Panel, Card } from '../components/surfaces';
import { Stack, Button, Datum } from '../components/primitives';
import styles from './ReferenceView.module.css';

export interface ReferenceViewProps {}

export const ReferenceView: React.FC<ReferenceViewProps> = () => {
  const nav = useStarmapNav();

  return (
    <>
      <ScenePortal sceneKey="reference">
        <ReferenceScene3D />
      </ScenePortal>

      {/* Main Encyclopedia HUD */}
      <div data-testid="reference-view-hud" className={styles.hudOverlay}>
        <Panel padding="default">
          <Stack gap="default">
            <Stack gap="tight">
              <span className={styles.eyebrow}>Astrodynamics Reference</span>
              <h2 className={styles.title}>Astronomical Encyclopedia</h2>
              <p className={styles.description}>
                Reference definitions, celestial coordinate systems (ICRS / J2000), and conversion standards.
              </p>
            </Stack>

            <Button
              variant="primary"
              onClick={() => nav.toGalaxy()}
            >
              Return to Galaxy Atlas →
            </Button>

            <Stack gap="none">
              <Datum
                label="Astronomical Unit (AU)"
                value="149,597,870.7"
                unit="km"
              />
              <Datum
                label="Speed of Light (c)"
                value="299,792.458"
                unit="km/s"
              />
              <Datum
                label="Standard Solar Mass (M☉)"
                value="1.98847×10³⁰"
                unit="kg"
              />
              <Datum
                label="Solar Radius (R☉)"
                value="695,700"
                unit="km"
              />
              <Datum
                label="Solar Luminosity (L☉)"
                value="3.828×10²⁶"
                unit="W"
              />
              <Datum
                label="Reference Epoch"
                value="J2000.0 (JD 2451545.0 TT)"
              />
              <Datum
                label="Coordinate Standard"
                value="ICRS / IAU 2000"
              />
            </Stack>
          </Stack>
        </Panel>
      </div>

      {/* Keplerian Elements Reference Card */}
      <div className={styles.equationsOverlay}>
        <Card padding="default">
          <Stack gap="default">
            <Stack gap="tight">
              <span className={styles.eyebrow}>Orbital Mechanics</span>
              <h3 className={styles.title}>Keplerian Elements</h3>
              <p className={styles.description}>
                Six classical parameters uniquely determining an orbit in two-body Newtonian gravitation.
              </p>
            </Stack>

            <Stack gap="none">
              <Datum label="Semi-Major Axis (a)" value="Size & energy of the orbit" />
              <Datum label="Eccentricity (e)" value="Shape of ellipse (0 = circle)" />
              <Datum label="Inclination (i)" value="Vertical tilt relative to reference plane" />
              <Datum label="Long. Ascending Node (Ω)" value="Horizontal orientation of ascending node" />
              <Datum label="Arg. of Periapsis (ω)" value="Orientation of ellipse in orbital plane" />
              <Datum label="Mean Anomaly (M)" value="Position of orbiting body along ellipse" />
            </Stack>
          </Stack>
        </Card>
      </div>
    </>
  );
};
