import type { Meta, StoryObj } from '@storybook/react-vite';
import { StoryCanvas } from '../StoryCanvas';
import { SYSTEM_FRAME } from '../instrument/referenceFrame';
import { SystemScene, type SystemSceneProps } from './SystemScene';

const meta: Meta<SystemSceneProps> = {
  title: 'CANVAS/Scenes',
  component: SystemScene,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<SystemSceneProps>;

export const SystemSceneStory: Story = {
  name: 'System Scene (AU Scale)',
  args: {
    systemId: 'sol',
  },
  render: (args) => (
    <StoryCanvas
      title="System Scene"
      description="Stellar system cartography scene displaying the central star and Keplerian planetary orbits within the System Reference Frame."
      frame={SYSTEM_FRAME}
      cameraDistance={8}
    >
      <SystemScene {...args} />
    </StoryCanvas>
  ),
};
