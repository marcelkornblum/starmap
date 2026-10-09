import type { Meta, StoryObj } from '@storybook/react-vite';
import { StoryCanvas } from '../StoryCanvas';
import { RangeRings } from './RangeRings';
import { SpatialFrameProvider, GALACTIC_FRAME } from './index';

const meta: Meta<typeof RangeRings> = {
  title: 'CANVAS/Instrument',
  component: RangeRings,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof RangeRings>;

export const RangeRingsStory: Story = {
  name: 'RangeRings',
  render: (args) => (
    <StoryCanvas
      title="RangeRings"
      description="Zoom-adaptive concentric range rings with dynamic major/minor subdivision weighting centered on the focal point."
      frame={GALACTIC_FRAME}
      cameraDistance={32}
    >
      <SpatialFrameProvider frame={GALACTIC_FRAME}>
        <RangeRings {...args} />
      </SpatialFrameProvider>
    </StoryCanvas>
  ),
};
