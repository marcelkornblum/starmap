import type { Meta, StoryObj } from '@storybook/react-vite';
import { StoryCanvas } from '../StoryCanvas';
import { ScreenEdgeCue } from './ScreenEdgeCue';
import { SpatialFrameProvider, GALACTIC_FRAME } from './index';

const meta: Meta<typeof ScreenEdgeCue> = {
  title: 'CANVAS/Instrument',
  component: ScreenEdgeCue,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof ScreenEdgeCue>;

export const ScreenEdgeCueStory: Story = {
  name: 'ScreenEdgeCue',
  args: {
    bearing: GALACTIC_FRAME.bearings[0],
    extent: 2000,
  },
  render: (args) => (
    <StoryCanvas
      title="ScreenEdgeCue"
      description="HUD indicator pinned to the viewport boundary indicating bearing vector direction when vectors extend beyond the field of view."
      frame={GALACTIC_FRAME}
      cameraDistance={32}
    >
      <SpatialFrameProvider frame={GALACTIC_FRAME}>
        <ScreenEdgeCue {...args} />
      </SpatialFrameProvider>
    </StoryCanvas>
  ),
};
