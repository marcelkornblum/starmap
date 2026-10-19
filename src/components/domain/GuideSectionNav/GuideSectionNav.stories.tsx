import type { Meta, StoryObj } from '@storybook/react-vite';
import { GuideSectionNav } from './GuideSectionNav';

const meta: Meta<typeof GuideSectionNav> = {
  title: 'Domain/GuideSectionNav',
  component: GuideSectionNav,
};

export default meta;
type Story = StoryObj<typeof GuideSectionNav>;

export const StarTypesActive: Story = {
  args: {
    currentSection: 'star-types',
  },
};

export const PlanetTypesActive: Story = {
  args: {
    currentSection: 'planet-types',
  },
};

export const MetricsActive: Story = {
  args: {
    currentSection: 'metrics',
  },
};
