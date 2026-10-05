import type { Meta, StoryObj } from '@storybook/react-vite';
import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { OrbitalRing } from './OrbitalRing';
import { CartographicGrid } from './CartographicGrid';
import { CelestialNode } from './CelestialNode';
import { getStandardInitialCamera } from './cartographyMath';
import { SceneTokenBridge, ThemeTokenBridge } from '../ThemeTokenBridge';
import { rotateToOrbitalPlane } from '../../../utils/astroMath';
import styles from './StorybookCanvasWrapper.module.css';

const standardCam = getStandardInitialCamera(12, [0, 0, 0]);

const meta: Meta<typeof OrbitalRing> = {
  title: 'Canvas/Legacy (Deprecated)/OrbitalRing',
  component: OrbitalRing,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <div className={styles.viewportContainer}>
        <ThemeTokenBridge />
        <Canvas
          camera={{
            position: standardCam.position,
            up: standardCam.up,
            fov: standardCam.fov,
          }}
          gl={{ antialias: true, alpha: true }}
        >
          <SceneTokenBridge />
          <CartographicGrid radius={5} rangeRings={[1, 2.5, 5]} showFins={false} />
          <CelestialNode id="host" name="Sol" position={[0, 0, 0]} state="active" spectralType="G2V" />
          <Story />
          <OrbitControls makeDefault target={standardCam.target} enableDamping dampingFactor={0.05} />
        </Canvas>
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof OrbitalRing>;

const InteractiveOrbitStory: React.FC<React.ComponentProps<typeof OrbitalRing>> = (args) => {
  const planetPos = useMemo(() => {
    const a = args.semiMajorAxis ?? 3.0;
    const e = args.eccentricity ?? 0.2;
    const inc = args.inclination ?? 25;
    const node = args.ascendingNode ?? 45;
    const peri = args.argumentOfPeriapsis ?? 60;
    const r = a * (1 - e);
    const phi = (peri * Math.PI) / 180;
    const buf = new Float32Array([r * Math.cos(phi), r * Math.sin(phi), 0]);
    rotateToOrbitalPlane(buf, inc, node, { degrees: true });
    return [buf[0], buf[1], buf[2]] as [number, number, number];
  }, [
    args.semiMajorAxis,
    args.eccentricity,
    args.inclination,
    args.ascendingNode,
    args.argumentOfPeriapsis,
  ]);

  return (
    <>
      <OrbitalRing {...args} bodyId="planet-1" />
      <CelestialNode
        id="planet-1"
        name="Planet b"
        position={planetPos}
        classification="terrestrial"
        reticleSize={0.35}
      />
    </>
  );
};

export const Default: Story = {
  args: {
    semiMajorAxis: 3.0,
    eccentricity: 0.2,
    inclination: 25,
    ascendingNode: 45,
    argumentOfPeriapsis: 60,
    isFocused: false,
    showPeriapsisTick: true,
    showDirectionIndicator: true,
  },
  render: (args) => <InteractiveOrbitStory {...args} />,
};

export const Focused: Story = {
  args: {
    ...Default.args,
    isFocused: true,
  },
  render: (args) => <InteractiveOrbitStory {...args} />,
};

