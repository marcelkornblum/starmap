import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import {
  CelestialEntity,
  SpatialEntityProvider,
  OcclusionPass,
  type CelestialInteractionState,
} from './index';
import {
  CartographicInstrument,
  SYSTEM_FRAME,
  GALACTIC_FRAME,
} from '../instrument';
import { getStandardInitialCamera } from '../cartography/cartographyMath';
import { celestialOcclusionManager } from '../cartography/celestialOcclusionRegistry';
import { ThemeTokenBridge } from '../ThemeTokenBridge';
import styles from '../cartography/StorybookCanvasWrapper.module.css';

const meta: Meta<typeof CelestialEntity> = {
  title: 'Canvas/Celestial Entities/Celestial Entity',
  component: CelestialEntity,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof CelestialEntity>;

export const TaxonomicReticles: Story = {
  name: '1. Taxonomic Reticles & Facets',
  render: () => {
    const systems = [
      {
        id: 'tax-sol',
        name: 'Sol',
        classification: 'star' as const,
        spectralType: 'G2V',
        multiplicity: 1,
        planets: [
          { id: 'p-mercury', name: 'Mercury', classification: 'terrestrial' as const },
          { id: 'p-venus', name: 'Venus', classification: 'terrestrial' as const },
          { id: 'p-earth', name: 'Earth', classification: 'terrestrial' as const },
          { id: 'p-mars', name: 'Mars', classification: 'terrestrial' as const },
          { id: 'p-jupiter', name: 'Jupiter', classification: 'gas-giant' as const },
          { id: 'p-saturn', name: 'Saturn', classification: 'gas-giant' as const },
          { id: 'p-uranus', name: 'Uranus', classification: 'ice-giant' as const },
          { id: 'p-neptune', name: 'Neptune', classification: 'ice-giant' as const },
        ],
      },
      {
        id: 'tax-teide1',
        name: 'Teide 1',
        classification: 'brown-dwarf' as const,
        spectralType: 'M8V',
        multiplicity: 1,
      },
      {
        id: 'tax-sirius-b',
        name: 'Sirius B',
        classification: 'white-dwarf' as const,
        spectralType: 'DA2',
        multiplicity: 2,
      },
      {
        id: 'tax-cygnus-x1',
        name: 'Cygnus X-1',
        classification: 'black-hole' as const,
        spectralType: 'HMXB',
        multiplicity: 2,
      },
      {
        id: 'tax-alpha-cen-ab',
        name: 'Alpha Centauri AB',
        classification: 'barycentre' as const,
        spectralType: 'G2V·K1V',
        multiplicity: 3,
        planets: [
          { id: 'p-prox-b', name: 'Proxima b', classification: 'terrestrial' as const },
          { id: 'p-prox-c', name: 'Proxima c', classification: 'gas-giant' as const },
        ],
      },
      {
        id: 'tax-pleiades',
        name: 'Pleiades',
        classification: 'stellar-cluster' as const,
        spectralType: 'OPEN-CL',
        multiplicity: 7,
      },
      {
        id: 'tax-oneill',
        name: "O'Neill Station",
        classification: 'construct' as const,
        spectralType: 'HAB-01',
        multiplicity: 1,
      },
    ];
    const cam = getStandardInitialCamera(18, [0, 0, 0], 35);

    return (
      <div className={styles.canvasContainer}>
        <Canvas camera={{ position: cam.position, up: cam.up, fov: cam.fov }}>
          <ThemeTokenBridge />
          <OrbitControls makeDefault target={[0, 0, 0]} enableDamping dampingFactor={0.05} />
          <ambientLight intensity={1} />
          <SpatialEntityProvider>
            <OcclusionPass />
            {systems.map((s, idx) => {
              const x = (idx - 3) * 2.2;
              return (
                <CelestialEntity
                  key={s.id}
                  id={s.id}
                  name={s.name}
                  position={[x, 0, 0]}
                  classification={s.classification}
                  spectralType={s.spectralType}
                  multiplicity={s.multiplicity}
                  planets={s.planets}
                  state="selected"
                  showStalk={false}
                />
              );
            })}
          </SpatialEntityProvider>
        </Canvas>
      </div>
    );
  },
};

export const InteractionStates: Story = {
  name: '2. Interaction States (Passive, Active, Selected, Focused)',
  render: () => {
    const states: CelestialInteractionState[] = ['passive', 'active', 'selected', 'focused'];
    const cam = getStandardInitialCamera(14, [0, 0, 0], 35);

    return (
      <div className={styles.canvasContainer}>
        <Canvas camera={{ position: cam.position, up: cam.up, fov: cam.fov }}>
          <ThemeTokenBridge />
          <OrbitControls makeDefault target={[0, 0, 0]} enableDamping dampingFactor={0.05} />
          <ambientLight intensity={1} />
          <SpatialEntityProvider>
            <OcclusionPass />
            {states.map((st, idx) => {
              const x = (idx - 1.5) * 2.2;
              const z = idx % 2 === 0 ? 1.0 : -1.0;
              return (
                <CelestialEntity
                  key={st}
                  id={`state-${st}`}
                  name={`State: ${st}`}
                  position={[x, 0, z]}
                  classification="star"
                  state={st}
                  spectralType="G2V"
                  multiplicity={idx >= 2 ? 2 : 1}
                  planets={
                    idx >= 2
                      ? [
                          { id: 'p1', name: 'Planet b', classification: 'terrestrial' },
                          { id: 'p2', name: 'Planet c', classification: 'gas-giant' },
                        ]
                      : undefined
                  }
                />
              );
            })}
          </SpatialEntityProvider>
        </Canvas>
      </div>
    );
  },
};

export const DropStalksHemispheres: Story = {
  name: '3. Drop Stalks & Hemispheric Inversion',
  render: () => {
    const cam = getStandardInitialCamera(16, [0, 0, 0], 45);
    return (
      <div className={styles.canvasContainer}>
        <Canvas camera={{ position: cam.position, up: cam.up, fov: cam.fov }}>
          <ThemeTokenBridge />
          <OrbitControls makeDefault target={[0, 0, 0]} enableDamping dampingFactor={0.05} />
          <CartographicInstrument frame={GALACTIC_FRAME} showPlanarGrid showFins={false} />
          <SpatialEntityProvider>
            <OcclusionPass />
            {/* Northern hemisphere (+Z): Solid stalk */}
            <CelestialEntity
              id="star-north"
              name="Polaris (+Z North)"
              position={[3, 2, 2.5]}
              classification="star"
              state="selected"
              spectralType="F7Ib"
            />
            {/* Southern hemisphere (-Z): Dashed stalk */}
            <CelestialEntity
              id="star-south"
              name="Canopus (-Z South)"
              position={[-3, -2, -2.5]}
              classification="star"
              state="selected"
              spectralType="A9II"
            />
          </SpatialEntityProvider>
        </Canvas>
      </div>
    );
  },
};

export const KinematicVectorAndOrbits: Story = {
  name: '4. Kinematic Vectors & Dashed Keplerian Orbits',
  render: () => {
    const cam = getStandardInitialCamera(14, [0, 0, 0], 45);
    return (
      <div className={styles.canvasContainer}>
        <Canvas camera={{ position: cam.position, up: cam.up, fov: cam.fov }}>
          <ThemeTokenBridge />
          <OrbitControls makeDefault target={[0, 0, 0]} enableDamping dampingFactor={0.05} />
          <CartographicInstrument frame={SYSTEM_FRAME} showPlanarGrid showFins={false} />
          <SpatialEntityProvider>
            <OcclusionPass />
            {/* Central star */}
            <CelestialEntity
              id="central-star"
              name="Sol"
              position={[0, 0, 0]}
              classification="star"
              state="focused"
              spectralType="G2V"
            />
            {/* Planet with orbit referring to central star, passing directly through entity */}
            <CelestialEntity
              id="planet-1"
              name="Earth"
              classification="star"
              state="selected"
              orbit={{
                primaryEntityId: 'central-star',
                semiMajorAxis: 3.0,
                eccentricity: 0.15,
                inclination: 7.0,
                ascendingNode: 45.0,
                argumentOfPeriapsis: 30.0,
                meanAnomaly: 55.0,
                lineStyle: 'dashed',
                showPeriapsisTick: true,
                showDirectionArrow: true,
              }}
            />
          </SpatialEntityProvider>
        </Canvas>
      </div>
    );
  },
};

const InteractiveCompositeSceneDemo: React.FC = () => {
  const [selectedId, setSelectedId] = useState<string | null>('alpha-centauri-a');
  const cam = getStandardInitialCamera(28, [0, 0, 0], 40);

  const systems = [
    {
      id: 'sol',
      name: 'Sol',
      position: [0, 0, 0] as [number, number, number],
      classification: 'star' as const,
      spectralType: 'G2V',
      multiplicity: 1,
      planets: [
        { id: 'earth', name: 'Earth', classification: 'terrestrial' as const },
        { id: 'jupiter', name: 'Jupiter', classification: 'gas-giant' as const },
      ],
      velocity: new THREE.Vector3(0.3, 0.2, 0.05),
    },
    {
      id: 'alpha-centauri-a',
      name: 'Alpha Centauri A',
      position: [4.37, 1.2, 1.8] as [number, number, number],
      classification: 'star' as const,
      spectralType: 'G2V',
      multiplicity: 2,
      planets: [{ id: 'proxima-b', name: 'Proxima b', classification: 'terrestrial' as const }],
      velocity: new THREE.Vector3(-0.4, 0.1, -0.2),
    },
    {
      id: 'alpha-centauri-b',
      name: 'Alpha Centauri B',
      position: [4.65, 1.35, 1.85] as [number, number, number],
      classification: 'star' as const,
      spectralType: 'K1V',
      multiplicity: 2,
      velocity: new THREE.Vector3(-0.35, 0.08, -0.18),
    },
    {
      id: 'sirius',
      name: 'Sirius',
      position: [-6.2, 4.1, -2.4] as [number, number, number],
      classification: 'white-dwarf' as const,
      spectralType: 'A1V + DA2',
      multiplicity: 2,
    },
    {
      id: 'barnards-star',
      name: "Barnard's Star",
      position: [2.1, -5.3, 0.9] as [number, number, number],
      classification: 'brown-dwarf' as const,
      spectralType: 'M4V',
      multiplicity: 1,
      velocity: new THREE.Vector3(-0.8, 0.6, 0.1),
    },
    {
      id: 'cygnus-x1',
      name: 'Cygnus X-1',
      position: [-8.5, -7.0, 3.2] as [number, number, number],
      classification: 'black-hole' as const,
      spectralType: 'HMXB',
      multiplicity: 2,
    },
  ];

  return (
    <div className={styles.canvasContainer}>
      <div className={styles.demoOverlay}>
        <div><strong>Click any system node to select & inspect:</strong></div>
        <div>Active target: <span className={styles.targetHighlight}>{selectedId ?? 'None'}</span></div>
        <div><em>Note: Alpha Centauri A & B illustrate real-time label collision displacement and occlusion.</em></div>
      </div>

      <Canvas camera={{ position: cam.position, up: cam.up, fov: cam.fov }}>
        <ThemeTokenBridge />
        <OrbitControls makeDefault target={[0, 0, 0]} enableDamping dampingFactor={0.05} />
        <CartographicInstrument frame={GALACTIC_FRAME} showPlanarGrid showFins />
        <SpatialEntityProvider>
          <OcclusionPass />
          {systems.map((s) => {
            const state: CelestialInteractionState =
              selectedId === s.id ? 'focused' : 'active';
            return (
              <CelestialEntity
                key={s.id}
                id={s.id}
                name={s.name}
                position={s.position}
                classification={s.classification}
                state={state}
                spectralType={s.spectralType}
                multiplicity={s.multiplicity}
                planets={s.planets}
                velocity={s.velocity}
                onClick={(id) => setSelectedId((prev) => (prev === id ? null : id))}
              />
            );
          })}
        </SpatialEntityProvider>
      </Canvas>
    </div>
  );
};

export const InteractiveCompositeScene: Story = {
  name: '5. Interactive Composite Scene (Hitareas & Occlusion)',
  render: () => <InteractiveCompositeSceneDemo />,
};

interface DiagnosticNode {
  id: string;
  name: string;
  state: string;
  screenX: number;
  screenY: number;
  camDist: number;
  hitOffsetX: number;
  hitOffsetY: number;
  isReticleSuppressed: boolean;
  labelDisplaced: boolean;
  labelOccluded: boolean;
}

function createEmptyDiagnosticNode(): DiagnosticNode {
  return {
    id: '',
    name: '',
    state: '',
    screenX: 0,
    screenY: 0,
    camDist: 0,
    hitOffsetX: 0,
    hitOffsetY: 0,
    isReticleSuppressed: false,
    labelDisplaced: false,
    labelOccluded: false,
  };
}

const DiagnosticMonitor: React.FC<{
  onUpdate: (nodes: DiagnosticNode[]) => void;
}> = ({ onUpdate }) => {
  const frameCount = useRef(0);
  const poolRef = useRef<DiagnosticNode[]>([]);

  useFrame(() => {
    frameCount.current++;
    if (frameCount.current % 10 !== 0) return;

    const footprints = celestialOcclusionManager.getAllFootprints();
    const len = footprints.length;
    const pool = poolRef.current;
    while (pool.length < len) {
      pool.push(createEmptyDiagnosticNode());
    }
    pool.length = len;

    for (let i = 0; i < len; i++) {
      const fp = footprints[i];
      const isReticleSuppressed = celestialOcclusionManager.evaluateReticleOcclusion(fp.id);
      const hitOffset = celestialOcclusionManager.evaluateHitAreaOffset(fp.id);
      const labelEval = celestialOcclusionManager.evaluateLabelOcclusion(fp.id, fp.labelBox);

      const item = pool[i];
      item.id = fp.id;
      item.name = fp.name ?? fp.id;
      item.state = fp.state ?? 'active';
      item.screenX = Math.round(fp.screenX);
      item.screenY = Math.round(fp.screenY);
      item.camDist = Number(fp.camDist?.toFixed(2) ?? 0);
      item.hitOffsetX = Number(hitOffset.x.toFixed(1));
      item.hitOffsetY = Number(hitOffset.y.toFixed(1));
      item.isReticleSuppressed = isReticleSuppressed;
      item.labelDisplaced = labelEval.isDisplaced;
      item.labelOccluded = !labelEval.visible;
    }

    onUpdate(pool.slice(0, len));
  });

  return null;
};

const ClusteringAndCollisionDemo: React.FC = () => {
  const [scenario, setScenario] = useState<'binary' | 'priority' | 'crowded'>('binary');
  const [selectedId, setSelectedId] = useState<string | null>('bin-alpha');
  const [debugHitarea, setDebugHitarea] = useState<boolean>(true);
  const [diagnostics, setDiagnostics] = useState<DiagnosticNode[]>([]);

  const cam = getStandardInitialCamera(14, [0, 0, 0], 35);

  const binarySystems = [
    {
      id: 'bin-alpha',
      name: 'Alpha Centauri A',
      position: [0, 0, 0] as [number, number, number],
      classification: 'star' as const,
      spectralType: 'G2V',
      multiplicity: 2,
    },
    {
      id: 'bin-beta',
      name: 'Alpha Centauri B',
      position: [0.08, 0.08, 0] as [number, number, number],
      classification: 'star' as const,
      spectralType: 'K1V',
      multiplicity: 2,
    },
  ];

  const prioritySystems = [
    {
      id: 'pri-fg',
      name: 'Foreground Star',
      position: [0, 0, 2] as [number, number, number],
      classification: 'star' as const,
      spectralType: 'A0V',
      multiplicity: 1,
    },
    {
      id: 'pri-bg',
      name: 'Background Star',
      position: [0, 0, -2.5] as [number, number, number],
      classification: 'star' as const,
      spectralType: 'M2V',
      multiplicity: 1,
    },
  ];

  const crowdedSystems = [
    {
      id: 'crowd-1',
      name: 'Rigel Core',
      position: [0, 0, 0] as [number, number, number],
      classification: 'star' as const,
      spectralType: 'B8Ia',
      multiplicity: 1,
    },
    {
      id: 'crowd-2',
      name: 'Rigel B',
      position: [0.35, 0.2, 0.25] as [number, number, number],
      classification: 'star' as const,
      spectralType: 'B9V',
      multiplicity: 2,
    },
    {
      id: 'crowd-3',
      name: 'Rigel C',
      position: [-0.3, 0.25, -0.3] as [number, number, number],
      classification: 'white-dwarf' as const,
      spectralType: 'DA2',
      multiplicity: 1,
    },
    {
      id: 'crowd-4',
      name: 'Dense Dust Node',
      position: [0.15, -0.3, 0.1] as [number, number, number],
      classification: 'brown-dwarf' as const,
      spectralType: 'L2',
      multiplicity: 1,
    },
    {
      id: 'crowd-5',
      name: 'Outer Companion',
      position: [-0.25, -0.28, -0.45] as [number, number, number],
      classification: 'star' as const,
      spectralType: 'M3V',
      multiplicity: 1,
    },
    {
      id: 'crowd-6',
      name: 'Background Source',
      position: [0.4, -0.15, -0.9] as [number, number, number],
      classification: 'black-hole' as const,
      spectralType: 'HMXB',
      multiplicity: 1,
    },
  ];

  const activeSystems =
    scenario === 'binary'
      ? binarySystems
      : scenario === 'priority'
        ? prioritySystems
        : crowdedSystems;

  return (
    <div className={styles.canvasContainer}>
      <div className={styles.demoOverlay}>
        <div><strong>Spec 2.2 / 2.3 Clustering & Collision Diagnostics</strong></div>
        <div className={styles.buttonRow}>
          <button
            type="button"
            className={styles.demoButton}
            data-active={scenario === 'binary'}
            onClick={() => {
              setScenario('binary');
              setSelectedId('bin-alpha');
            }}
          >
            1. Overlapping Binary (HitArea Fan-Out)
          </button>
          <button
            type="button"
            className={styles.demoButton}
            data-active={scenario === 'priority'}
            onClick={() => {
              setScenario('priority');
              setSelectedId('pri-fg');
            }}
          >
            2. Priority Reticle Mask
          </button>
          <button
            type="button"
            className={styles.demoButton}
            data-active={scenario === 'crowded'}
            onClick={() => {
              setScenario('crowded');
              setSelectedId(null);
            }}
          >
            3. Crowded Cluster (8-Way Displacement)
          </button>
          <button
            type="button"
            className={styles.demoButton}
            data-active={debugHitarea}
            onClick={() => setDebugHitarea((v) => !v)}
          >
            {debugHitarea ? 'HitArea Wireframes: ON' : 'HitArea Wireframes: OFF'}
          </button>
        </div>

        <div>
          Active Selection: <span className={styles.targetHighlight}>{selectedId ?? 'None (Ambient)'}</span>
          {' | '}
          <em>
            {scenario === 'binary' && 'Click the cluster to cycle selection between Alpha and Beta. Wireframes illustrate radial fan-out.'}
            {scenario === 'priority' && 'Foreground star commands priority; background reticle is suppressed beneath it.'}
            {scenario === 'crowded' && 'Labels displace radially along 8 leader directions or yield to 0% opacity based on proximity.'}
          </em>
        </div>

        {diagnostics.length > 0 && (
          <table className={styles.diagTable}>
            <thead>
              <tr>
                <th>Node</th>
                <th>State</th>
                <th>Screen (X, Y)</th>
                <th>Depth</th>
                <th>Hit Offset</th>
                <th>Reticle</th>
                <th>Label</th>
              </tr>
            </thead>
            <tbody>
              {diagnostics.map((d) => (
                <tr key={d.id}>
                  <td><strong>{d.name}</strong></td>
                  <td>{d.state}</td>
                  <td>({d.screenX}, {d.screenY})</td>
                  <td>{d.camDist}</td>
                  <td>
                    {d.hitOffsetX !== 0 || d.hitOffsetY !== 0 ? (
                      <span className={styles.statusActive}>({d.hitOffsetX}, {d.hitOffsetY}) px</span>
                    ) : (
                      'None (0, 0)'
                    )}
                  </td>
                  <td>
                    {d.isReticleSuppressed ? (
                      <span className={styles.statusSuppressed}>Suppressed (Mask)</span>
                    ) : (
                      <span className={styles.statusActive}>Visible</span>
                    )}
                  </td>
                  <td>
                    {d.labelOccluded ? (
                      <span className={styles.statusOccluded}>Occluded (0%)</span>
                    ) : d.labelDisplaced ? (
                      <span className={styles.statusActive}>Displaced (Leader)</span>
                    ) : (
                      'Normal'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Canvas camera={{ position: cam.position, up: cam.up, fov: cam.fov }}>
        <ThemeTokenBridge />
        <OrbitControls makeDefault target={[0, 0, 0]} enableDamping dampingFactor={0.05} />
        <CartographicInstrument frame={SYSTEM_FRAME} showPlanarGrid showFins={false} />
        <SpatialEntityProvider>
          <OcclusionPass />
          <DiagnosticMonitor onUpdate={setDiagnostics} />
          {activeSystems.map((s) => {
            const state: CelestialInteractionState =
              selectedId === s.id ? 'focused' : 'active';
            return (
              <CelestialEntity
                key={s.id}
                id={s.id}
                name={s.name}
                position={s.position}
                classification={s.classification}
                state={state}
                spectralType={s.spectralType}
                multiplicity={s.multiplicity}
                debugHitarea={debugHitarea}
                showStalk={state === 'focused'}
                onClick={(id) => setSelectedId((prev) => (prev === id ? null : id))}
              />
            );
          })}
        </SpatialEntityProvider>
      </Canvas>
    </div>
  );
};

export const ClusteringAndCollision: Story = {
  name: '6. Taxonomic Clustering & Decluttering Test Bench',
  render: () => <ClusteringAndCollisionDemo />,
};
