import type { Meta, StoryObj } from '@storybook/react-vite';
import { StoryCanvas } from '../StoryCanvas';
import { SafeHtml } from '../SafeHtml';
import storyCanvasStyles from '../StoryCanvas.module.css';
import {
  SpatialFrameProvider,
  useSpatialFrame,
  GALACTIC_FRAME,
  PlanarGrid,
} from './index';

const DiagnosticsDisplay: React.FC = () => {
  const { frame } = useSpatialFrame();
  return (
    <SafeHtml>
      <div className={storyCanvasStyles.storyBanner}>
        <h2 className={storyCanvasStyles.storyTitle}>SpatialFrameProvider</h2>
        <p className={storyCanvasStyles.storyDescription}>
          Establishes single-source spatial metrics, aperture radius, screen scale, and plane alignment across all canvas children.
        </p>
        <div className={storyCanvasStyles.diagnosticsGrid}>
          <div>Active Frame: {frame.name} ({frame.unit})</div>
          <div>Footprint Radius: {frame.radius} {frame.unit}</div>
          <div>Camera Base FOV: {frame.camera.baseFov}°</div>
          <div>Camera Distance Range: {frame.camera.minDistance} – {frame.camera.maxDistance} {frame.unit}</div>
        </div>
      </div>
    </SafeHtml>
  );
};

const meta: Meta<typeof SpatialFrameProvider> = {
  title: 'CANVAS/Instrument',
  component: SpatialFrameProvider,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof SpatialFrameProvider>;

export const SpatialFrameProviderStory: Story = {
  name: 'SpatialFrameProvider',
  render: (args) => (
    <StoryCanvas frame={GALACTIC_FRAME} cameraDistance={32}>
      <SpatialFrameProvider frame={GALACTIC_FRAME} {...args}>
        <PlanarGrid showPlanarGrid />
        <DiagnosticsDisplay />
      </SpatialFrameProvider>
    </StoryCanvas>
  ),
};
