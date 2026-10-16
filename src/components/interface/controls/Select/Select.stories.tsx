import type { Meta, StoryObj } from '@storybook/react-vite';
import { Select } from './Select';
import { Stack } from '../../layouts/Stack/Stack';

const meta: Meta<typeof Select> = {
  title: 'INTERFACE/Controls',
  component: Select,
  argTypes: {
    disabled: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Select>;

export const SelectStory: Story = {
  name: 'Select',
  render: (args) => (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem', height: '100dvh', overflowY: 'auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ margin: '0 0 0.5rem 0' }}>Select</h2>
        <p style={{ margin: 0, color: '#555', maxWidth: '60ch' }}>
          Native dropdown for picking from a constrained list of options. Styled to match the system aesthetic while retaining native device select mechanics.
        </p>
      </div>
      <Stack gap="loose" style={{ maxWidth: '400px' }}>
        <Select 
          {...args} 
          value="opt1" 
          onChange={() => {}} 
          options={[
            { value: 'opt1', label: 'Option 1' },
            { value: 'opt2', label: 'Option 2' }
          ]} 
        />
        <Select 
          {...args} 
          disabled 
          value="opt1" 
          onChange={() => {}} 
          options={[
            { value: 'opt1', label: 'Disabled Option' }
          ]} 
        />
      </Stack>
    </div>
  ),
};
