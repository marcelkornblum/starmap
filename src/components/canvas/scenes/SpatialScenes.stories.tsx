import type React from 'react';
import { useState, useMemo, useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Sphere } from '@react-three/drei';
import * as THREE from 'three';

import {
  CelestialNode,
  CartographicGrid,
  OrbitalRing,
  type CelestialClassification,
  type PlanetCensusEntry,
} from '../cartography';
import { SceneTokenBridge, ThemeTokenBridge } from '../ThemeTokenBridge';
import { Stack, Cluster, Button, Badge } from '../../primitives';
import { Panel } from '../../surfaces';
import {
  StarDossier,
  OrbitTable,
  SystemControls,
  type StarDossierData,
  type OrbitElementRow,
} from '../../domain';
import { DEG_TO_RADIANS, rotateToOrbitalPlane } from '../../../utils/astroMath';

import styles from './SpatialScenes.module.css';

// -----------------------------------------------------------------------------
// Metadata & Definitions
// -----------------------------------------------------------------------------

const meta: Meta = {
  title: 'Canvas/Scenes/SpatialScenes',
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <div>
        <ThemeTokenBridge />
        <Story />
      </div>
    ),
  ],
};

export default meta;

// -----------------------------------------------------------------------------
// Astronomical Data Fixtures & Helper Utilities
// -----------------------------------------------------------------------------

interface CandidateSystem {
  id: string;
  name: string;
  classification: CelestialClassification;
  spectralType: string;
  position: [number, number, number];
  distPc: number;
  multiplicity: number;
  planetsCount: number;
  planetsList?: PlanetCensusEntry[];
  description: string;
  massMsun?: number;
  radiusRsun?: number;
  effectiveTempK?: number;
  luminosityLsun?: number;
}

const CANDIDATE_SYSTEMS: CandidateSystem[] = [
  {
    id: 'sol',
    name: 'Sol',
    classification: 'star',
    spectralType: 'G2V',
    position: [0.0, 0.0, 0.0],
    distPc: 0.0,
    multiplicity: 1,
    planetsCount: 8,
    massMsun: 1.0,
    radiusRsun: 1.0,
    effectiveTempK: 5778,
    luminosityLsun: 1.0,
    planetsList: [
      { id: 'mercury', name: 'Mercury', classification: 'terrestrial' },
      { id: 'venus', name: 'Venus', classification: 'terrestrial' },
      { id: 'earth', name: 'Earth', classification: 'terrestrial' },
      { id: 'mars', name: 'Mars', classification: 'terrestrial' },
      { id: 'jupiter', name: 'Jupiter', classification: 'gas-giant' },
      { id: 'saturn', name: 'Saturn', classification: 'gas-giant' },
      { id: 'uranus', name: 'Uranus', classification: 'ice-giant' },
      { id: 'neptune', name: 'Neptune', classification: 'ice-giant' },
    ],
    description: 'Primary solar system hosting terrestrial and giant worlds with in-situ human civilisation.',
  },
  {
    id: 'alpha-centauri',
    name: 'Alpha Centauri',
    classification: 'star',
    spectralType: 'G2V + K1V',
    position: [-1.34, 0.45, -0.62],
    distPc: 1.34,
    multiplicity: 3,
    planetsCount: 3,
    massMsun: 1.1,
    radiusRsun: 1.22,
    effectiveTempK: 5790,
    luminosityLsun: 1.52,
    planetsList: [
      { id: 'prox-b', name: 'Proxima b', classification: 'terrestrial' },
      { id: 'prox-c', name: 'Proxima c', classification: 'gas-giant' },
      { id: 'prox-d', name: 'Proxima d', classification: 'terrestrial' },
    ],
    description: 'Nearest triple star system comprised of Rigil Kentaurus, Toliman, and red dwarf Proxima.',
  },
  {
    id: 'sirius',
    name: 'Sirius',
    classification: 'star',
    spectralType: 'A1V + DA2',
    position: [-1.61, -2.13, -0.55],
    distPc: 2.64,
    multiplicity: 2,
    planetsCount: 0,
    massMsun: 2.06,
    radiusRsun: 1.71,
    effectiveTempK: 9940,
    luminosityLsun: 25.4,
    description: 'Brightest star in Earth night sky; binary system with an A-type main-sequence star and white dwarf Pup.',
  },
  {
    id: 'tau-ceti',
    name: 'Tau Ceti',
    classification: 'star',
    spectralType: 'G8.5V',
    position: [3.15, 1.54, -1.00],
    distPc: 3.65,
    multiplicity: 1,
    planetsCount: 4,
    massMsun: 0.783,
    radiusRsun: 0.793,
    effectiveTempK: 5344,
    luminosityLsun: 0.52,
    planetsList: [
      { id: 'tau-g', name: 'Tau Ceti g', classification: 'terrestrial' },
      { id: 'tau-h', name: 'Tau Ceti h', classification: 'terrestrial' },
      { id: 'tau-e', name: 'Tau Ceti e', classification: 'terrestrial' },
      { id: 'tau-f', name: 'Tau Ceti f', classification: 'terrestrial' },
    ],
    description: 'Nearby solar analog with prominent circumstellar dust disk and candidate habitable super-Earths.',
  },
  {
    id: 'vega',
    name: 'Vega',
    classification: 'star',
    spectralType: 'A0V',
    position: [2.52, 7.21, 2.15],
    distPc: 7.68,
    multiplicity: 1,
    planetsCount: 0,
    massMsun: 2.135,
    radiusRsun: 2.362,
    effectiveTempK: 9602,
    luminosityLsun: 40.12,
    description: 'Rapidly rotating pole-on A-type star with warm circumferential debris disk.',
  },
  {
    id: 'kepler-47',
    name: 'Kepler-47',
    classification: 'star',
    spectralType: 'G6V + M3V',
    position: [4.82, -3.20, 2.50],
    distPc: 6.28,
    multiplicity: 2,
    planetsCount: 3,
    massMsun: 1.04,
    radiusRsun: 0.96,
    effectiveTempK: 5636,
    luminosityLsun: 0.84,
    planetsList: [
      { id: 'kep-b', name: 'Kepler-47 b', classification: 'terrestrial' },
      { id: 'kep-d', name: 'Kepler-47 d', classification: 'ice-giant' },
      { id: 'kep-c', name: 'Kepler-47 c', classification: 'gas-giant' },
    ],
    description: 'First known circumbinary multi-planet system containing three exoplanets orbiting a close stellar pair.',
  },
  {
    id: 'luhman-16',
    name: 'Luhman 16',
    classification: 'brown-dwarf',
    spectralType: 'L7.5 + T0.5',
    position: [-1.25, -1.82, 1.20],
    distPc: 2.02,
    multiplicity: 2,
    planetsCount: 0,
    massMsun: 0.032,
    radiusRsun: 0.1,
    effectiveTempK: 1350,
    luminosityLsun: 0.00004,
    description: 'Closest known sub-stellar brown dwarf binary system in the southern constellation Vela.',
  },
  {
    id: 'cygnus-x-1',
    name: 'Cygnus X-1',
    classification: 'black-hole',
    spectralType: 'HMXB',
    position: [-5.50, 6.00, 3.20],
    distPc: 8.74,
    multiplicity: 1,
    planetsCount: 0,
    description: 'High-mass X-ray binary stellar-mass black hole accreting matter from blue supergiant companion HDE 226868.',
  },
  {
    id: 'pleiades',
    name: 'Pleiades Core',
    classification: 'stellar-cluster',
    spectralType: 'M45',
    position: [6.00, 5.00, -4.00],
    distPc: 8.77,
    multiplicity: 7,
    planetsCount: 0,
    description: 'Open star cluster containing luminous hot B-type stars enveloped in reflection nebulosity.',
  },
];

interface SolPlanetConfig {
  id: string;
  name: string;
  classification: CelestialClassification;
  a: number; // AU
  e: number;
  inc: number; // deg
  node: number; // deg
  peri: number; // deg
  period: number; // days
  meanAnomaly: number; // deg
  color: string;
  radiusScene: number;
}

const SOL_PLANETS: SolPlanetConfig[] = [
  {
    id: 'mercury',
    name: 'Mercury',
    classification: 'terrestrial',
    a: 0.3871,
    e: 0.2056,
    inc: 7.005,
    node: 48.331,
    peri: 29.124,
    period: 87.97,
    meanAnomaly: 174.8,
    color: '#8c8c8c',
    radiusScene: 0.07,
  },
  {
    id: 'venus',
    name: 'Venus',
    classification: 'terrestrial',
    a: 0.7233,
    e: 0.0067,
    inc: 3.394,
    node: 76.68,
    peri: 54.884,
    period: 224.7,
    meanAnomaly: 50.1,
    color: '#e3bb7b',
    radiusScene: 0.12,
  },
  {
    id: 'earth',
    name: 'Earth',
    classification: 'terrestrial',
    a: 1.000,
    e: 0.0167,
    inc: 0.0,
    node: -11.26,
    peri: 114.207,
    period: 365.26,
    meanAnomaly: 358.6,
    color: '#2277bb',
    radiusScene: 0.13,
  },
  {
    id: 'mars',
    name: 'Mars',
    classification: 'terrestrial',
    a: 1.5237,
    e: 0.0934,
    inc: 1.85,
    node: 49.557,
    peri: 286.5,
    period: 686.98,
    meanAnomaly: 19.4,
    color: '#c1440e',
    radiusScene: 0.09,
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    classification: 'gas-giant',
    a: 5.2044,
    e: 0.0484,
    inc: 1.303,
    node: 100.46,
    peri: 273.87,
    period: 4332.59,
    meanAnomaly: 20.0,
    color: '#d4a373',
    radiusScene: 0.32,
  },
  {
    id: 'saturn',
    name: 'Saturn',
    classification: 'gas-giant',
    a: 9.5826,
    e: 0.0542,
    inc: 2.485,
    node: 113.67,
    peri: 339.39,
    period: 10759.22,
    meanAnomaly: 317.0,
    color: '#e0cda9',
    radiusScene: 0.28,
  },
];

/**
 * Calculates 3D Cartesian position on a Keplerian orbit.
 */
function getKeplerianPosition(
  a: number,
  e: number,
  incDeg: number,
  nodeDeg: number,
  periDeg: number,
  meanAnomalyDeg: number,
): [number, number, number] {
  const M = meanAnomalyDeg * DEG_TO_RADIANS;
  let E = M + e * Math.sin(M);
  for (let i = 0; i < 3; i++) {
    E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  }
  const sinTheta = (Math.sqrt(1 - e * e) * Math.sin(E)) / (1 - e * Math.cos(E));
  const cosTheta = (Math.cos(E) - e) / (1 - e * Math.cos(E));
  const theta = Math.atan2(sinTheta, cosTheta);
  const r = (a * (1 - e * e)) / (1 + e * Math.cos(theta));
  const phi = theta + periDeg * DEG_TO_RADIANS;
  const xOrb = r * Math.cos(phi);
  const yOrb = r * Math.sin(phi);
  const buf = new Float32Array([xOrb, yOrb, 0]);
  rotateToOrbitalPlane(buf, incDeg, nodeDeg, { degrees: true });
  return [buf[0], buf[1], buf[2]];
}

/**
 * Helper component that smoothly updates OrbitControls camera focal target.
 */
const CameraFocusController: React.FC<{ targetPosition: [number, number, number] }> = ({
  targetPosition,
}) => {
  const { controls } = useThree();
  useEffect(() => {
    const ctrl = controls as unknown as { target?: THREE.Vector3; update?: () => void } | null;
    if (ctrl && ctrl.target instanceof THREE.Vector3) {
      ctrl.target.set(targetPosition[0], targetPosition[1], targetPosition[2]);
      ctrl.update?.();
    }
  }, [controls, targetPosition]);
  return null;
};

// -----------------------------------------------------------------------------
// Story 1: Galactic Macro View Scene
// -----------------------------------------------------------------------------

interface GalacticViewSceneProps {
  onInspectSystem?: (systemId: string) => void;
}

export const GalacticViewScene: React.FC<GalacticViewSceneProps> = ({
  onInspectSystem,
}) => {
  const [selectedId, setSelectedId] = useState<string>('sol');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [showFins, setShowFins] = useState<boolean>(true);
  const [showPlanarGrid, setShowPlanarGrid] = useState<boolean>(true);

  const selectedSystem = useMemo(
    () => CANDIDATE_SYSTEMS.find((s) => s.id === selectedId) ?? CANDIDATE_SYSTEMS[0],
    [selectedId],
  );

  const starDossierData: StarDossierData = useMemo(() => {
    return {
      id: selectedSystem.id,
      name: selectedSystem.name,
      properName: selectedSystem.name,
      spectralType: selectedSystem.spectralType,
      luminosityLsun: selectedSystem.luminosityLsun,
      massMsun: selectedSystem.massMsun,
      radiusRsun: selectedSystem.radiusRsun,
      effectiveTempK: selectedSystem.effectiveTempK,
      distPc: selectedSystem.distPc,
      overviewText: selectedSystem.description,
    };
  }, [selectedSystem]);

  return (
    <div className={styles.viewportContainer}>
      <div className={styles.canvasWrapper}>
        <Canvas camera={{ position: [14, 18, 16], fov: 45 }} gl={{ antialias: true, alpha: true }}>
          <SceneTokenBridge />
          <ambientLight intensity={0.4} />

          {/* Cartographic grid instrument locked to camera focal target */}
          <CartographicGrid
            radius={12}
            rangeRings={[2.5, 5, 10, 15]}
            majorRingIndex={2}
            showFins={showFins}
            showGalacticPlane={true}
            showPlanarFootprint={true}
            showPlanarGrid={showPlanarGrid}
            planarGridGap={10}
            showAxisLines={true}
            lockToFocusPoint={true}
            footprintClassification={selectedSystem.classification}
          />

          {/* Stellar Systems population adhering strictly to the Single-Stalk Rule */}
          <group name="galactic-stars-population">
            {CANDIDATE_SYSTEMS.map((system) => {
              const isSelected = system.id === selectedId;
              const isHovered = system.id === hoveredId;
              const interactionState = isSelected
                ? 'focused'
                : isHovered
                  ? 'active'
                  : 'passive';

              return (
                <CelestialNode
                  key={system.id}
                  id={system.id}
                  name={system.name}
                  position={system.position}
                  classification={system.classification}
                  state={interactionState}
                  spectralType={system.spectralType}
                  multiplicity={system.multiplicity}
                  planets={system.planetsList}
                  showStalk={isSelected} // STRICT SINGLE-STALK RULE: stalk only renders when selected/focused
                  reticleSize={0.45}
                  onClick={(id) => setSelectedId(id)}
                  onPointerOver={(id) => setHoveredId(id)}
                  onPointerOut={() => setHoveredId(null)}
                />
              );
            })}
          </group>

          <CameraFocusController targetPosition={selectedSystem.position} />
          <OrbitControls
            makeDefault
            enableDamping
            dampingFactor={0.05}
            minDistance={2.5}
            maxDistance={55}
          />
        </Canvas>
      </div>

      {/* Top Breadcrumb Bar */}
      <div className={styles.topBar}>
        <nav aria-label="Breadcrumb" className={styles.breadcrumbBar}>
          <button
            type="button"
            className={styles.breadcrumbButton}
            data-active="true"
          >
            Local Volume (100 pc)
          </button>
          {selectedSystem && (
            <>
              <span className={styles.breadcrumbSeparator}>/</span>
              <span className={styles.breadcrumbButton} data-active="true">
                {selectedSystem.name}
              </span>
            </>
          )}
        </nav>

        <div className={styles.modeToggleBar}>
          <Button
            size="sm"
            variant={showFins ? 'primary' : 'secondary'}
            onClick={() => setShowFins((v) => !v)}
          >
            {showFins ? 'Fins: On' : 'Fins: Off'}
          </Button>
          <Button
            size="sm"
            variant={showPlanarGrid ? 'primary' : 'secondary'}
            onClick={() => setShowPlanarGrid((v) => !v)}
          >
            {showPlanarGrid ? 'Planar Grid: On' : 'Planar Grid: Off'}
          </Button>
        </div>
      </div>

      {/* Secondary Objects Pane: Candidate Systems Manifest */}
      <aside className={styles.sidePaneLeft} aria-label="Candidate Systems">
        <div className={styles.manifestCard}>
          <div className={styles.manifestHeader}>
            <span>Candidate Systems</span>
            <span className={styles.manifestCount}>{`${CANDIDATE_SYSTEMS.length} Systems`}</span>
          </div>
          <ul className={styles.manifestList}>
            {CANDIDATE_SYSTEMS.map((sys) => {
              const isSelected = sys.id === selectedId;
              const isHovered = sys.id === hoveredId;
              const rowState = isSelected ? 'selected' : isHovered ? 'active' : 'passive';

              return (
                <li
                  key={sys.id}
                  className={styles.manifestRow}
                  data-state={rowState}
                  onClick={() => setSelectedId(sys.id)}
                  onMouseEnter={() => setHoveredId(sys.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <div className={styles.manifestItemName}>
                    <span>{sys.name}</span>
                    {sys.multiplicity > 1 && (
                      <span className={styles.badgePill}>{`×${sys.multiplicity}`}</span>
                    )}
                  </div>
                  <div className={styles.manifestItemMeta}>
                    <span className={styles.badgePill}>{sys.spectralType}</span>
                    <span>{`${sys.distPc.toFixed(1)} pc`}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>

      {/* Primary Star Dossier & Telemetry Pane */}
      <aside className={styles.sidePaneRight} aria-label="Star Telemetry Dossier">
        <StarDossier
          star={starDossierData}
          onNavigateSystem={onInspectSystem ? () => onInspectSystem(selectedSystem.id) : undefined}
        />
      </aside>

      {/* Attitude Minimap & Orientation HUD Dock */}
      <div className={styles.bottomDock}>
        <div className={styles.bottomDockLeft}>
          <div className={styles.attitudeWidget}>
            <div className={styles.attitudeHeader}>Galactic Compass</div>
            <div className={styles.attitudeRow}>
              <span>Core Bearing (l=0°):</span>
              <span className={styles.attitudeValue}>+X Axis (Radial Inward)</span>
            </div>
            <div className={styles.attitudeRow}>
              <span>Orbit Bearing (l=90°):</span>
              <span className={styles.attitudeValue}>+Y Axis (Prograde Curvature)</span>
            </div>
            <div className={styles.attitudeRow}>
              <span>Galactic Equator:</span>
              <span className={styles.attitudeValue}>Z = 0.0 pc Datum Plane</span>
            </div>
          </div>
        </div>

        {onInspectSystem && (
          <div className={styles.bottomDockRight}>
            <Button
              variant="primary"
              size="md"
              onClick={() => onInspectSystem(selectedSystem.id)}
            >
              {`Inspect ${selectedSystem.name} System →`}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// -----------------------------------------------------------------------------
// Story 2: Stellar System View Scene
// -----------------------------------------------------------------------------

interface SystemViewSceneProps {
  systemId?: string;
  onInspectPlanet?: (planetId: string) => void;
  onNavigateGalaxy?: () => void;
}

export const SystemViewScene: React.FC<SystemViewSceneProps> = ({
  systemId = 'sol',
  onInspectPlanet,
  onNavigateGalaxy,
}) => {
  const [selectedPlanetId, setSelectedPlanetId] = useState<string>('earth');
  const [hoveredPlanetId, setHoveredPlanetId] = useState<string | null>(null);
  const [showOrbits, setShowOrbits] = useState<boolean>(true);
  const [showFins, setShowFins] = useState<boolean>(true);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [timeSpeed, setTimeSpeed] = useState<number>(1);

  const selectedPlanet = useMemo(
    () => SOL_PLANETS.find((p) => p.id === selectedPlanetId) ?? SOL_PLANETS[2],
    [selectedPlanetId],
  );

  const systemDisplayName = useMemo(() => {
    if (systemId === 'tau-ceti') return 'Tau Ceti System';
    if (systemId === 'alpha-centauri') return 'Alpha Centauri System';
    return 'Sol System';
  }, [systemId]);

  // Compute 3D positions for planets along their Keplerian orbits
  const planetPositions = useMemo(() => {
    const map = new Map<string, [number, number, number]>();
    SOL_PLANETS.forEach((planet) => {
      const pos = getKeplerianPosition(
        planet.a,
        planet.e,
        planet.inc,
        planet.node,
        planet.peri,
        planet.meanAnomaly,
      );
      map.set(planet.id, pos);
    });
    return map;
  }, []);

  const orbitRows: OrbitElementRow[] = useMemo(() => {
    return SOL_PLANETS.map((planet) => ({
      id: planet.id,
      name: planet.name,
      semiMajorAxis: planet.a,
      eccentricity: planet.e,
      inclination: planet.inc,
      periodDays: planet.period,
      periapsis: planet.peri,
      node: planet.node,
    }));
  }, []);

  const selectedPos = planetPositions.get(selectedPlanetId) ?? [0, 0, 0];

  return (
    <div className={styles.viewportContainer}>
      <div className={styles.canvasWrapper}>
        <Canvas camera={{ position: [0, 16, 20], fov: 42 }} gl={{ antialias: true, alpha: true }}>
          <SceneTokenBridge />
          <ambientLight intensity={0.5} />
          <pointLight position={[0, 0, 0]} intensity={2.0} color="#ffeedd" />

          {/* System Cartographic Grid centered at the Barycentre */}
          <CartographicGrid
            radius={12}
            rangeRings={[1, 2, 5, 10, 15]}
            majorRingIndex={3}
            showFins={showFins}
            showGalacticPlane={true}
            showPlanarFootprint={true}
            showPlanarGrid={false}
            showAxisLines={true}
            lockToFocusPoint={false}
            position={[0, 0, 0]}
            footprintClassification={selectedPlanet.classification}
          />

          {/* Central Host Star: Sol */}
          <CelestialNode
            id="sol"
            name="Sol (Host Star)"
            position={[0, 0, 0]}
            classification="star"
            spectralType="G2V"
            reticleSize={0.65}
            state="active"
            showStalk={false}
          />

          {/* Keplerian Elliptical Orbit Rings */}
          {SOL_PLANETS.map((planet) => {
            const isFocused = planet.id === selectedPlanetId;
            // Focus Exception Rule: focused orbit always renders even if orbits are toggled off
            if (!showOrbits && !isFocused) return null;

            return (
              <OrbitalRing
                key={planet.id}
                semiMajorAxis={planet.a}
                eccentricity={planet.e}
                inclination={planet.inc}
                ascendingNode={planet.node}
                argumentOfPeriapsis={planet.peri}
                isFocused={isFocused}
                showPeriapsisTick={true}
                showDirectionIndicator={true}
              />
            );
          })}

          {/* Planets rendered with CelestialNode and physical body spheres */}
          {SOL_PLANETS.map((planet) => {
            const pos = planetPositions.get(planet.id) ?? [0, 0, 0];
            const isSelected = planet.id === selectedPlanetId;
            const isHovered = planet.id === hoveredPlanetId;
            const interactionState = isSelected
              ? 'focused'
              : isHovered
                ? 'active'
                : 'passive';

            return (
              <group key={planet.id}>
                {/* Physical Body Mesh */}
                <Sphere args={[planet.radiusScene, 16, 16]} position={pos}>
                  <meshStandardMaterial color={planet.color} roughness={0.7} />
                </Sphere>

                {/* Tactical Reticle & Typographic Label */}
                <CelestialNode
                  id={planet.id}
                  name={planet.name}
                  position={pos}
                  classification={planet.classification}
                  state={interactionState}
                  showStalk={isSelected} // Drop stalk to the invariant plane (Z=0) when selected/focused
                  reticleSize={0.38}
                  onClick={(id) => setSelectedPlanetId(id)}
                  onPointerOver={(id) => setHoveredPlanetId(id)}
                  onPointerOut={() => setHoveredPlanetId(null)}
                />
              </group>
            );
          })}

          <CameraFocusController targetPosition={selectedPos} />
          <OrbitControls
            makeDefault
            enableDamping
            dampingFactor={0.05}
            minDistance={2.0}
            maxDistance={45}
          />
        </Canvas>
      </div>

      {/* Top Breadcrumb Bar */}
      <div className={styles.topBar}>
        <nav aria-label="Breadcrumb" className={styles.breadcrumbBar}>
          <button
            type="button"
            className={styles.breadcrumbButton}
            onClick={onNavigateGalaxy}
          >
            Local Volume
          </button>
          <span className={styles.breadcrumbSeparator}>/</span>
          <button
            type="button"
            className={styles.breadcrumbButton}
            data-active={!selectedPlanet}
          >
            {systemDisplayName}
          </button>
          {selectedPlanet && (
            <>
              <span className={styles.breadcrumbSeparator}>/</span>
              <span className={styles.breadcrumbButton} data-active="true">
                {selectedPlanet.name}
              </span>
            </>
          )}
        </nav>

        <div className={styles.modeToggleBar}>
          <Button
            size="sm"
            variant={showOrbits ? 'primary' : 'secondary'}
            onClick={() => setShowOrbits((v) => !v)}
          >
            {showOrbits ? 'Orbits: Visible' : 'Orbits: Hidden'}
          </Button>
          <Button
            size="sm"
            variant={showFins ? 'primary' : 'secondary'}
            onClick={() => setShowFins((v) => !v)}
          >
            {showFins ? 'Fins: On' : 'Fins: Off'}
          </Button>
        </div>
      </div>

      {/* Secondary Pane: Keplerian Orbit Table */}
      <aside className={styles.sidePaneRight} aria-label="Keplerian Orbital Telemetry">
        <Stack gap="default">
          <OrbitTable
            orbits={orbitRows}
            selectedId={selectedPlanetId}
            onSelect={(id) => setSelectedPlanetId(id)}
          />

          <Panel padding="default">
            <Stack gap="tight">
              <Cluster gap="tight">
                <h3 className={styles.manifestItemName}>{selectedPlanet.name}</h3>
                <Badge status="info">{selectedPlanet.classification}</Badge>
              </Cluster>
              <div className={styles.telemetryGrid}>
                <div className={styles.telemetryItem}>
                  <span className={styles.telemetryLabel}>Semi-Major Axis</span>
                  <span className={styles.telemetryValue}>{`${selectedPlanet.a.toFixed(3)} AU`}</span>
                </div>
                <div className={styles.telemetryItem}>
                  <span className={styles.telemetryLabel}>Eccentricity</span>
                  <span className={styles.telemetryValue}>{selectedPlanet.e.toFixed(4)}</span>
                </div>
                <div className={styles.telemetryItem}>
                  <span className={styles.telemetryLabel}>Orbital Period</span>
                  <span className={styles.telemetryValue}>{`${selectedPlanet.period.toFixed(1)} d`}</span>
                </div>
                <div className={styles.telemetryItem}>
                  <span className={styles.telemetryLabel}>Inclination</span>
                  <span className={styles.telemetryValue}>{`${selectedPlanet.inc.toFixed(2)}°`}</span>
                </div>
              </div>

              {onInspectPlanet && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onInspectPlanet(selectedPlanet.id)}
                >
                  {`Inspect ${selectedPlanet.name} →`}
                </Button>
              )}
            </Stack>
          </Panel>
        </Stack>
      </aside>

      {/* Bottom Controls Dock */}
      <div className={styles.bottomDock}>
        <div className={styles.bottomDockLeft}>
          <SystemControls
            isPlaying={isPlaying}
            onTogglePlay={() => setIsPlaying((p) => !p)}
            timeSpeed={timeSpeed}
            onTimeSpeedChange={setTimeSpeed}
            showOrbits={showOrbits}
            onToggleOrbits={setShowOrbits}
            showGrid={showFins}
            onToggleGrid={setShowFins}
          />
        </div>

        {onInspectPlanet && (
          <div className={styles.bottomDockRight}>
            <Button
              variant="primary"
              size="md"
              onClick={() => onInspectPlanet(selectedPlanet.id)}
            >
              {`Inspect ${selectedPlanet.name} Planetary View →`}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// -----------------------------------------------------------------------------
// Story 3: Planetary Inspection View Scene
// -----------------------------------------------------------------------------

interface PlanetaryViewSceneProps {
  planetId?: string;
  onNavigateSystem?: () => void;
  onNavigateGalaxy?: () => void;
}

export const PlanetaryViewScene: React.FC<PlanetaryViewSceneProps> = ({
  planetId = 'earth',
  onNavigateSystem,
  onNavigateGalaxy,
}) => {
  const isEarth = planetId.toLowerCase() === 'earth';
  const planetDisplayName = isEarth ? 'Earth' : planetId.charAt(0).toUpperCase() + planetId.slice(1);
  const [daylightMode, setDaylightMode] = useState<boolean>(false);
  const [selectedMoon, setSelectedMoon] = useState<boolean>(false);
  const [showFins, setShowFins] = useState<boolean>(true);

  // Lunar position along orbit: semi-major axis 3.8 scene units, inclination 5.14 deg
  const moonPos: [number, number, number] = useMemo(() => {
    const a = 3.8;
    const incDeg = 5.14;
    const theta = 0.85; // rad
    const x = a * Math.cos(theta);
    const y = a * Math.sin(theta);
    const buf = new Float32Array([x, y, 0]);
    rotateToOrbitalPlane(buf, incDeg, 0, { degrees: true });
    return [buf[0], buf[1], buf[2]];
  }, []);

  const targetFocalPos: [number, number, number] = selectedMoon ? moonPos : [0, 0, 0];

  return (
    <div className={styles.viewportContainer}>
      <div className={styles.canvasWrapper}>
        <Canvas camera={{ position: [0, 4.2, 5.2], fov: 45 }} gl={{ antialias: true, alpha: true }}>
          <SceneTokenBridge />

          {/* Dynamic Day/Night Terminator or Cartographic Daylight Mode */}
          <ambientLight intensity={daylightMode ? 0.95 : 0.15} />
          {/* Directional sunlight radiating outward from the distant host star (+X direction) */}
          <directionalLight
            position={[25, 2, 0]}
            intensity={daylightMode ? 0.35 : 2.2}
            color="#fff8f0"
          />

          {/* Planetary Inspection Cartographic Grid dropped on the Rotational Equator (Z=0) */}
          <CartographicGrid
            radius={5.5}
            rangeRings={[1.5, 3.0, 5.0]}
            majorRingIndex={2}
            showFins={showFins}
            showGalacticPlane={true}
            showPlanarFootprint={true}
            showPlanarGrid={false}
            showAxisLines={true}
            lockToFocusPoint={false}
            position={[0, 0, 0]}
            footprintClassification="terrestrial"
          />

          {/* Distant Host Star Directional Anchor (Sol) at [22, 0, 0] */}
          <group position={[22, 0, 0]}>
            <CelestialNode
              id="sol-anchor"
              name="Sol (Host Star Anchor)"
              position={[0, 0, 0]}
              classification="star"
              spectralType="G2V"
              reticleSize={0.45}
              state="passive"
              showStalk={false}
            />
          </group>

          {/* Planetary Body: Earth with 23.44° Axial Tilt */}
          <group rotation={[0, 0, 23.44 * DEG_TO_RADIANS]}>
            {/* Earth Surface Sphere */}
            <Sphere args={[1.5, 64, 64]} position={[0, 0, 0]}>
              <meshStandardMaterial
                color="#1d6391"
                roughness={0.65}
                metalness={0.12}
              />
            </Sphere>

            {/* Atmospheric Haze Layer */}
            <Sphere args={[1.56, 48, 48]} position={[0, 0, 0]}>
              <meshStandardMaterial
                color="#64b5f6"
                transparent
                opacity={0.32}
                depthWrite={false}
                side={THREE.DoubleSide}
              />
            </Sphere>
          </group>

          {/* Tactical Center-of-Mass Node */}
          <CelestialNode
            id="planet-center-node"
            name={planetDisplayName}
            position={[0, 0, 0]}
            classification="terrestrial"
            state={selectedMoon ? 'active' : 'focused'}
            showStalk={false}
            reticleSize={0.5}
            onClick={() => setSelectedMoon(false)}
          />

          {/* Lunar Orbit Ring */}
          <OrbitalRing
            semiMajorAxis={3.8}
            eccentricity={0.0549}
            inclination={5.14}
            ascendingNode={125.08}
            argumentOfPeriapsis={318.15}
            isFocused={selectedMoon}
            showPeriapsisTick={true}
            showDirectionIndicator={true}
          />

          {/* Moon (Luna) Body and Reticle */}
          <group position={moonPos}>
            <Sphere args={[0.3, 32, 32]}>
              <meshStandardMaterial color="#9ea3a6" roughness={0.88} />
            </Sphere>
            <CelestialNode
              id="moon"
              name="Moon (Luna)"
              position={[0, 0, 0]}
              classification="terrestrial"
              state={selectedMoon ? 'focused' : 'active'}
              showStalk={selectedMoon}
              reticleSize={0.35}
              onClick={() => setSelectedMoon(true)}
            />
          </group>

          <CameraFocusController targetPosition={targetFocalPos} />
          <OrbitControls
            makeDefault
            enableDamping
            dampingFactor={0.05}
            minDistance={2.0}
            maxDistance={18}
          />
        </Canvas>
      </div>

      {/* Top Breadcrumb Bar */}
      <div className={styles.topBar}>
        <nav aria-label="Breadcrumb" className={styles.breadcrumbBar}>
          <button
            type="button"
            className={styles.breadcrumbButton}
            onClick={onNavigateGalaxy}
          >
            Local Volume
          </button>
          <span className={styles.breadcrumbSeparator}>/</span>
          <button
            type="button"
            className={styles.breadcrumbButton}
            onClick={onNavigateSystem}
          >
            Sol System
          </button>
          <span className={styles.breadcrumbSeparator}>/</span>
          <button
            type="button"
            className={styles.breadcrumbButton}
            data-active={!selectedMoon}
            onClick={() => setSelectedMoon(false)}
          >
            {planetDisplayName}
          </button>
          {selectedMoon && (
            <>
              <span className={styles.breadcrumbSeparator}>/</span>
              <span className={styles.breadcrumbButton} data-active="true">
                Moon (Luna)
              </span>
            </>
          )}
        </nav>

        <div className={styles.modeToggleBar}>
          <Button
            size="sm"
            variant={daylightMode ? 'primary' : 'secondary'}
            onClick={() => setDaylightMode((v) => !v)}
          >
            {daylightMode ? 'Lighting: Daylight' : 'Lighting: Terminator'}
          </Button>
          <Button
            size="sm"
            variant={showFins ? 'primary' : 'secondary'}
            onClick={() => setShowFins((v) => !v)}
          >
            {showFins ? 'Fins: On' : 'Fins: Off'}
          </Button>
        </div>
      </div>

      {/* Secondary Objects Pane: Natural Satellites Manifest */}
      <aside className={styles.sidePaneLeft} aria-label="Natural Satellites">
        <div className={styles.manifestCard}>
          <div className={styles.manifestHeader}>
            <span>Natural Satellites</span>
            <span className={styles.manifestCount}>1 Moon</span>
          </div>
          <ul className={styles.manifestList}>
            <li
              className={styles.manifestRow}
              data-state={!selectedMoon ? 'selected' : 'passive'}
              onClick={() => setSelectedMoon(false)}
            >
              <div className={styles.manifestItemName}>
                <span>{`${planetDisplayName} (Primary)`}</span>
              </div>
              <div className={styles.manifestItemMeta}>
                <span className={styles.badgePill}>1.0 M⊕</span>
              </div>
            </li>
            <li
              className={styles.manifestRow}
              data-state={selectedMoon ? 'selected' : 'passive'}
              onClick={() => setSelectedMoon(true)}
            >
              <div className={styles.manifestItemName}>
                <span>Moon (Luna)</span>
              </div>
              <div className={styles.manifestItemMeta}>
                <span className={styles.badgePill}>27.32 d</span>
                <span>1,737 km</span>
              </div>
            </li>
          </ul>
        </div>
      </aside>

      {/* Planetary Dossier Telemetry Panel */}
      <aside className={styles.sidePaneRight} aria-label="Planetary Dossier Telemetry">
        <Panel padding="default">
          <Stack gap="default">
            <Stack gap="tight">
              <Cluster gap="tight">
                <h2 className={styles.manifestItemName}>{planetDisplayName}</h2>
                <Badge status="info">Terrestrial</Badge>
                <Badge status="nominal">Habitable</Badge>
              </Cluster>
              <p className={styles.manifestCount}>
                Third planet from Sol. Possesses a nitrogen-oxygen atmosphere, active plate tectonics, and a protective magnetosphere.
              </p>
            </Stack>

            <div className={styles.telemetryGrid}>
              <div className={styles.telemetryItem}>
                <span className={styles.telemetryLabel}>Mean Radius</span>
                <span className={styles.telemetryValue}>6,371 km</span>
              </div>
              <div className={styles.telemetryItem}>
                <span className={styles.telemetryLabel}>Surface Gravity</span>
                <span className={styles.telemetryValue}>1.00 g (9.81 m/s²)</span>
              </div>
              <div className={styles.telemetryItem}>
                <span className={styles.telemetryLabel}>Orbital Period</span>
                <span className={styles.telemetryValue}>365.26 d</span>
              </div>
              <div className={styles.telemetryItem}>
                <span className={styles.telemetryLabel}>Rotational Period</span>
                <span className={styles.telemetryValue}>23.93 h</span>
              </div>
              <div className={styles.telemetryItem}>
                <span className={styles.telemetryLabel}>Axial Tilt</span>
                <span className={styles.telemetryValue}>23.44°</span>
              </div>
              <div className={styles.telemetryItem}>
                <span className={styles.telemetryLabel}>Escape Velocity</span>
                <span className={styles.telemetryValue}>11.19 km/s</span>
              </div>
            </div>

            <Stack gap="dense">
              <span className={styles.telemetryLabel}>Atmospheric Composition</span>
              <span className={styles.attitudeValue}>
                N₂ 78.08%, O₂ 20.95%, Ar 0.93%, CO₂ 0.04%
              </span>
            </Stack>

            <Cluster gap="tight">
              <span className={styles.badgePill}>Confidence: High (In-Situ)</span>
              <span className={styles.badgePill}>Hazard: Nominal</span>
            </Cluster>
          </Stack>
        </Panel>
      </aside>

      {/* Bottom Orientation Dock */}
      <div className={styles.bottomDock}>
        <div className={styles.bottomDockLeft}>
          <div className={styles.attitudeWidget}>
            <div className={styles.attitudeHeader}>Planetary Orientation</div>
            <div className={styles.attitudeRow}>
              <span>Rotational Equator:</span>
              <span className={styles.attitudeValue}>XY Plane (Z = Rotational Axis)</span>
            </div>
            <div className={styles.attitudeRow}>
              <span>Host Star Bearing:</span>
              <span className={styles.attitudeValue}>+X Radial Direction (Sol)</span>
            </div>
            <div className={styles.attitudeRow}>
              <span>Orbital Velocity Vector:</span>
              <span className={styles.attitudeValue}>+Y Prograde Direction</span>
            </div>
          </div>
        </div>

        {onNavigateSystem && (
          <div className={styles.bottomDockRight}>
            <Button variant="secondary" onClick={onNavigateSystem}>
              ← Return to Sol System View
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// -----------------------------------------------------------------------------
// Story 4: Interactive Multi-Scale Navigator (Galaxy <-> System <-> Planet)
// -----------------------------------------------------------------------------

export const InteractiveNavigator: React.FC = () => {
  const [scale, setScale] = useState<'galaxy' | 'system' | 'planet'>('galaxy');
  const [selectedSystemId, setSelectedSystemId] = useState<string>('sol');
  const [selectedPlanetId, setSelectedPlanetId] = useState<string>('earth');

  // Keyboard Escape navigation: steps back one view scale tier
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (scale === 'planet') setScale('system');
        else if (scale === 'system') setScale('galaxy');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scale]);

  if (scale === 'planet') {
    return (
      <PlanetaryViewScene
        planetId={selectedPlanetId}
        onNavigateSystem={() => setScale('system')}
        onNavigateGalaxy={() => setScale('galaxy')}
      />
    );
  }

  if (scale === 'system') {
    return (
      <SystemViewScene
        systemId={selectedSystemId}
        onInspectPlanet={(planetId) => {
          setSelectedPlanetId(planetId);
          setScale('planet');
        }}
        onNavigateGalaxy={() => setScale('galaxy')}
      />
    );
  }

  return (
    <GalacticViewScene
      onInspectSystem={(systemId) => {
        setSelectedSystemId(systemId);
        setScale('system');
      }}
    />
  );
};

// -----------------------------------------------------------------------------
// Storybook Story Exports
// -----------------------------------------------------------------------------

type Story = StoryObj<typeof meta>;

export const GalacticView: Story = {
  name: '1. Galactic View (Parsec Scale)',
  render: () => <GalacticViewScene />,
};

export const SystemView: Story = {
  name: '2. System View (AU Scale)',
  render: () => <SystemViewScene />,
};

export const PlanetaryView: Story = {
  name: '3. Planetary View (Kilometre Scale)',
  render: () => <PlanetaryViewScene />,
};

export const CrossScaleNavigator: Story = {
  name: '4. Interactive Multi-Scale Navigator',
  render: () => <InteractiveNavigator />,
};
