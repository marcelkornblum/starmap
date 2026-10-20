import type { Meta, StoryObj } from '@storybook/react-vite';
import type { BreadcrumbItem } from './Breadcrumbs';
import { Breadcrumbs } from './Breadcrumbs';
import { Stack } from '../../interface/layouts/Stack/Stack';

import storyStyles from '../domainStories.module.css';

const PRESETS: Record<string, readonly BreadcrumbItem[]> = {
  galaxy: [{ label: 'Milky Way', href: '/galaxy' }],
  system: [
    { label: 'Milky Way', href: '/galaxy' },
    { label: 'Sol', href: '/system/sol' },
  ],
  planet: [
    { label: 'Milky Way', href: '/galaxy' },
    { label: 'Sol', href: '/system/sol' },
    { label: 'Earth' },
  ],
  search: [
    { label: 'Milky Way', href: '/galaxy' },
    { label: 'Search Results' },
  ],
  guide: [
    { label: 'Milky Way', href: '/galaxy' },
    { label: 'Guides', href: '/guide' },
    { label: 'Cartographic Conventions' },
  ],
};

interface BreadcrumbsStoryArgs {
  preset: 'galaxy' | 'system' | 'planet' | 'search' | 'guide';
  showCompanion: boolean;
}

const meta: Meta<BreadcrumbsStoryArgs> = {
  title: 'DOMAIN/Navigation',
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    preset: {
      control: 'select',
      options: ['galaxy', 'system', 'planet', 'search', 'guide'],
      description: 'Hierarchy depth preset',
    },
    showCompanion: {
      control: 'boolean',
      description: 'Display persistent companion button (Guide / Map)',
    },
  },
};

export default meta;
type Story = StoryObj<BreadcrumbsStoryArgs>;

export const BreadcrumbsStory: Story = {
  name: 'Breadcrumbs',
  args: {
    preset: 'planet',
    showCompanion: true,
  },
  render: (args) => {
    const activeItems = PRESETS[args.preset] ?? PRESETS.planet;

    return (
      <div className={storyStyles.storyWrapper}>
        <header className={storyStyles.header}>
          <h1 className={storyStyles.title}>Breadcrumbs</h1>
          <p className={storyStyles.description}>
            Top-anchored breadcrumb navigation tracking spatial context alongside a persistent guide/map companion action.
          </p>
        </header>

        <Stack gap="loose">
          <section className={storyStyles.section}>
            <h2 className={storyStyles.sectionTitle}>
              Interactive Preview ({args.preset})
            </h2>
            <div className={storyStyles.previewContainer}>
              <Breadcrumbs
                items={activeItems}
                companionHref={args.showCompanion ? '/guide' : undefined}
                companionLabel={args.showCompanion ? 'Guide' : undefined}
              />
            </div>
          </section>

          <section className={storyStyles.section}>
            <h2 className={storyStyles.sectionTitle}>Galaxy Level</h2>
            <div className={storyStyles.previewContainer}>
              <Breadcrumbs
                items={PRESETS.galaxy}
                companionHref="/guide"
                companionLabel="Guide"
              />
            </div>
          </section>

          <section className={storyStyles.section}>
            <h2 className={storyStyles.sectionTitle}>System Level</h2>
            <div className={storyStyles.previewContainer}>
              <Breadcrumbs
                items={PRESETS.system}
                companionHref="/guide"
                companionLabel="Guide"
              />
            </div>
          </section>

          <section className={storyStyles.section}>
            <h2 className={storyStyles.sectionTitle}>Planet Level</h2>
            <div className={storyStyles.previewContainer}>
              <Breadcrumbs
                items={PRESETS.planet}
                companionHref="/guide"
                companionLabel="Guide"
              />
            </div>
          </section>
        </Stack>
      </div>
    );
  },
};
