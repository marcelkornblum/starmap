import type { Meta, StoryObj } from '@storybook/react-vite';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { OrbitalRing } from './OrbitalRing';
import { CartographicGrid } from './CartographicGrid';
import { CelestialNode } from './CelestialNode';
import { SceneTokenBridge, ThemeTokenBridge } from '../ThemeTokenBridge';
import styles from './StorybookCanvasWrapper.module.css';

const meta: Meta<typeof OrbitalRing> = {
  title: 'Canvas/Cartography/OrbitalRing',
  component: OrbitalRing,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <div className={styles.viewportContainer}>
        <ThemeTokenBridge />
        <Canvas camera={{ position: [0, 6, 8], fov: 45 }} gl={{ antialias: true, alpha: true }}>
          <SceneTokenBridge />
          <CartographicGrid radius={5} rangeRings={[1, 2.5, 5]} showFins={false} />
          <CelestialNode id="host" name="Sol" position={[0, 0, 0]} state="active" spectralType="G2V" />
          <Story />
          <OrbitControls makeDefault enableDamping dampingFactor={0.05} />
        </Canvas>
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof OrbitalRing>;

export const Default: Story = {
  args: {
    semiMajorAxis: 3.0,
    eccentricity: 0.2,
    inclination: 25,
    ascendingNode: 45,
    argumentOfPeriapsis: 60,
    isFocused: false,
    showPeriapsisTick: true,
  },
};

