import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card } from './Card';

const meta: Meta<typeof Card> = {
  title: 'POC/Surfaces/Card',
  component: Card,
  argTypes: {
    status: {
      control: 'select',
      options: [undefined, 'nominal', 'caution', 'critical', 'info'],
    },
    interactive: { control: 'boolean' },
    padding: {
      control: 'select',
      options: ['none', 'tight', 'default', 'loose'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  args: {
    status: 'nominal',
    interactive: true,
    padding: 'default',
    children: (
      <div>
        <h3>Kepler-186f Dossier</h3>
        <p>Potentially habitable Earth-sized exoplanet orbiting within the habitable zone of Kepler-186.</p>
      </div>
    ),
  },
};
