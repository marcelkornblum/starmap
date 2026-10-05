import type { Meta, StoryObj } from '@storybook/react-vite';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { SpatialViewport, type SpatialViewportProps } from './SpatialViewport';
import { GALACTIC_FRAME, SYSTEM_FRAME, PLANETARY_FRAME } from './instrument/referenceFrame';
import { PlanetBody } from './scenes/PlanetBody';
import { ThemeTokenBridge } from './ThemeTokenBridge';
import { getStandardInitialCamera } from './cartography/cartographyMath';
import type { SpatialEntityDefinition } from './entity/SpatialEntityStore';
import styles from './cartography/StorybookCanvasWrapper.module.css';

const SAMPLE_ENTITIES: SpatialEntityDefinition[] = [
  {
    id: 'sol',
    name: 'Sol',
    classification: 'star',
    position: [0, 0, 0],
    spectralType: 'G2V',
    multiplicity: 1,
    state: 'active',
  },
  {
    id: 'prox-cen',
    name: 'Proxima Centauri',
    classification: 'star',
    position: [1.34, 0.45, -0.62],
    spectralType: 'M5.5V',
    multiplicity: 1,
    state: 'selected',
  },
  {
    id: 'sirius',
    name: 'Sirius',
    classification: 'star',
    position: [-1.61, -2.13, -0.55],
    spectralType: 'A1V',
    multiplicity: 2,
    state: 'passive',
  },
];

const meta: Meta<SpatialViewportProps> = {
  title: 'Canvas/Production Scenes/Spatial Viewport',
  component: SpatialViewport,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    mode: {
      control: 'select',
      options: ['explore', 'focus', 'route', 'filter'],
      description: 'Interaction tier mode influencing instrument prominence',
    },
    showInstrument: {
      control: 'boolean',
      description: 'Toggle cartographic instrument grid and coordinate fins',
    },
    debugHitarea: {
      control: 'boolean',
      description: 'Show debug wireframes for entity click/hover hitareas',
    },
  },
};

export default meta;
type Story = StoryObj<SpatialViewportProps>;

export const GalacticViewport: Story = {
  name: '1. Galactic Scale Viewport',
  args: {
    frame: GALACTIC_FRAME,
    entities: SAMPLE_ENTITIES,
    mode: 'explore',
    showInstrument: true,
    debugHitarea: false,
  },
  render: (args) => {
    const cam = getStandardInitialCamera(14, [0, 0, 0], 45);
    return (
      <div className={styles.canvasContainer}>
        <Canvas camera={{ position: cam.position, fov: cam.fov, up: cam.up }}>
          <ThemeTokenBridge />
          <OrbitControls makeDefault target={cam.target} enableDamping />
          <SpatialViewport {...args} />
        </Canvas>
      </div>
    );
  },
};

export const SystemViewportWithOrbits: Story = {
  name: '2. System Scale Viewport with Orbits',
  args: {
    frame: SYSTEM_FRAME,
    mode: 'focus',
    showInstrument: true,
    debugHitarea: false,
    entities: [
      {
        id: 'primary-star',
        name: 'Sol',
        classification: 'star',
        position: [0, 0, 0],
        spectralType: 'G2V',
        state: 'active',
      },
      {
        id: 'terrestrial-1',
        name: 'Earth',
        classification: 'terrestrial',
        position: [1.0, 0, 0],
        state: 'selected',
        orbit: {
          semiMajorAxis: 1.0,
          eccentricity: 0.0167,
          period: 365,
        },
      },
      {
        id: 'gas-giant-1',
        name: 'Jupiter',
        classification: 'gas-giant',
        position: [2.5, 0, 0],
        state: 'passive',
        orbit: {
          semiMajorAxis: 2.5,
          eccentricity: 0.048,
          period: 4332,
        },
      },
    ],
  },
  render: (args) => {
    const cam = getStandardInitialCamera(8, [0, 0, 0], 45);
    return (
      <div className={styles.canvasContainer}>
        <Canvas camera={{ position: cam.position, fov: cam.fov, up: cam.up }}>
          <ThemeTokenBridge />
          <OrbitControls makeDefault target={cam.target} enableDamping />
          <SpatialViewport {...args} />
        </Canvas>
      </div>
    );
  },
};

export const PlanetaryViewportWithBespokeBody: Story = {
  name: '3. Planetary Viewport with Bespoke PlanetBody',
  args: {
    frame: PLANETARY_FRAME,
    mode: 'focus',
    showInstrument: true,
    entities: [
      {
        id: 'luna',
        name: 'Luna',
        classification: 'terrestrial',
        position: [3.8, 0, 0],
        state: 'active',
        orbit: {
          semiMajorAxis: 3.84,
          period: 27.3,
        },
      },
    ],
  },
  render: (args) => {
    const cam = getStandardInitialCamera(6, [0, 0, 0], 45);
    return (
      <div className={styles.canvasContainer}>
        <Canvas camera={{ position: cam.position, fov: cam.fov, up: cam.up }}>
          <ThemeTokenBridge />
          <OrbitControls makeDefault target={cam.target} enableDamping />
          <SpatialViewport {...args}>
            <PlanetBody name="Earth" classification="terrestrial" radius={1.8} />
          </SpatialViewport>
        </Canvas>
      </div>
    );
  },
};
