import type { Meta, StoryObj } from '@storybook/react-vite';
import { SearchCategoryFilterSelect } from './SearchCategoryFilterSelect';

const meta: Meta<typeof SearchCategoryFilterSelect> = {
  title: 'DOMAIN/Search/SearchCategoryFilterSelect',
  component: SearchCategoryFilterSelect,
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof SearchCategoryFilterSelect>;

export const Default: Story = {
  render: () => <SearchCategoryFilterSelect />,
};
