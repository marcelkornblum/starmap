import type { Meta, StoryObj } from '@storybook/react-vite';
import { Tooltip } from './Tooltip';
import { Button, Box } from '../../primitives';

const meta: Meta<typeof Tooltip> = {
  title: 'POC/Overlays/Tooltip',
  component: Tooltip,
  argTypes: {
    position: {
      control: 'select',
      options: ['top', 'bottom', 'left', 'right'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Tooltip>;

export const Default: Story = {
  render: (args) => (
    <Box padding="loose">
      <Tooltip {...args}>
        <Button variant="secondary">Hover Or Focus Me</Button>
      </Tooltip>
    </Box>
  ),
  args: {
    text: 'Right Ascension: 14h 29m 42.95s',
    position: 'top',
  },
};
