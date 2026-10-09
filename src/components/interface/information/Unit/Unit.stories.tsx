import type { Meta, StoryObj } from '@storybook/react-vite';
import { Unit } from './Unit';
import { Stack } from '../../layouts/Stack/Stack';
import { Cluster } from '../../layouts/Cluster/Cluster';

import storyStyles from '../informationStories.module.css';

const meta = {
  title: 'INTERFACE/Information',
  component: Unit,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    children: {
      control: 'text',
      description: 'The unit symbol or string (e.g. AU, km/s, ly, M☉)',
    },
    inParens: {
      control: 'boolean',
      description: 'Whether to enclose the unit in parentheses',
    },
  },
  args: {
    children: 'AU',
    inParens: false,
  },
} satisfies Meta<typeof Unit>;

export default meta;
type Story = StoryObj<typeof meta>;

export const UnitStory: Story = {
  name: 'Unit',
  render: (args) => (
    <div className={storyStyles.storyWrapper}>
      <header className={storyStyles.header}>
        <h1 className={storyStyles.title}>Unit</h1>
        <p className={storyStyles.description}>
          Astronomical unit of measurement with optical sizing and punctuation control.
        </p>
      </header>
      <Stack gap="loose">
        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>Interactive Preview</h2>
          <div>
            <Unit {...args} />
          </div>
        </section>
        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>In Parentheses</h2>
          <div>
            <Unit inParens>AU</Unit>
          </div>
        </section>
        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>Common Astronomical Units</h2>
          <Stack gap="dense">
            <Cluster gap="dense" align="baseline">
              <span>Distance: 8.12</span>
              <Unit>kpc</Unit>
            </Cluster>
            <Cluster gap="dense" align="baseline">
              <span>Velocity: -220.4</span>
              <Unit>km/s</Unit>
            </Cluster>
            <Cluster gap="dense" align="baseline">
              <span>Mass: 1.04</span>
              <Unit>M☉</Unit>
            </Cluster>
            <Cluster gap="dense" align="baseline">
              <span>Radius: 1.17</span>
              <Unit>R⊕</Unit>
            </Cluster>
            <Cluster gap="dense" align="baseline">
              <span>Parallax: 768.87</span>
              <Unit>mas</Unit>
            </Cluster>
          </Stack>
        </section>
      </Stack>
    </div>
  ),
};
