import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { StoryCanvas } from '../StoryCanvas';
import {
  CartographicInstrument,
  SpatialFrameProvider,
  GALACTIC_FRAME,
  SYSTEM_FRAME,
  PLANETARY_FRAME,
  type ReferenceFrame,
} from './index';
import styles from '../cartography/StorybookCanvasWrapper.module.css';

const meta: Meta<typeof CartographicInstrument> = {
  title: 'POC/Canvas/Cartographic Instrument/Cartographic Instrument',
  component: CartographicInstrument,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof CartographicInstrument>;

export const GalacticFrame: Story = {
  name: '1. Galactic Reference Frame (Parsec Scale)',
  render: () => (
    <StoryCanvas frame={GALACTIC_FRAME} cameraDistance={32}>
      <SpatialFrameProvider frame={GALACTIC_FRAME}>
        <CartographicInstrument
          showPlanarGrid
          showFins
          showAxisLines
          showScreenEdgeIndicators
        />
      </SpatialFrameProvider>
    </StoryCanvas>
  ),
};

export const SystemFrame: Story = {
  name: '2. System Reference Frame (AU Scale)',
  render: () => (
    <StoryCanvas frame={SYSTEM_FRAME} cameraDistance={18}>
      <SpatialFrameProvider frame={SYSTEM_FRAME}>
        <CartographicInstrument
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
      </SpatialFrameProvider>
    </StoryCanvas>
  ),
};

export const PlanetaryFrame: Story = {
  name: '3. Planetary Reference Frame (Kilometre Scale)',
  render: () => (
    <StoryCanvas frame={PLANETARY_FRAME} cameraDistance={9}>
      <SpatialFrameProvider frame={PLANETARY_FRAME}>
        <CartographicInstrument
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
      </SpatialFrameProvider>
    </StoryCanvas>
  ),
};

const InteractiveFrameSwitcherDemo: React.FC = () => {
  const [activeFrame, setActiveFrame] = useState<'galactic' | 'system' | 'planetary'>('galactic');
  const frameMap: Record<'galactic' | 'system' | 'planetary', ReferenceFrame> = {
    galactic: GALACTIC_FRAME,
    system: SYSTEM_FRAME,
    planetary: PLANETARY_FRAME,
  };
  const camDist = activeFrame === 'galactic' ? 32 : (activeFrame === 'system' ? 18 : 9);

  const overlay = (
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
  );

  return (
    <StoryCanvas
      frame={frameMap[activeFrame]}
      cameraDistance={camDist}
      overlay={overlay}
    >
      <SpatialFrameProvider frame={frameMap[activeFrame]}>
        <CartographicInstrument
          showPlanarGrid
          showFins
          showAxisLines
          showScreenEdgeIndicators
        />
      </SpatialFrameProvider>
    </StoryCanvas>
  );
};

export const InteractiveFrameSwitcher: Story = {
  render: () => <InteractiveFrameSwitcherDemo />,
};
