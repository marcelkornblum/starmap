import type { Meta, StoryObj } from '@storybook/react-vite';
import { StoryCanvas } from '../../../../.storybook/helpers/StoryCanvas';
import { DropStalk } from './DropStalk';
import { SpatialFrameProvider, SYSTEM_FRAME } from '../instrument';

const meta: Meta<typeof DropStalk> = {
  title: 'CANVAS/Entities',
  component: DropStalk,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof DropStalk>;

export const DropStalkStory: Story = {
  name: 'DropStalk',
  args: {
    id: 'stalk-demo',
    position: [0, 0, 4],
    state: 'selected',
    classification: 'star',
    datumZ: 0,
  },
  render: (args) => (
    <StoryCanvas
      title="DropStalk"
      description="Vertical projection stalk down to the reference datum plane (Z=0) with projected footprint ring for selected or focused entities."
      frame={SYSTEM_FRAME}
      cameraDistance={24}
    >
      <SpatialFrameProvider frame={SYSTEM_FRAME}>
        <DropStalk {...args} />
      </SpatialFrameProvider>
    </StoryCanvas>
  ),
};
