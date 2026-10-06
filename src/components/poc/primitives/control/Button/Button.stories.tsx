import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './Button';
import { Cluster } from '../../../../interface/layout/Cluster/Cluster';

const meta: Meta<typeof Button> = {
  title: 'POC/Primitives/Control/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'highlight', 'subtle', 'danger'],
    },
    size: {
      control: 'radio',
      options: ['sm', 'md', 'lg'],
    },
    disabled: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Highlight: Story = {
  args: {
    children: 'Confirm Telemetry',
    variant: 'highlight',
    size: 'md',
  },
};

export const Primary: Story = {
  args: {
    children: 'Engage Propulsion',
    variant: 'primary',
    size: 'md',
  },
};

export const Secondary: Story = {
  args: {
    children: 'Calibrate Sensors',
    variant: 'secondary',
    size: 'md',
  },
};

export const Subtle: Story = {
  args: {
    children: 'Dismiss',
    variant: 'subtle',
    size: 'md',
  },
};

export const Danger: Story = {
  args: {
    children: 'Abort Sequence',
    variant: 'danger',
    size: 'md',
  },
};

export const AllVariants: Story = {
  render: () => (
    <Cluster gap="default" align="center">
      <Button variant="highlight">Highlight</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="subtle">Subtle</Button>
      <Button variant="danger">Danger</Button>
      <Button variant="highlight" disabled>
        Disabled
      </Button>
    </Cluster>
  ),
};

