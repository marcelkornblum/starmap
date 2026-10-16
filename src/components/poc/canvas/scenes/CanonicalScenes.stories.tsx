import type { Meta, StoryObj } from '@storybook/react-vite';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { ThemeTokenBridge } from '../ThemeTokenBridge';
import { GalaxyScene } from './GalaxyScene';
import { SystemScene } from './SystemScene';
import { PlanetScene } from './PlanetScene';
import { PlanetBody } from './PlanetBody';
import { getStandardInitialCamera } from '../cartography/cartographyMath';
import { CONTROLS_DAMPING_FACTOR } from '../engineConfig';
import styles from '../cartography/StorybookCanvasWrapper.module.css';

const meta: Meta = {
  title: 'POC/Canvas/Production Scenes/Canonical Scenes',
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj;

export const GalacticScale: Story = {
  name: '1. Galaxy Scene (Parsec Scale)',
  render: () => {
    const cam = getStandardInitialCamera(14, [0, 0, 0], 45);
    return (
      <div className={styles.canvasContainer}>
        <Canvas camera={{ position: cam.position, fov: cam.fov, up: cam.up }}>
          <ThemeTokenBridge />
          <OrbitControls makeDefault target={cam.target} enableDamping dampingFactor={CONTROLS_DAMPING_FACTOR} />
          <GalaxyScene />
        </Canvas>
      </div>
    );
  },
};

export const SystemScale: Story = {
  name: '2. System Scene (AU Scale)',
  render: () => {
    const cam = getStandardInitialCamera(8, [0, 0, 0], 45);
    return (
      <div className={styles.canvasContainer}>
        <Canvas camera={{ position: cam.position, fov: cam.fov, up: cam.up }}>
          <ThemeTokenBridge />
          <OrbitControls makeDefault target={cam.target} enableDamping dampingFactor={CONTROLS_DAMPING_FACTOR} />
          <SystemScene systemId="sol" />
        </Canvas>
      </div>
    );
  },
};

export const PlanetaryScale: Story = {
  name: '3. Planet Scene (Kilometre Scale)',
  render: () => {
    const cam = getStandardInitialCamera(6, [0, 0, 0], 45);
    return (
      <div className={styles.canvasContainer}>
        <Canvas camera={{ position: cam.position, fov: cam.fov, up: cam.up }}>
          <ThemeTokenBridge />
          <OrbitControls makeDefault target={cam.target} enableDamping dampingFactor={CONTROLS_DAMPING_FACTOR} />
          <PlanetScene planetId="earth" planetName="Earth" classification="terrestrial" />
        </Canvas>
      </div>
    );
  },
};

export const PlanetBodyManifest: Story = {
  name: '4. PlanetBody Surface Manifest (Uniform Lighting)',
  render: () => {
    const cam = getStandardInitialCamera(12, [0, 0, 0], 45);
    return (
      <div className={styles.canvasContainer}>
        <Canvas camera={{ position: cam.position, fov: cam.fov, up: cam.up }}>
          <ThemeTokenBridge />
          <OrbitControls makeDefault target={cam.target} enableDamping dampingFactor={CONTROLS_DAMPING_FACTOR} />

          {/* Terrestrial (Earth-like) */}
          <group position={[-6, 0, 0]}>
            <PlanetBody name="Terrestrial" classification="terrestrial" radius={1.8} />
          </group>

          {/* Gas Giant (Jupiter-like) */}
          <group position={[-1.5, 0, 0]}>
            <PlanetBody name="Gas Giant" classification="gas-giant" radius={2.2} />
          </group>

          {/* Ice Giant (Neptune-like) */}
          <group position={[3.2, 0, 0]}>
            <PlanetBody name="Ice Giant" classification="ice-giant" radius={1.9} />
          </group>

          {/* Brown Dwarf */}
          <group position={[7.5, 0, 0]}>
            <PlanetBody name="Sub-stellar" classification="brown-dwarf" radius={1.5} hasAtmosphere={false} />
          </group>
        </Canvas>
      </div>
    );
  },
};
