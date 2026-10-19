import type { Meta, StoryObj } from '@storybook/react-vite';
import { GuideExamplesList } from './GuideExamplesList';

const meta: Meta<typeof GuideExamplesList> = {
  title: 'Domain/GuideExamplesList',
  component: GuideExamplesList,
};

export default meta;
type Story = StoryObj<typeof GuideExamplesList>;

export const Default: Story = {
  args: {
    examples: [
      {
        name: 'Sol',
        href: '/system/sol',
        note: 'Canonical G2V yellow dwarf host star of humanity.',
      },
      {
        name: 'Tau Ceti',
        href: '/system/tau-ceti',
        note: 'G8.5V dwarf anchor at 3.65 pc.',
      },
    ],
  },
};

export const CustomTitle: Story = {
  args: {
    title: 'Planetary Analogs',
    examples: [
      {
        name: 'Earth',
        href: '/planet/earth',
        note: 'Canonical terrestrial reference world (1.0 R⊕).',
      },
      {
        name: 'Tau Ceti e',
        href: '/planet/tau-ceti-e',
        note: 'Potentially habitable super-Earth in habitable zone.',
      },
    ],
  },
};
