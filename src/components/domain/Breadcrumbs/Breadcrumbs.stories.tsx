import type { Meta, StoryObj } from '@storybook/react-vite';
import { Breadcrumbs } from './Breadcrumbs';

const meta: Meta<typeof Breadcrumbs> = {
  title: 'Domain/Breadcrumbs',
  component: Breadcrumbs,
};

export default meta;
type Story = StoryObj<typeof Breadcrumbs>;

export const GalaxyScope: Story = {
  args: {
    items: [
      { label: 'Milky Way', href: '/galaxy' },
    ],
  },
};

export const SystemScope: Story = {
  args: {
    items: [
      { label: 'Milky Way', href: '/galaxy' },
      { label: 'Sol', href: '/system/sol' },
    ],
  },
};

export const PlanetScope: Story = {
  args: {
    items: [
      { label: 'Milky Way', href: '/galaxy' },
      { label: 'Sol', href: '/system/sol' },
      { label: 'Earth' },
    ],
  },
};

export const SearchScope: Story = {
  args: {
    items: [
      { label: 'Milky Way', href: '/galaxy' },
      { label: 'Search Results' },
    ],
  },
};

export const GuideScope: Story = {
  args: {
    items: [
      { label: 'Milky Way', href: '/galaxy' },
      { label: 'Guides', href: '/guide' },
      { label: 'Cartographic Conventions' },
    ],
  },
};
