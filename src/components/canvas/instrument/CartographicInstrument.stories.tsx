import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { StoryCanvas } from '../../../../.storybook/helpers/StoryCanvas';
import storyCanvasStyles from '../../../../.storybook/helpers/StoryCanvas.module.css';
import {
  CartographicInstrument,
  SpatialFrameProvider,
  CartographicLighting,
  CameraRig,
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

const SYSTEM_FOOTPRINTS = [
  { id: 'sol-primary', position: [0, 0, 0] as [number, number, number], classification: 'star' as const, multiplicity: 1 },
  { id: 'inner-terrestrial', position: [1.8, 0.9, 0] as [number, number, number], classification: 'terrestrial' as const },
  { id: 'gas-giant-outer', position: [-4.2, 2.1, 0] as [number, number, number], classification: 'gas-giant' as const },
  { id: 'kuiper-construct', position: [6.5, -3.2, 0] as [number, number, number], classification: 'construct' as const },
];

const PLANETARY_FOOTPRINTS = [
  { id: 'lunar-body', position: [1.2, 0.4, 0.1] as [number, number, number], classification: 'terrestrial' as const },
  { id: 'orbital-facility', position: [-0.8, 0.6, -0.05] as [number, number, number], classification: 'construct' as const },
];

const FullInstrumentAssemblyDemo: React.FC = () => {
  const [activeFrame, setActiveFrame] = useState<'galactic' | 'system' | 'planetary'>('galactic');
  const [showGrid, setShowGrid] = useState(true);
  const [showFins, setShowFins] = useState(true);
  const [showBearings, setShowBearings] = useState(true);
  const [showIndicators, setShowIndicators] = useState(true);

  const frameMap: Record<'galactic' | 'system' | 'planetary', ReferenceFrame> = {
    galactic: GALACTIC_FRAME,
    system: SYSTEM_FRAME,
    planetary: PLANETARY_FRAME,
  };

  const camDist = activeFrame === 'galactic' ? 32 : (activeFrame === 'system' ? 18 : 9);
  const footprints = activeFrame === 'system' ? SYSTEM_FOOTPRINTS : (activeFrame === 'planetary' ? PLANETARY_FOOTPRINTS : undefined);

  const controlsOverlay = (
    <div className={storyCanvasStyles.controlsCluster}>
      <div className={storyCanvasStyles.controlGroup}>
        <span className={storyCanvasStyles.groupLabel}>Metric Volume</span>
        <div className={storyCanvasStyles.buttonRow}>
          <button
            type="button"
            className={storyCanvasStyles.demoButton}
            data-active={activeFrame === 'galactic'}
            onClick={() => setActiveFrame('galactic')}
          >
            Galactic (50 ly)
          </button>
          <button
            type="button"
            className={storyCanvasStyles.demoButton}
            data-active={activeFrame === 'system'}
            onClick={() => setActiveFrame('system')}
          >
            System (40 AU)
          </button>
          <button
            type="button"
            className={storyCanvasStyles.demoButton}
            data-active={activeFrame === 'planetary'}
            onClick={() => setActiveFrame('planetary')}
          >
            Planetary (2M km)
          </button>
        </div>
      </div>

      <div className={storyCanvasStyles.controlGroup}>
        <span className={storyCanvasStyles.groupLabel}>Instrument Layers</span>
        <div className={storyCanvasStyles.buttonRow}>
          <button
            type="button"
            className={storyCanvasStyles.demoButton}
            data-active={showGrid}
            onClick={() => setShowGrid((v) => !v)}
          >
            Planar Grid: {showGrid ? 'ON' : 'OFF'}
          </button>
          <button
            type="button"
            className={storyCanvasStyles.demoButton}
            data-active={showFins}
            onClick={() => setShowFins((v) => !v)}
          >
            Coordinate Fins: {showFins ? 'ON' : 'OFF'}
          </button>
          <button
            type="button"
            className={storyCanvasStyles.demoButton}
            data-active={showBearings}
            onClick={() => setShowBearings((v) => !v)}
          >
            Axis Spokes: {showBearings ? 'ON' : 'OFF'}
          </button>
          <button
            type="button"
            className={storyCanvasStyles.demoButton}
            data-active={showIndicators}
            onClick={() => setShowIndicators((v) => !v)}
          >
            Edge Indicators: {showIndicators ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <StoryCanvas
      title="Full Instrument Assembly"
      description="Complete cartographic suite integrating PlanarGrid, CoordinateFins, BearingVectors, ScreenEdgeIndicators, CameraRig, and CartographicLighting with real-time metric volume switching."
      frame={frameMap[activeFrame]}
      cameraDistance={camDist}
      overlay={controlsOverlay}
    >
      <SpatialFrameProvider frame={frameMap[activeFrame]}>
        <CartographicLighting />
        <CameraRig />
        <CartographicInstrument
          showPlanarGrid={showGrid}
          showFins={showFins}
          showAxisLines={showBearings}
          showScreenEdgeIndicators={showIndicators}
          footprints={footprints}
        />
      </SpatialFrameProvider>
    </StoryCanvas>
  );
};

export const FullInstrumentAssembly: Story = {
  name: 'Full Instrument Assembly',
  render: () => <FullInstrumentAssemblyDemo />,
};
