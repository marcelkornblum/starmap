import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  resolveMetricComparison,
  resolveMetricGuideEntry,
} from '../../../services/guideService';
import { MetricComparativePanel } from './MetricComparativePanel';
import { Stack } from '../../interface/layouts/Stack/Stack';

import storyStyles from '../domainStories.module.css';

const galacticCoordsEntry = resolveMetricGuideEntry('galactic-coordinates')!;
const galacticCoordsComparison = resolveMetricComparison(
  'galactic-coordinates',
  'tau-ceti',
)!;

const semiMajorAxisEntry = resolveMetricGuideEntry('semi-major-axis')!;
const semiMajorAxisComparison = resolveMetricComparison(
  'semi-major-axis',
  'tau-ceti-e',
)!;

interface MetricComparativePanelStoryArgs {
  metric: 'galactic-coordinates' | 'semi-major-axis';
}

const meta: Meta<MetricComparativePanelStoryArgs> = {
  title: 'DOMAIN/Panels',
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    metric: {
      control: 'select',
      options: ['galactic-coordinates', 'semi-major-axis'],
      description: 'Cartographic metric guide entry and comparative target',
    },
  },
};

export default meta;
type Story = StoryObj<MetricComparativePanelStoryArgs>;

export const MetricComparativePanelStory: Story = {
  name: 'MetricComparativePanel',
  args: {
    metric: 'galactic-coordinates',
  },
  render: (args) => {
    const isSemiMajor = args.metric === 'semi-major-axis';
    const activeEntry = isSemiMajor
      ? semiMajorAxisEntry
      : galacticCoordsEntry;
    const activeComparison = isSemiMajor
      ? semiMajorAxisComparison
      : galacticCoordsComparison;

    return (
      <div className={storyStyles.storyWrapper}>
        <header className={storyStyles.header}>
          <h1 className={storyStyles.title}>MetricComparativePanel</h1>
          <p className={storyStyles.description}>
            Comparative telemetry panel contrasting a target celestial body against standardized baseline metrics.
          </p>
        </header>

        <Stack gap="loose">
          <section className={storyStyles.section}>
            <h2 className={storyStyles.sectionTitle}>
              Interactive Preview ({args.metric})
            </h2>
            <div className={storyStyles.panelContainer}>
              <MetricComparativePanel
                entry={activeEntry}
                comparison={activeComparison}
              />
            </div>
          </section>

          <section className={storyStyles.section}>
            <h2 className={storyStyles.sectionTitle}>
              Galactic Coordinates (Tau Ceti)
            </h2>
            <div className={storyStyles.panelContainer}>
              <MetricComparativePanel
                entry={galacticCoordsEntry}
                comparison={galacticCoordsComparison}
              />
            </div>
          </section>

          <section className={storyStyles.section}>
            <h2 className={storyStyles.sectionTitle}>
              Semi-Major Axis (Tau Ceti e)
            </h2>
            <div className={storyStyles.panelContainer}>
              <MetricComparativePanel
                entry={semiMajorAxisEntry}
                comparison={semiMajorAxisComparison}
              />
            </div>
          </section>
        </Stack>
      </div>
    );
  },
};
