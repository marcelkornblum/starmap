import type { Meta, StoryObj } from '@storybook/react-vite';
import { GuideExamplesList } from './GuideExamplesList';
import { Stack } from '../../interface/layouts/Stack/Stack';

import storyStyles from '../domainStories.module.css';

const stellarExamples = [
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
];

const planetaryExamples = [
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
];

const meta: Meta<typeof GuideExamplesList> = {
  title: 'DOMAIN/Guide',
  component: GuideExamplesList,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    title: {
      control: 'text',
      description: 'Section heading for the benchmarks list',
    },
  },
};

export default meta;
type Story = StoryObj<typeof GuideExamplesList>;

export const GuideExamplesListStory: Story = {
  name: 'GuideExamplesList',
  args: {
    title: 'Canonical System Benchmarks',
    examples: stellarExamples,
  },
  render: (args) => (
    <div className={storyStyles.storyWrapper}>
      <header className={storyStyles.header}>
        <h1 className={storyStyles.title}>GuideExamplesList</h1>
        <p className={storyStyles.description}>
          Exemplar target body cards linking catalog entities into pedagogical guide entries.
        </p>
      </header>

      <Stack gap="loose">
        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>Interactive Preview</h2>
          <div className={storyStyles.panelContainer}>
            <GuideExamplesList {...args} />
          </div>
        </section>

        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>Planetary Analogs</h2>
          <div className={storyStyles.panelContainer}>
            <GuideExamplesList
              title="Planetary Analogs"
              examples={planetaryExamples}
            />
          </div>
        </section>
      </Stack>
    </div>
  ),
};
