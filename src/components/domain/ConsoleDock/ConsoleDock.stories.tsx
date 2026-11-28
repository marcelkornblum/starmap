import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Stack } from '../../interface';
import storyStyles from '../domainStories.module.css';
import { ConsoleDock } from './ConsoleDock';

const meta: Meta<typeof ConsoleDock> = {
  title: 'DOMAIN/Navigation',
  component: ConsoleDock,
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof ConsoleDock>;

const ConsoleDockDemo = () => {
  const [discoverOpen, setDiscoverOpen] = useState(false);

  return (
    <div className={storyStyles.storyWrapper}>
      <header className={storyStyles.header}>
        <h1 className={storyStyles.title}>ConsoleDock</h1>
        <p className={storyStyles.description}>
          Coplanar primary console navigation shelf on mobile and left rail on tablet/desktop.
        </p>
      </header>
      <Stack gap="loose">
        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>Map Active (Discover Selectable)</h2>
          <div className={storyStyles.previewContainer}>
            <ConsoleDock
              activeItem="map"
              isDiscoverOpen={discoverOpen}
              onSelectDiscover={() => setDiscoverOpen(true)}
              onNavigateItem={() => setDiscoverOpen(false)}
            />
          </div>
        </section>

        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>Guide Active</h2>
          <div className={storyStyles.previewContainer}>
            <ConsoleDock activeItem="guide" />
          </div>
        </section>
      </Stack>
    </div>
  );
};

export const ConsoleDockStory: Story = {
  name: 'ConsoleDock',
  render: () => <ConsoleDockDemo />,
};
