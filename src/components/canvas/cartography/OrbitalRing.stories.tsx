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

export const Circular: Story = {
  args: {
    semiMajorAxis: 2.0,
    eccentricity: 0,
    inclination: 0,
    isFocused: false,
    showPeriapsisTick: true,
  },
};

export const Eccentric: Story = {
  args: {
    semiMajorAxis: 2.5,
    eccentricity: 0.35,
    inclination: 0,
    argumentOfPeriapsis: 30,
    isFocused: false,
    showPeriapsisTick: true,
  },
};

export const InclinedAndEccentric: Story = {
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

export const FocusedHighlight: Story = {
  args: {
    semiMajorAxis: 2.0,
    eccentricity: 0.05,
    inclination: 7,
    isFocused: true,
    showPeriapsisTick: true,
  },
};

export const MultiBodySystem: Story = {
  render: () => (
    <group>
      {/* Mercury */}
      <OrbitalRing semiMajorAxis={0.8} eccentricity={0.205} inclination={7.0} ascendingNode={48} />
      {/* Venus */}
      <OrbitalRing semiMajorAxis={1.4} eccentricity={0.007} inclination={3.4} ascendingNode={76} />
      {/* Earth (Focused) */}
      <OrbitalRing semiMajorAxis={2.0} eccentricity={0.017} inclination={0} isFocused={true} />
      {/* Mars */}
      <OrbitalRing semiMajorAxis={2.8} eccentricity={0.093} inclination={1.85} ascendingNode={49} />
    </group>
  ),
};
