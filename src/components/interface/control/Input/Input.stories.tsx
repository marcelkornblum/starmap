import type { Meta, StoryObj } from '@storybook/react-vite';
import { Input } from './Input';
import { Stack } from '../../layout/Stack/Stack';

const meta: Meta<typeof Input> = {
  title: 'INTERFACE/Control',
  component: Input,
  argTypes: {
    status: {
      control: 'select',
      options: ['nominal', 'critical', 'offline'],
    },
    disabled: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Input>;

export const InputStory: Story = {
  name: 'Input',
  render: (args) => (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ margin: '0 0 0.5rem 0' }}>Input</h2>
        <p style={{ margin: 0, color: '#555', maxWidth: '60ch' }}>
          Text entry field for short-form alphanumeric data. Includes status states for validation feedback.
        </p>
      </div>
      <Stack gap="loose" style={{ maxWidth: '400px' }}>
        <Input {...args} placeholder="Default input..." />
        <Input {...args} defaultValue="Filled value" />
        <Input {...args} placeholder="Error state..." status="error" />
        <Input {...args} placeholder="Disabled input..." disabled />
      </Stack>
    </div>
  ),
};
