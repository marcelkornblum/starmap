import type { Meta, StoryObj } from '@storybook/react-vite';
import { Slider } from './Slider';
import { Stack } from '../../layout/Stack/Stack';

const meta: Meta<typeof Slider> = {
  title: 'INTERFACE/Control',
  component: Slider,
  argTypes: {
    disabled: { control: 'boolean' },
    min: { control: 'number' },
    max: { control: 'number' },
    step: { control: 'number' },
  },
};

export default meta;
type Story = StoryObj<typeof Slider>;

export const SliderStory: Story = {
  name: 'Slider',
  render: (args) => (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ margin: '0 0 0.5rem 0' }}>Slider</h2>
        <p style={{ margin: 0, color: '#555', maxWidth: '60ch' }}>
          Range input for selecting continuous analog values. Highly visible track and thumb designed for touch and cursor interaction.
        </p>
      </div>
      <Stack gap="loose" style={{ maxWidth: '400px' }}>
        <Slider {...args} value={50} onChange={() => {}} min={0} max={100} />
        <Slider {...args} value={25} onChange={() => {}} disabled min={0} max={100} />
      </Stack>
    </div>
  ),
};
