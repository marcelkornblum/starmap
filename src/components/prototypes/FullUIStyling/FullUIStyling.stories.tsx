import type { Meta, StoryObj } from '@storybook/react-vite';
import { FullUIStylingScene } from './FullUIStyling';

const meta: Meta<typeof FullUIStylingScene> = {
  title: 'PROTOTYPES/Full UI',
  component: FullUIStylingScene,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Comprehensive interface integration prototype assembling the entire 8-tier surface hierarchy, spatial 3D WebGL background, HUD overlays, control dock, star dossier, telemetry sheets, drawers, modals, and toasts into a single cohesive cockpit.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof FullUIStylingScene>;

export const Default: Story = {
  name: 'Full UI Cockpit Prototype',
  render: () => <FullUIStylingScene />,
};
