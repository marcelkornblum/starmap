import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import {
  CartographicInstrument,
  GALACTIC_FRAME,
  SYSTEM_FRAME,
  PLANETARY_FRAME,
  type ReferenceFrame,
} from './index';
import { getStandardInitialCamera } from '../cartography/cartographyMath';
import { ThemeTokenBridge } from '../ThemeTokenBridge';
import styles from '../cartography/StorybookCanvasWrapper.module.css';

const meta: Meta<typeof CartographicInstrument> = {
  title: 'Canvas/Cartographic Instrument/Cartographic Instrument',
  component: CartographicInstrument,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof CartographicInstrument>;

export const GalacticFrame: Story = {
  name: '1. Galactic Reference Frame (Parsec Scale)',
  render: () => {
    const cam = getStandardInitialCamera(32, [0, 0, 0], 45);
    return (
      <div className={styles.canvasContainer}>
        <Canvas
          camera={{ position: cam.position, up: cam.up, fov: cam.fov, near: 0.1, far: 2000 }}
          gl={{ antialias: true }}
        >
          <ThemeTokenBridge />
          <OrbitControls makeDefault target={[0, 0, 0]} enableDamping dampingFactor={0.05} />
          <CartographicInstrument
            frame={GALACTIC_FRAME}
            showPlanarGrid
            showFins
            showAxisLines
            showScreenEdgeIndicators
          />
        </Canvas>
      </div>
    );
  },
};

export const SystemFrame: Story = {
  name: '2. System Reference Frame (AU Scale)',
  render: () => {
    // Stellar system frame: circular planar grid centered on barycentric centre (radius 6 AU, smaller than Galactic 10 pc)
    const cam = getStandardInitialCamera(18, [0, 0, 0], 40);
    return (
      <div className={styles.canvasContainer}>
        <Canvas
          camera={{ position: cam.position, up: cam.up, fov: cam.fov, near: 0.1, far: 1000 }}
          gl={{ antialias: true }}
        >
          <ThemeTokenBridge />
          <OrbitControls makeDefault target={[0, 0, 0]} enableDamping dampingFactor={0.05} />
          <CartographicInstrument
            frame={SYSTEM_FRAME}
            showPlanarGrid
            showFins
            showAxisLines
            showScreenEdgeIndicators
            footprints={[
              { id: 'primary-star-a', position: [1.8, 0.6, 0], classification: 'star', multiplicity: 2 },
              { id: 'companion-star-b', position: [-1.8, -0.6, 0], classification: 'star' },
              { id: 'inner-terrestrial', position: [0.4, 3.2, 0], classification: 'terrestrial' },
              { id: 'gas-giant-outer', position: [-3.8, 2.4, 0], classification: 'gas-giant' },
            ]}
          />
        </Canvas>
      </div>
    );
  },
};

export const PlanetaryFrame: Story = {
  name: '3. Planetary Reference Frame (Kilometre Scale)',
  render: () => {
    // Planetary frame: circular planar grid centered on the planet itself (radius 3 km, smaller still)
    const cam = getStandardInitialCamera(9, [0, 0, 0], 40);
    return (
      <div className={styles.canvasContainer}>
        <Canvas
          camera={{ position: cam.position, up: cam.up, fov: cam.fov, near: 0.01, far: 500 }}
          gl={{ antialias: true }}
        >
          <ThemeTokenBridge />
          <OrbitControls makeDefault target={[0, 0, 0]} enableDamping dampingFactor={0.05} />
          <CartographicInstrument
            frame={PLANETARY_FRAME}
            showPlanarGrid
            showFins
            showAxisLines
            showScreenEdgeIndicators
            footprintClassification="terrestrial"
            footprints={[
              { id: 'major-moon', position: [1.2, 0.5, 0.1], classification: 'terrestrial' },
              { id: 'orbital-facility', position: [-0.9, 0.8, -0.05], classification: 'construct' },
            ]}
          />
        </Canvas>
      </div>
    );
  },
};

const InteractiveFrameSwitcherDemo: React.FC = () => {
  const [activeFrame, setActiveFrame] = useState<'galactic' | 'system' | 'planetary'>('galactic');
  const frameMap: Record<'galactic' | 'system' | 'planetary', ReferenceFrame> = {
    galactic: GALACTIC_FRAME,
    system: SYSTEM_FRAME,
    planetary: PLANETARY_FRAME,
  };
  const camDist = activeFrame === 'galactic' ? 32 : (activeFrame === 'system' ? 18 : 9);
  const cam = getStandardInitialCamera(camDist, [0, 0, 0], 45);

  return (
    <div className={styles.canvasContainer}>
      <div className={styles.demoOverlay}>
        <span><strong>Select Metric Volume:</strong></span>
        <div className={styles.buttonRow}>
          <button
            type="button"
            className={styles.demoButton}
            data-active={activeFrame === 'galactic'}
            onClick={() => setActiveFrame('galactic')}
          >
            Galactic (50 ly)
          </button>
          <button
            type="button"
            className={styles.demoButton}
            data-active={activeFrame === 'system'}
            onClick={() => setActiveFrame('system')}
          >
            System (40 AU)
          </button>
          <button
            type="button"
            className={styles.demoButton}
            data-active={activeFrame === 'planetary'}
            onClick={() => setActiveFrame('planetary')}
          >
            Planetary (2M km)
          </button>
        </div>
      </div>

      <Canvas
        camera={{ position: cam.position, up: cam.up, fov: cam.fov, near: 0.05, far: 2000 }}
        gl={{ antialias: true }}
      >
        <ThemeTokenBridge />
        <OrbitControls makeDefault target={[0, 0, 0]} enableDamping dampingFactor={0.05} />
        <CartographicInstrument
          frame={frameMap[activeFrame]}
          showPlanarGrid
          showFins
          showAxisLines
          showScreenEdgeIndicators
        />
      </Canvas>
    </div>
  );
};

export const InteractiveFrameSwitcher: Story = {
  render: () => <InteractiveFrameSwitcherDemo />,
};
