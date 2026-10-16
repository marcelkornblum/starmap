import type { Meta, StoryObj } from '@storybook/react-vite';
import { StoryCanvas } from '../../../../.storybook/helpers/StoryCanvas';
import { CoordinateFins } from './CoordinateFins';
import { SpatialFrameProvider, GALACTIC_FRAME } from './index';

const meta: Meta<typeof CoordinateFins> = {
  title: 'CANVAS/Instrument',
  component: CoordinateFins,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof CoordinateFins>;

export const CoordinateFinsStory: Story = {
  name: 'CoordinateFins',
  render: (args) => (
    <StoryCanvas
      title="CoordinateFins"
      description="Travelling orthogonal coordinate fins projecting radial scale tick marks and logarithmic boundary arcs along principle planes."
      frame={GALACTIC_FRAME}
      cameraDistance={32}
    >
      <SpatialFrameProvider frame={GALACTIC_FRAME}>
        <CoordinateFins enabled {...args} />
      </SpatialFrameProvider>
    </StoryCanvas>
  ),
};
