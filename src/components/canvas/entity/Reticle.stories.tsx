import type { Meta, StoryObj } from '@storybook/react-vite';
import { StoryCanvas } from '../StoryCanvas';
import { Reticle } from './Reticle';
import { SpatialEntityProvider } from './SpatialEntityContext';
import { SpatialFrameProvider, SYSTEM_FRAME } from '../instrument';

const meta: Meta<typeof Reticle> = {
  title: 'CANVAS/Entities',
  component: Reticle,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof Reticle>;

export const ReticleStory: Story = {
  name: 'Reticle',
  args: {
    id: 'reticle-demo',
    position: [0, 0, 0],
    classification: 'star',
    state: 'selected',
    multiplicity: 2,
    spectralType: 'G2V',
  },
  render: (args) => (
    <StoryCanvas
      title="Reticle"
      description="Layer 2 tactical geometric reticle with universal taxonomic frame brackets, multiplicity pips, and facet annotations."
      frame={SYSTEM_FRAME}
      cameraDistance={18}
    >
      <SpatialFrameProvider frame={SYSTEM_FRAME}>
        <SpatialEntityProvider>
          <Reticle {...args} />
        </SpatialEntityProvider>
      </SpatialFrameProvider>
    </StoryCanvas>
  ),
};
