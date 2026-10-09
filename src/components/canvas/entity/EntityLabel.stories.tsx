import type { Meta, StoryObj } from '@storybook/react-vite';
import { StoryCanvas } from '../../../../.storybook/helpers/StoryCanvas';
import { EntityLabel } from './EntityLabel';
import { SpatialEntityProvider } from './SpatialEntityContext';
import { SpatialFrameProvider, SYSTEM_FRAME } from '../instrument';

const meta: Meta<typeof EntityLabel> = {
  title: 'CANVAS/Entities',
  component: EntityLabel,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof EntityLabel>;

export const EntityLabelStory: Story = {
  name: 'EntityLabel',
  args: {
    id: 'label-demo',
    name: 'Sol Primary',
    position: [0, 0, 0],
    spectralType: 'G2V',
    state: 'selected',
  },
  render: (args) => (
    <StoryCanvas
      title="EntityLabel"
      description="Layer 3 typographic overlay rendering designation, spectral classification tag, and leader lines anchored to the reticle facet."
      frame={SYSTEM_FRAME}
      cameraDistance={18}
    >
      <SpatialFrameProvider frame={SYSTEM_FRAME}>
        <SpatialEntityProvider>
          <EntityLabel {...args} />
        </SpatialEntityProvider>
      </SpatialFrameProvider>
    </StoryCanvas>
  ),
};
