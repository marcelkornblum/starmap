import type { Meta, StoryObj } from '@storybook/react-vite';
import { StoryCanvas } from '../StoryCanvas';
import { CameraRig } from './CameraRig';
import { SpatialFrameProvider, GALACTIC_FRAME, PlanarGrid } from './index';

const meta: Meta<typeof CameraRig> = {
  title: 'CANVAS/Instrument',
  component: CameraRig,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof CameraRig>;

export const CameraRigStory: Story = {
  name: 'CameraRig',
  render: (args) => (
    <StoryCanvas
      title="CameraRig"
      description="Manages camera adaptive projection, synchronising perspective FOV and distance thresholds with reference frame constraints."
      frame={GALACTIC_FRAME}
      cameraDistance={32}
    >
      <SpatialFrameProvider frame={GALACTIC_FRAME}>
        <CameraRig {...args} />
        <PlanarGrid showPlanarGrid />
      </SpatialFrameProvider>
    </StoryCanvas>
  ),
};
