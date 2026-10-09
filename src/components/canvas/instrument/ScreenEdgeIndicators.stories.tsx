import type { Meta, StoryObj } from '@storybook/react-vite';
import { StoryCanvas } from '../StoryCanvas';
import { ScreenEdgeIndicators } from './ScreenEdgeIndicators';
import { SpatialFrameProvider, GALACTIC_FRAME } from './index';

const meta: Meta<typeof ScreenEdgeIndicators> = {
  title: 'CANVAS/Instrument',
  component: ScreenEdgeIndicators,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof ScreenEdgeIndicators>;

export const ScreenEdgeIndicatorsStory: Story = {
  name: 'ScreenEdgeIndicators',
  render: (args) => (
    <StoryCanvas
      title="ScreenEdgeIndicators"
      description="Aggregates screen edge cues for all bearings defined in the active frame with automatic viewport boundary tracking."
      frame={GALACTIC_FRAME}
      cameraDistance={32}
    >
      <SpatialFrameProvider frame={GALACTIC_FRAME}>
        <ScreenEdgeIndicators showCore showOrbital {...args} />
      </SpatialFrameProvider>
    </StoryCanvas>
  ),
};
