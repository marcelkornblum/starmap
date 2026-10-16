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
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const ButtonStory: Story = {
  name: 'Button',
  render: (args) => (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem', height: '100dvh', overflowY: 'auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ margin: '0 0 0.5rem 0' }}>Button</h2>
        <p style={{ margin: 0, color: '#555', maxWidth: '60ch' }}>
          The primary interaction trigger. Available in various semantic variants and sizes. Used to initiate actions, submit forms, or navigate.
        </p>
      </div>
      <Stack gap="loose">
        <Cluster gap="default" align="center">
          <Button {...args}>Default</Button>
          <Button {...args} variant="primary">Primary</Button>
          <Button {...args} variant="subtle">Subtle</Button>
          <Button {...args} variant="danger">Danger</Button>
        </Cluster>
        <Cluster gap="default" align="center">
          <Button {...args} disabled>Default</Button>
          <Button {...args} variant="primary" disabled>Primary</Button>
          <Button {...args} variant="subtle" disabled>Subtle</Button>
          <Button {...args} variant="danger" disabled>Danger</Button>
        </Cluster>
      </Stack>
    </div>
  ),
};
