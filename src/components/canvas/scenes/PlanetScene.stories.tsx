import type { Meta, StoryObj } from '@storybook/react-vite';
import { StoryCanvas } from '../../../../.storybook/helpers/StoryCanvas';
import { PLANETARY_FRAME } from '../instrument/referenceFrame';
import { PlanetScene, type PlanetSceneProps } from './PlanetScene';

const meta: Meta<PlanetSceneProps> = {
  title: 'CANVAS/Scenes',
  component: PlanetScene,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<PlanetSceneProps>;

export const PlanetSceneStory: Story = {
  name: 'Planet Scene (Kilometre Scale)',
  args: {
    planetId: 'earth',
    planetName: 'Earth',
    classification: 'terrestrial',
  },
  render: (args) => (
    <StoryCanvas
      title="Planet Scene"
      description="Planetary inspection scene featuring uniform-lit physical PlanetBody and natural satellites within the Planetary Reference Frame."
      frame={PLANETARY_FRAME}
      cameraDistance={6}
    >
      <PlanetScene {...args} />
    </StoryCanvas>
  ),
};
