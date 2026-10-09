import type { Meta, StoryObj } from '@storybook/react-vite';
import { StoryCanvas } from '../../../../.storybook/helpers/StoryCanvas';
import { BodyMarker } from './BodyMarker';
import { SpatialEntityProvider } from './SpatialEntityContext';
import { SpatialFrameProvider, GALACTIC_FRAME } from '../instrument';

const meta: Meta<typeof BodyMarker> = {
  title: 'CANVAS/Entities',
  component: BodyMarker,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof BodyMarker>;

export const BodyMarkerStory: Story = {
  name: 'BodyMarker',
  args: {
    id: 'body-marker-demo',
    position: [0, 0, 0],
    pixelSize: 6,
    interactive: true,
  },
  render: (args) => (
    <StoryCanvas
      title="BodyMarker"
      description="Layer 1 physical system node rendered at strictly screen-invariant pixel size with camera-facing pointer hit area."
      frame={GALACTIC_FRAME}
      cameraDistance={32}
    >
      <SpatialFrameProvider frame={GALACTIC_FRAME}>
        <SpatialEntityProvider>
          <BodyMarker {...args} />
        </SpatialEntityProvider>
      </SpatialFrameProvider>
    </StoryCanvas>
  ),
};
