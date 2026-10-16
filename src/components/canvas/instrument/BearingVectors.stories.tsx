import type { Meta, StoryObj } from '@storybook/react-vite';
import { StoryCanvas } from '../../../../.storybook/helpers/StoryCanvas';
import { BearingVectors } from './BearingVectors';
import { SpatialFrameProvider, GALACTIC_FRAME } from './index';

const meta: Meta<typeof BearingVectors> = {
  title: 'CANVAS/Instrument',
  component: BearingVectors,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof BearingVectors>;

export const BearingVectorsStory: Story = {
  name: 'BearingVectors',
  render: (args) => (
    <StoryCanvas
      title="BearingVectors"
      description="Renders spatial axis spokes and cardinal bearing guides (Core and Orbital direction vectors) projected into the scene."
      frame={GALACTIC_FRAME}
      cameraDistance={32}
    >
      <SpatialFrameProvider frame={GALACTIC_FRAME}>
        <BearingVectors {...args} />
      </SpatialFrameProvider>
    </StoryCanvas>
  ),
};
