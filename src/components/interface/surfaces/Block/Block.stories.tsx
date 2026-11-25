import type { Meta, StoryObj } from '@storybook/react-vite';
import { Block } from './Block';
import { Stack } from '../../layouts/Stack/Stack';
import { Cluster } from '../../layouts/Cluster/Cluster';
import storyStyles from '../surfaceStories.module.css';

const meta: Meta<typeof Block> = {
  title: 'INTERFACE/Surfaces',
  component: Block,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    as: {
      control: 'select',
      options: ['div', 'li', 'article', 'section'],
    },
    interactive: { control: 'boolean' },
    selected: { control: 'boolean' },
    tone: {
      control: 'select',
      options: [undefined, 'default', 'sub'],
    },
    status: {
      control: 'select',
      options: [undefined, 'nominal', 'caution', 'critical', 'info', 'neutral'],
    },
    padding: {
      control: 'select',
      options: ['none', 'tight', 'default', 'loose'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Block>;

export const BlockStory: Story = {
  name: 'Block',
  args: {
    as: 'div',
    interactive: true,
    selected: false,
    tone: 'default',
    padding: 'default',
    children: 'TRAPPIST-1e: Temperate terrestrial exoplanet orbiting an ultra-cool dwarf star.',
  },
  render: (args) => (
    <div className={storyStyles.storyWrapper}>
      <header className={storyStyles.header}>
        <h1 className={storyStyles.title}>Block</h1>
        <p className={storyStyles.description}>
          Borderless nested cushion surface primitive for grouping telemetry rows, interactive list entries, and sub-blocks inside frosted panels.
        </p>
      </header>
      <Stack gap="loose">
        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>Interactive Preview</h2>
          <Block {...args} />
        </section>
        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>Interaction & Tone States</h2>
          <Stack gap="dense">
            <Block>Default cushion block</Block>
            <Block interactive>Interactive block (hover to preview)</Block>
            <Block interactive selected>Selected block</Block>
            <Block tone="sub">Sub-block nested tone (tone=&quot;sub&quot;)</Block>
          </Stack>
        </section>
        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>Polymorphic List Items (as=&quot;li&quot;)</h2>
          <Stack as="ul" gap="dense">
            <Block as="li" interactive>
              Proxima Centauri b — 1.30 pc
            </Block>
            <Block as="li" interactive selected>
              TRAPPIST-1 d — 12.43 pc
            </Block>
            <Block as="li" tone="sub">
              Uncatalogued orbital fragment
            </Block>
          </Stack>
        </section>
        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>Padding Variants</h2>
          <Cluster gap="dense">
            <Block padding="none">None</Block>
            <Block padding="tight">Tight</Block>
            <Block padding="default">Default</Block>
            <Block padding="loose">Loose</Block>
          </Cluster>
        </section>
        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>Status Tints</h2>
          <Stack gap="dense">
            <Block status="nominal">Nominal: Ephemeris solution locked</Block>
            <Block status="info">Info: Transit spectroscopy scheduled</Block>
            <Block status="caution">Caution: High orbital eccentricity</Block>
            <Block status="critical">Critical: Tidal disruption threshold</Block>
            <Block status="neutral">Neutral: Archived baseline measurement</Block>
          </Stack>
        </section>
      </Stack>
    </div>
  ),
};
