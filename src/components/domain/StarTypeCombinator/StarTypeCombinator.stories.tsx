import type { Meta, StoryObj } from '@storybook/react-vite';
import { StarTypeCombinator } from './StarTypeCombinator';

const meta: Meta<typeof StarTypeCombinator> = {
  title: 'Domain/StarTypeCombinator',
  component: StarTypeCombinator,
};

export default meta;
type Story = StoryObj<typeof StarTypeCombinator>;

export const SolarG2V: Story = {
  args: {
    initialClass: 'G',
    initialSubdivision: '2',
    initialLuminosity: 'V',
  },
};

export const RedDwarfM5V: Story = {
  args: {
    initialClass: 'M',
    initialSubdivision: '5',
    initialLuminosity: 'V',
  },
};

export const BlueSupergiantB0I: Story = {
  args: {
    initialClass: 'B',
    initialSubdivision: '0',
    initialLuminosity: 'I',
  },
};
