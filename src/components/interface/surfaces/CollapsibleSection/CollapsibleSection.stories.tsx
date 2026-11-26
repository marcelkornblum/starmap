import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from '../../information/Badge/Badge';
import { Stack } from '../../layouts/Stack/Stack';
import { Block } from '../Block/Block';
import storyStyles from '../surfaceStories.module.css';
import { CollapsibleSection } from './CollapsibleSection';

const meta: Meta<typeof CollapsibleSection> = {
  title: 'INTERFACE/Surfaces',
  component: CollapsibleSection,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    headingAs: {
      control: 'select',
      options: ['h2', 'h3', 'h4'],
    },
    defaultOpen: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof CollapsibleSection>;

export const CollapsibleSectionStory: Story = {
  name: 'CollapsibleSection',
  args: {
    title: 'Telemetry',
    headingId: 'story-collapsible-telemetry',
    headingAs: 'h4',
    defaultOpen: true,
  },
  render: (args) => (
    <div className={storyStyles.storyWrapper}>
      <header className={storyStyles.header}>
        <h1 className={storyStyles.title}>CollapsibleSection</h1>
        <p className={storyStyles.description}>
          Accessible disclosure section with eyebrow heading trigger, animated chevron, and optional trailing header actions.
        </p>
      </header>
      <Stack gap="loose">
        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>Expanded by Default</h2>
          <CollapsibleSection {...args}>
            <Block padding="tight">Semi-Major Axis: 1.000 AU</Block>
          </CollapsibleSection>
        </section>
        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>Collapsed by Default</h2>
          <CollapsibleSection
            title="Environmental Hazards"
            headingId="story-collapsible-collapsed"
            defaultOpen={false}
          >
            <Block padding="tight" status="caution">
              High UV irradiance near periastron.
            </Block>
          </CollapsibleSection>
        </section>
        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>With Trailing Actions</h2>
          <CollapsibleSection
            title="Canon Layers"
            headingId="story-collapsible-actions"
            actions={<Badge status="info">2 Layers</Badge>}
          >
            <Block padding="tight">Project Hail Mary · Tau Ceti</Block>
          </CollapsibleSection>
        </section>
      </Stack>
    </div>
  ),
};
