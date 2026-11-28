import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './Button';
import { Cluster } from '../../layouts/Cluster/Cluster';
import { Stack } from '../../layouts/Stack/Stack';

const meta: Meta<typeof Button> = {
  title: 'INTERFACE/Controls',
  component: Button,
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'subtle', 'danger', 'default'],
    },
    size: {
      control: 'radio',
      options: ['sm', 'md', 'lg'],
    },
    disabled: { control: 'boolean' },
    selected: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const ButtonStory: Story = {
  name: 'Button',
  render: (args) => (
    <Stack gap="loose">
      <Stack gap="dense">
        <h2>Button</h2>
        <p>
          The primary interaction trigger. Available in distinct semantic roles and sizes: Default, Primary CTA, Subtle, Selected, Danger, and Disabled.
        </p>
      </Stack>
      <Cluster gap="default" align="center">
        <Button {...args}>Default</Button>
        <Button {...args} variant="primary">Primary CTA</Button>
        <Button {...args} variant="subtle">Subtle</Button>
        <Button {...args} variant="subtle" selected>Selected</Button>
        <Button {...args} variant="danger">Danger</Button>
        <Button {...args} disabled>Disabled</Button>
      </Cluster>
      <Cluster gap="default" align="center">
        <Button {...args} disabled>Default (Disabled)</Button>
        <Button {...args} variant="primary" disabled>Primary (Disabled)</Button>
        <Button {...args} variant="subtle" disabled>Subtle (Disabled)</Button>
        <Button {...args} variant="danger" disabled>Danger (Disabled)</Button>
      </Cluster>
    </Stack>
  ),
};

export const SemanticRoles: Story = {
  render: () => (
    <Cluster gap="default" align="center">
      <Button>Default</Button>
      <Button variant="primary">Primary CTA</Button>
      <Button variant="subtle">Subtle</Button>
      <Button variant="subtle" selected>Selected</Button>
      <Button variant="danger">Danger</Button>
      <Button disabled>Disabled</Button>
    </Cluster>
  ),
};

export const Selected: Story = {
  render: () => (
    <Stack gap="default">
      <Cluster gap="default" align="center">
        <Button variant="subtle">Map</Button>
        <Button variant="subtle" selected>
          Discover
        </Button>
        <Button variant="subtle">Guide</Button>
      </Cluster>
      <Cluster gap="default" align="center">
        <Button href="/guide" variant="subtle" selected>
          Selected Link
        </Button>
        <Button href="/guide" variant="subtle" disabled>
          Disabled Link
        </Button>
      </Cluster>
    </Stack>
  ),
};
