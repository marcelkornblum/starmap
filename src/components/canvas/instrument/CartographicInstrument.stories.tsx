import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { StoryCanvas } from '../StoryCanvas';
import storyCanvasStyles from '../StoryCanvas.module.css';
import {
  CartographicInstrument,
  SpatialFrameProvider,
  GALACTIC_FRAME,
  SYSTEM_FRAME,
  PLANETARY_FRAME,
  type ReferenceFrame,
} from './index';

const meta: Meta<typeof CartographicInstrument> = {
  title: 'CANVAS/Instrument',
  component: CartographicInstrument,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof CartographicInstrument>;

const InteractiveInstrumentDemo: React.FC = () => {
  const [activeFrame, setActiveFrame] = useState<'galactic' | 'system' | 'planetary'>('galactic');
  const frameMap: Record<'galactic' | 'system' | 'planetary', ReferenceFrame> = {
    galactic: GALACTIC_FRAME,
    system: SYSTEM_FRAME,
    planetary: PLANETARY_FRAME,
  };
  const camDist = activeFrame === 'galactic' ? 32 : (activeFrame === 'system' ? 18 : 9);

  return (
    <StoryCanvas
      title="CartographicInstrument"
      description="Comprehensive spatial cartography suite aggregating PlanarGrid, CoordinateFins, BearingVectors, and ScreenEdgeIndicators within an active reference frame."
      frame={frameMap[activeFrame]}
      cameraDistance={camDist}
      overlay={
        <div className={storyCanvasStyles.buttonRow}>
          <button
            type="button"
            className={storyCanvasStyles.demoButton}
            data-active={activeFrame === 'galactic'}
            onClick={() => setActiveFrame('galactic')}
          >
            Galactic
          </button>
          <button
            type="button"
            className={storyCanvasStyles.demoButton}
            data-active={activeFrame === 'system'}
            onClick={() => setActiveFrame('system')}
          >
            System
          </button>
          <button
            type="button"
            className={storyCanvasStyles.demoButton}
            data-active={activeFrame === 'planetary'}
            onClick={() => setActiveFrame('planetary')}
          >
            Planetary
          </button>
        </div>
      }
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

export const CartographicInstrumentStory: Story = {
  name: 'CartographicInstrument',
  render: () => <InteractiveInstrumentDemo />,
};
