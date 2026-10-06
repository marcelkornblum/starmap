import type { Meta, StoryObj } from '@storybook/react-vite';
import { Panel } from './Panel';

const meta: Meta<typeof Panel> = {
  title: 'Surfaces/Panel',
  component: Panel,
};

export default meta;
type Story = StoryObj<typeof Panel>;

export const Default: Story = {
  args: {
    header: 'Orion Sector Navigation',
    footer: 'Ready for astrometric synchronization',
    children: (
      <div>
        <p>Telemetry stream synchronized with Gaia DR3 star catalog.</p>
      </div>
    ),
  },
};
