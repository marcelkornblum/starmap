import type React from 'react';
import { useState } from 'react';
import { useParams } from '@tanstack/react-router';
import { ScenePortal } from '../components/canvas/viewport/SceneBridge';
import { SystemScene } from '../components/canvas/scenes/SystemScene';
import { useStarmapNav } from '../router/navigation';
import { Panel } from '../components/interface/surfaces';
import { Stack, Cluster, Button } from '../components/poc/primitives';
import {
  StarDossier,
  OrbitTable,
  SystemControls,
  type StarDossierData,
  type OrbitElementRow,
} from '../components/poc/domain';
import type { ProjectionMode } from '../stores/useSettingsStore';
import styles from './SystemView.module.css';

export interface SystemViewProps {}

const SOL_STAR: StarDossierData = {
  id: 'sol',
  name: 'Sol',
  properName: 'Sun',
  spectralType: 'G2V',
  luminosityLsun: 1.0,
  massMsun: 1.0,
  radiusRsun: 1.0,
  effectiveTempK: 5778,
  distPc: 0.0,
  con: null,
  planets: [
    {
      id: 'mercury',
      name: 'Mercury',
      letter: 'b',
      orbit: {
        semiMajorAxis: 0.387,
        eccentricity: 0.2056,
        inclination: 7.0,
        ascendingNode: 48.33,
        argumentOfPeriapsis: 29.12,
        meanAnomaly: 174.79,
        periodDays: 87.97,
      },
    },
    {
      id: 'venus',
      name: 'Venus',
      letter: 'c',
      orbit: {
        semiMajorAxis: 0.723,
        eccentricity: 0.0067,
        inclination: 3.39,
        ascendingNode: 76.68,
        argumentOfPeriapsis: 54.88,
        meanAnomaly: 50.11,
        periodDays: 224.7,
      },
    },
    {
      id: 'earth',
      name: 'Earth',
      letter: 'd',
      esi: 1.0,
      orbit: {
        semiMajorAxis: 1.0,
        eccentricity: 0.0167,
        inclination: 0.0,
        ascendingNode: -11.26,
        argumentOfPeriapsis: 114.21,
        meanAnomaly: 358.62,
        periodDays: 365.25,
      },
    },
    {
      id: 'mars',
      name: 'Mars',
      letter: 'e',
      orbit: {
        semiMajorAxis: 1.524,
        eccentricity: 0.0934,
        inclination: 1.85,
        ascendingNode: 49.56,
        argumentOfPeriapsis: 286.5,
        meanAnomaly: 19.37,
        periodDays: 686.98,
      },
    },
  ],
};

const SOL_ORBITS: OrbitElementRow[] = [
  { id: 'mercury', name: 'Mercury', semiMajorAxis: 0.387, eccentricity: 0.2056, inclination: 7.0, periodDays: 87.97 },
  { id: 'venus', name: 'Venus', semiMajorAxis: 0.723, eccentricity: 0.0067, inclination: 3.39, periodDays: 224.7 },
  { id: 'earth', name: 'Earth', semiMajorAxis: 1.0, eccentricity: 0.0167, inclination: 0.0, periodDays: 365.25 },
  { id: 'mars', name: 'Mars', semiMajorAxis: 1.524, eccentricity: 0.0934, inclination: 1.85, periodDays: 686.98 },
  { id: 'jupiter', name: 'Jupiter', semiMajorAxis: 5.204, eccentricity: 0.0485, inclination: 1.3, periodDays: 4332.59 },
  { id: 'saturn', name: 'Saturn', semiMajorAxis: 9.582, eccentricity: 0.0555, inclination: 2.49, periodDays: 10759.22 },
];

export const SystemControlsDock: React.FC = () => {
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

export const SystemView: React.FC<SystemViewProps> = () => {
  const params: Record<string, string | undefined> = useParams({ strict: false });
  const systemId = params.systemId ?? 'unknown';
  const nav = useStarmapNav();

  const isSol = systemId.toLowerCase() === 'sol';
  const starData: StarDossierData = isSol
    ? SOL_STAR
    : {
        id: systemId.toLowerCase(),
        name: systemId.toUpperCase(),
        spectralType: 'Spectral Telemetry Pending',
        luminosityLsun: 1.0,
        massMsun: 1.0,
      };

  const orbitData = isSol ? SOL_ORBITS : [];

  return (
    <>
      <ScenePortal sceneKey={`system-${systemId}`}>
        <SystemScene
          systemId={systemId}
          system={starData}
          onInspectPlanet={(planetId) => nav.toPlanet(planetId)}
        />
      </ScenePortal>

      {/* Main HUD Dossier */}
      <div data-testid="system-view-hud" className={styles.hudOverlay}>
        <Panel padding="default">
          <Stack gap="default">
            <Stack gap="tight">
              <span className={styles.eyebrow}>Star System</span>
              <h2 className={styles.title}>{systemId.toUpperCase()}</h2>
              <p className={styles.description}>
                Orbital view of planetary bodies and satellites.
              </p>
            </Stack>

            <Cluster gap="tight">
              <Button
                variant="primary"
                onClick={() => nav.toPlanet('earth')}
              >
                Target Earth →
              </Button>
              <Button
                variant="default"
                onClick={() => nav.toGalaxy()}
              >
                ← Galaxy
              </Button>
            </Cluster>

            <StarDossier
              star={starData}
              onSelectPlanet={(planetId) => nav.toPlanet(planetId)}
            />
          </Stack>
        </Panel>
      </div>

      {/* Orbital Telemetry Table */}
      {orbitData.length > 0 && (
        <div className={styles.orbitOverlay}>
          <Panel padding="default">
            <Stack gap="tight">
              <span className={styles.eyebrow}>Orbital Elements</span>
              <OrbitTable
                orbits={orbitData}
                onSelect={(id) => nav.toPlanet(id)}
              />
            </Stack>
          </Panel>
        </div>
      )}

      {/* Time & Projection HUD Controls */}
      <SystemControlsDock />
    </>
  );
};
