import type { Meta, StoryObj } from '@storybook/react-vite';
import { StoryCanvas } from './StoryCanvas';
import {
  SpatialFrameProvider,
  GALACTIC_FRAME,
  PlanarGrid,
} from './instrument';

const meta: Meta<typeof StoryCanvas> = {
  title: 'CANVAS/Infrastructure',
  component: StoryCanvas,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof StoryCanvas>;

export const StoryCanvasStory: Story = {
  name: 'StoryCanvas',
  render: (args) => (
    <StoryCanvas
      title="StoryCanvas"
      description="Standard Storybook canvas wrapper synchronising ThreeTokenBridge themes, OrbitControls damping, and 2D overlay layering."
      frame={GALACTIC_FRAME}
      cameraDistance={32}
      {...args}
    >
      <SpatialFrameProvider frame={GALACTIC_FRAME}>
        <PlanarGrid showPlanarGrid />
      </SpatialFrameProvider>
    </StoryCanvas>
  ),
};
