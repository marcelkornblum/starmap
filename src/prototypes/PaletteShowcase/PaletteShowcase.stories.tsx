import type { Meta, StoryObj } from '@storybook/react-vite';
import { PaletteShowcaseScene } from './PaletteShowcase';

const meta: Meta<typeof PaletteShowcaseScene> = {
  title: 'PROTOTYPES/Colour Palette',
  component: PaletteShowcaseScene,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Comprehensive colour system and spectral palette showcase. Displays scientific luminance ramps, OKLCH swatches, telemetry status indicators, and interactive surface elevations across Celestial, Spectral, Viridis, Cygnus, and Kepler themes.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof PaletteShowcaseScene>;

export const Default: Story = {
  name: 'Colour Palette Showcase',
  render: () => <PaletteShowcaseScene />,
};
