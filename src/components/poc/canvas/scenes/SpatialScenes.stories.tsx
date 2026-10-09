import type { Meta, StoryObj } from '@storybook/react-vite';
import { ThemeTokenBridge } from '../ThemeTokenBridge';
import {
  GalacticViewScene,
  SystemViewScene,
  PlanetaryViewScene,
  InteractiveNavigator,
} from './SpatialScenes';
import { FullUIStylingScene } from './FullUIStylingScene';
import { PaletteShowcaseScene } from './PaletteShowcaseScene';

// Re-export scene components and fixtures so any Storybook users can import them cleanly
export * from './SpatialScenes';
export { FullUIStylingScene } from './FullUIStylingScene';
export { PaletteShowcaseScene } from './PaletteShowcaseScene';

const meta: Meta = {
  title: 'POC/Canvas/Prototypes & Verification/Spatial Scenes (Multi-Scale & UI PoC)',
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

/**
 * Spatial Scene 5: Full UI Styling PoC
 * Demonstrates all 8 surface tiers, overlays, and domain controls overlaid on 3D canvas.
 * Preserved as an active PoC reference bench.
 */
export const FullUIStyling: Story = {
  name: '5. Full UI Styling (8 Surface Tiers & Content Types) [Active PoC]',
  parameters: {
    layout: 'fullscreen',
  },
  render: () => <FullUIStylingScene />,
};

/**
 * Spatial Scene 6: Palette & Data Visualisation Showcase
 * Demonstrates enriched panel hue, Electric Ion Cobalt focus state,
 * Neutral/Caution/Critical status set, and 10-step data viz gradient ramps.
 */
export const PaletteAndDataVizShowcase: Story = {
  name: '6. Color Palette & Data Viz Showcase (Active PoC)',
  parameters: {
    layout: 'fullscreen',
  },
  render: () => <PaletteShowcaseScene />,
};

