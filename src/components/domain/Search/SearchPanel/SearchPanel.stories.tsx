import type { Meta, StoryObj } from '@storybook/react-vite';
import { SearchPanel } from './SearchPanel';

const meta: Meta<typeof SearchPanel> = {
  title: 'DOMAIN/Search/SearchPanel',
  component: SearchPanel,
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof SearchPanel>;

export const Default: Story = {
  render: () => <SearchPanel scope="galaxy" />,
};
