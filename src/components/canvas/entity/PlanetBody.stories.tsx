import type { Meta, StoryObj } from '@storybook/react-vite';
import { StoryCanvas } from '../StoryCanvas';
import { PlanetBody, type PlanetBodyProps } from './PlanetBody';
import { SpatialFrameProvider, PLANETARY_FRAME } from '../instrument';

const meta: Meta<PlanetBodyProps> = {
  title: 'CANVAS/Entities',
  component: PlanetBody,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    classification: {
      control: 'select',
      options: ['terrestrial', 'gas-giant', 'ice-giant', 'brown-dwarf', 'star'],
      description: 'Cartographic celestial classification driving surface procedural textures and colors',
    },
    radius: {
      control: { type: 'range', min: 0.5, max: 5.0, step: 0.1 },
      description: 'Physical cartographic radius of the planetary sphere',
    },
    hasAtmosphere: {
      control: 'boolean',
      description: 'Whether to render atmospheric haze layer',
    },
    atmosphereColor: {
      control: 'color',
      description: 'Custom override for atmospheric limb color',
    },
    minPixelSize: {
      control: { type: 'range', min: 4, max: 40, step: 2 },
      description: 'Screen pixel diameter threshold below which the body smoothly fades out',
    },
  },
};

export default meta;
type Story = StoryObj<PlanetBodyProps>;

export const PlanetBodyStory: Story = {
  name: 'PlanetBody',
  args: {
    name: 'Earth',
    classification: 'terrestrial',
    radius: 2.0,
    hasAtmosphere: true,
    minPixelSize: 14,
  },
  render: (args) => (
    <StoryCanvas
      title="PlanetBody"
      description="Physical cartographic planetary body with procedural classification texture, atmospheric limb haze, and smooth distance cross-fade."
      frame={PLANETARY_FRAME}
      cameraDistance={7}
    >
      <SpatialFrameProvider frame={PLANETARY_FRAME}>
        <PlanetBody {...args} />
      </SpatialFrameProvider>
    </StoryCanvas>
  ),
};
