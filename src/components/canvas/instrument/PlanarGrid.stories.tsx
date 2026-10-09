import type { Meta, StoryObj } from '@storybook/react-vite';
import { StoryCanvas } from '../StoryCanvas';
import { PlanarGrid } from './PlanarGrid';
import { SpatialFrameProvider, GALACTIC_FRAME } from './index';

const meta: Meta<typeof PlanarGrid> = {
  title: 'CANVAS/Instrument',
  component: PlanarGrid,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof PlanarGrid>;

export const PlanarGridStory: Story = {
  name: 'PlanarGrid',
  render: (args) => (
    <StoryCanvas
      title="PlanarGrid"
      description="Fundamental datum plane instrument displaying concentric range rings, feathering fill shader, and cartographic grid."
      frame={GALACTIC_FRAME}
      cameraDistance={32}
    >
      <SpatialFrameProvider frame={GALACTIC_FRAME}>
        <PlanarGrid showPlanarGrid showFill {...args} />
      </SpatialFrameProvider>
    </StoryCanvas>
  ),
};
