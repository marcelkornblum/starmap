import type { Meta, StoryObj } from '@storybook/react-vite';
import { StoryCanvas } from '../StoryCanvas';
import { GALACTIC_FRAME } from '../instrument/referenceFrame';
import { GalaxyScene, type GalaxySceneProps } from './GalaxyScene';

const meta: Meta<GalaxySceneProps> = {
  title: 'CANVAS/Scenes',
  component: GalaxyScene,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<GalaxySceneProps>;

export const GalaxySceneStory: Story = {
  name: 'Galaxy Scene (Parsec Scale)',
  render: (args) => (
    <StoryCanvas
      title="Galaxy Scene"
      description="Milky Way top-level galactic cartography scene rendering candidate stellar systems mapped into the Galactic Reference Frame."
      frame={GALACTIC_FRAME}
      cameraDistance={14}
    >
      <GalaxyScene {...args} />
    </StoryCanvas>
  ),
};
