import type { Meta, StoryObj } from '@storybook/react-vite';
import { Cover } from './Cover';
import { Box } from '../Box/Box';

const meta: Meta<typeof Cover> = {
  title: 'INTERFACE/Layout',
  component: Cover,
  argTypes: {
    minHeight: {
      control: 'radio',
      options: ['viewport', 'full'],
    },
    gap: {
      control: 'select',
      options: ['none', 'tight', 'default', 'loose'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Cover>;

export const Default: Story = {
  name: 'Cover',
  args: {
    minHeight: 'viewport',
    header: <Box as="header" padding="tight" border="subtle" background="dock">Starmap Header</Box>,
    children: (
      <Box padding="loose">
        <h2>Principal Mission Briefing</h2>
        <p>Centred vertically regardless of viewport dimension.</p>
      </Box>
    ),
    footer: <Box as="footer" padding="tight" border="subtle" background="dock">Telemetry Footer</Box>,
  },
};
