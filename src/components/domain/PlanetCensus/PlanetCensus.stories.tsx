import type { Meta, StoryObj } from '@storybook/react-vite';
import { PlanetCensus } from './PlanetCensus';
import { Stack } from '../../interface/layouts/Stack/Stack';
import storyStyles from '../domainStories.module.css';

interface PlanetCensusStoryArgs {
  planetCount: number;
  hasHabitableCandidate: boolean;
}

const meta: Meta<PlanetCensusStoryArgs> = {
  title: 'DOMAIN/Data',
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    planetCount: {
      control: { type: 'range', min: 0, max: 12, step: 1 },
    },
    hasHabitableCandidate: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<PlanetCensusStoryArgs>;

export const PlanetCensusStory: Story = {
  name: 'PlanetCensus',
  args: {
    planetCount: 8,
    hasHabitableCandidate: true,
  },
  render: ({ planetCount, hasHabitableCandidate }) => (
    <div className={storyStyles.storyWrapper}>
      <header className={storyStyles.header}>
        <h1 className={storyStyles.title}>PlanetCensus</h1>
        <p className={storyStyles.description}>
          Standardized planetary census summary row with quantity, composition symbol badges, and habitable zone indicators.
        </p>
      </header>
      <Stack gap="loose">
        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>Interactive Preview</h2>
          <div className={storyStyles.previewContainer}>
            <PlanetCensus
              planetCount={planetCount}
              hasHabitableCandidate={hasHabitableCandidate}
              breakdown={
                planetCount > 0
                  ? [
                      { composition: 'terrestrial' as const, count: Math.ceil(planetCount / 2) },
                      { composition: 'gas-giant' as const, count: Math.floor(planetCount / 4) },
                      {
                        composition: 'ice-giant' as const,
                        count: Math.max(0, planetCount - Math.ceil(planetCount / 2) - Math.floor(planetCount / 4)),
                      },
                    ].filter((item) => (item.count ?? 0) > 0)
                  : undefined
              }
            />
          </div>
        </section>

        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>Sol (8 Planets, 3 Categories + Habitable Zone)</h2>
          <div className={storyStyles.previewContainer}>
            <PlanetCensus
              planetCount={8}
              breakdown={[
                { composition: 'terrestrial', count: 4 },
                { composition: 'gas-giant', count: 2 },
                { composition: 'ice-giant', count: 2 },
              ]}
              hasHabitableCandidate
            />
          </div>
        </section>

        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>Tau Ceti (4 Confirmed Super-Earths)</h2>
          <div className={storyStyles.previewContainer}>
            <PlanetCensus
              planetCount={4}
              breakdown={[{ composition: 'super-earth', count: 4 }]}
              hasHabitableCandidate={false}
            />
          </div>
        </section>

        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>TRAPPIST-1 (7 Terrestrial Worlds + Habitable Candidates)</h2>
          <div className={storyStyles.previewContainer}>
            <PlanetCensus
              planetCount={7}
              breakdown={[{ composition: 'terrestrial', count: 7 }]}
              hasHabitableCandidate
            />
          </div>
        </section>

        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>Barren Star (0 Confirmed Planets)</h2>
          <div className={storyStyles.previewContainer}>
            <PlanetCensus planetCount={0} />
          </div>
        </section>
      </Stack>
    </div>
  ),
};
