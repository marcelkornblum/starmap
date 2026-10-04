import type { Meta, StoryObj } from '@storybook/react-vite';
import { ThemeTokenBridge } from '../ThemeTokenBridge';
import {
  GalacticViewScene,
  SystemViewScene,
  PlanetaryViewScene,
  InteractiveNavigator,
} from './SpatialScenes';
import { FullUIStylingScene } from './FullUIStylingScene';

// Re-export scene components and fixtures so any Storybook users can import them cleanly
export * from './SpatialScenes';
export { FullUIStylingScene } from './FullUIStylingScene';

const meta: Meta = {
  title: 'Canvas/Scenes/SpatialScenes',
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <div>
        <ThemeTokenBridge />
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const GalacticView: Story = {
  name: '1. Galactic View (Parsec Scale)',
  render: () => <GalacticViewScene />,
};

export const SystemView: Story = {
  name: '2. System View (AU Scale)',
  render: () => <SystemViewScene />,
};

export const PlanetaryView: Story = {
  name: '3. Planetary View (Kilometre Scale)',
  render: () => <PlanetaryViewScene />,
};

export const CrossScaleNavigator: Story = {
  name: '4. Interactive Multi-Scale Navigator',
  render: () => <InteractiveNavigator />,
};

export const FullUIStyling: Story = {
  name: '5. Full UI Styling (8 Surface Tiers & Content Types)',
  parameters: {
    layout: 'fullscreen',
  },
  render: () => <FullUIStylingScene />,
};
