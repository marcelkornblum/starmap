import type { Meta, StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { CartographicGrid } from './cartography/CartographicGrid';
import { CelestialNode } from './cartography/CelestialNode';
import {
  CartographicInstrument,
  GALACTIC_FRAME,
} from './instrument';
import {
  CelestialEntity,
  SpatialEntityProvider,
  OcclusionPass,
} from './entity';
import { ThemeTokenBridge } from './ThemeTokenBridge';
import { getStandardInitialCamera } from './cartography/cartographyMath';
import styles from './Comparison.stories.module.css';

const meta: Meta = {
  title: 'Canvas/Prototypes & Verification/Side-by-Side Architecture Comparison',
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

const InstrumentSideBySide: React.FC = () => {
  const cam = getStandardInitialCamera(32, [0, 0, 0], 45);

  return (
    <div className={styles.container}>
      {/* Legacy CartographicGrid */}
      <div className={`${styles.pane} ${styles.paneBorder}`}>
        <div className={styles.label}>
          LEGACY: CartographicGrid (Original God Component)
        </div>
        <Canvas camera={{ position: cam.position, up: cam.up, fov: cam.fov }}>
          <ThemeTokenBridge />
          <OrbitControls makeDefault target={[0, 0, 0]} enableDamping dampingFactor={0.05} />
          <CartographicGrid radius={10} showFins showGalacticPlane showPlanarGrid />
        </Canvas>
      </div>

      {/* New CartographicInstrument */}
      <div className={styles.pane}>
        <div className={`${styles.label} ${styles.labelActive}`}>
          NEW: CartographicInstrument (Decomposed Primitives)
        </div>
        <Canvas camera={{ position: cam.position, up: cam.up, fov: cam.fov }}>
          <ThemeTokenBridge />
          <OrbitControls makeDefault target={[0, 0, 0]} enableDamping dampingFactor={0.05} />
          <CartographicInstrument frame={GALACTIC_FRAME} showPlanarGrid showFins />
        </Canvas>
      </div>
    </div>
  );
};

export const InstrumentComparison: StoryObj = {
  name: '1. Cartographic Instrument (Legacy vs Decomposed)',
  render: () => <InstrumentSideBySide />,
};

const SOL_PLANETS = [
  { id: 'mercury', name: 'Mercury', classification: 'terrestrial' as const },
  { id: 'venus', name: 'Venus', classification: 'terrestrial' as const },
  { id: 'earth', name: 'Earth', classification: 'terrestrial' as const },
  { id: 'mars', name: 'Mars', classification: 'terrestrial' as const },
  { id: 'jupiter', name: 'Jupiter', classification: 'gas-giant' as const },
  { id: 'saturn', name: 'Saturn', classification: 'gas-giant' as const },
  { id: 'uranus', name: 'Uranus', classification: 'ice-giant' as const },
  { id: 'neptune', name: 'Neptune', classification: 'ice-giant' as const },
];

const ALPHA_CENTAURI_PLANETS = [
  { id: 'proxima-b', name: 'Proxima b', classification: 'terrestrial' as const },
  { id: 'proxima-d', name: 'Proxima d', classification: 'terrestrial' as const },
];

const ALPHA_CENTAURI_VELOCITY = new THREE.Vector3(-0.4, 0.2, -0.1);

const EntitySideBySide: React.FC = () => {
  const [selectedLegacy, setSelectedLegacy] = useState('sol-legacy');
  const [selectedNew, setSelectedNew] = useState('sol-new');
  const cam = getStandardInitialCamera(16, [0, 0, 0], 45);

  return (
    <div className={styles.container}>
      {/* Legacy CelestialNode */}
      <div className={`${styles.pane} ${styles.paneBorder}`}>
        <div className={styles.label}>
          LEGACY: CelestialNode (Layer 1-3 Monolith)
        </div>
        <Canvas camera={{ position: cam.position, up: cam.up, fov: cam.fov }}>
          <ThemeTokenBridge />
          <OrbitControls makeDefault target={[0, 0, 0]} enableDamping dampingFactor={0.05} />
          <CartographicGrid radius={10} showFins={false} showGalacticPlane showPlanarGrid />
          <CelestialNode
            id="sol-legacy"
            name="Sol (Legacy)"
            position={[0, 0, 0]}
            classification="star"
            state={selectedLegacy === 'sol-legacy' ? 'focused' : 'active'}
            spectralType="G2V"
            multiplicity={1}
            planets={SOL_PLANETS}
            onClick={(id) => setSelectedLegacy((prev) => (prev === id ? '' : id))}
          />
          <CelestialNode
            id="alpha-legacy"
            name="Alpha Centauri (Legacy)"
            position={[3, 2, 2.5]}
            classification="star"
            state={selectedLegacy === 'alpha-legacy' ? 'focused' : 'active'}
            spectralType="G2V + K1V"
            multiplicity={3}
            planets={ALPHA_CENTAURI_PLANETS}
            onClick={(id) => setSelectedLegacy((prev) => (prev === id ? '' : id))}
          />
        </Canvas>
      </div>

      {/* New CelestialEntity */}
      <div className={styles.pane}>
        <div className={`${styles.label} ${styles.labelActive}`}>
          NEW: CelestialEntity (Decomposed 3-Layer Composite)
        </div>
        <Canvas camera={{ position: cam.position, up: cam.up, fov: cam.fov }}>
          <ThemeTokenBridge />
          <OrbitControls makeDefault target={[0, 0, 0]} enableDamping dampingFactor={0.05} />
          <CartographicInstrument frame={GALACTIC_FRAME} showFins={false} showPlanarGrid />
          <SpatialEntityProvider>
            <OcclusionPass />
            <CelestialEntity
              id="sol-new"
              name="Sol (Decomposed)"
              position={[0, 0, 0]}
              classification="star"
              state={selectedNew === 'sol-new' ? 'focused' : 'active'}
              spectralType="G2V"
              multiplicity={1}
              planets={SOL_PLANETS}
              onClick={(id) => setSelectedNew((prev) => (prev === id ? '' : id))}
            />
            <CelestialEntity
              id="alpha-new"
              name="Alpha Centauri (Decomposed)"
              position={[3, 2, 2.5]}
              classification="star"
              state={selectedNew === 'alpha-new' ? 'focused' : 'active'}
              spectralType="G2V + K1V"
              multiplicity={3}
              planets={ALPHA_CENTAURI_PLANETS}
              velocity={ALPHA_CENTAURI_VELOCITY}
              onClick={(id) => setSelectedNew((prev) => (prev === id ? '' : id))}
            />
          </SpatialEntityProvider>
        </Canvas>
      </div>
    </div>
  );
};

export const EntityComparison: StoryObj = {
  name: '2. Celestial Entity (Legacy vs Decomposed)',
  render: () => <EntitySideBySide />,
};
