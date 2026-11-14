import type { Meta, StoryObj } from '@storybook/react-vite';
import { SearchRoot } from './SearchRoot';

const meta: Meta<typeof SearchRoot> = {
  title: 'DOMAIN/Search/SearchRoot',
  component: SearchRoot,
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof SearchRoot>;

export const Default: Story = {
  render: () => (
    <SearchRoot syncUrl={false} initialQuery="">
      <p>Search Root Content</p>
    </SearchRoot>
  ),
};
