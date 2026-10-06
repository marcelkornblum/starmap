import type { Meta, StoryObj } from '@storybook/react-vite';
import { Popover } from './Popover';
import { Button, Box } from '../../primitives';

const meta: Meta<typeof Popover> = {
  title: 'POC/Overlays/Popover',
  component: Popover,
  argTypes: {
    position: {
      control: 'select',
      options: ['top', 'bottom', 'left', 'right'],
    },
    isOpen: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Popover>;

export const Default: Story = {
  render: (args) => (
    <Box padding="loose">
      <Popover
        trigger={<Button variant="default">Target Anchor</Button>}
        {...args}
      >
        <div>Spectral type M2V details and stellar metallicity index.</div>
      </Popover>
    </Box>
  ),
  args: {
    isOpen: true,
    position: 'bottom',
  },
};
