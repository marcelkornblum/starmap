import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  resolveMetricComparison,
  resolveMetricGuideEntry,
} from '../../../services/guideService';
import { MetricComparativePanel } from './MetricComparativePanel';

const meta: Meta<typeof MetricComparativePanel> = {
  title: 'Domain/MetricComparativePanel',
  component: MetricComparativePanel,
};

export default meta;
type Story = StoryObj<typeof MetricComparativePanel>;

const galacticCoordsEntry = resolveMetricGuideEntry('galactic-coordinates')!;
const galacticCoordsComparison = resolveMetricComparison('galactic-coordinates', 'tau-ceti')!;

export const GalacticCoordinatesTauCeti: Story = {
  args: {
    entry: galacticCoordsEntry,
    comparison: galacticCoordsComparison,
  },
};

const semiMajorAxisEntry = resolveMetricGuideEntry('semi-major-axis')!;
const semiMajorAxisComparison = resolveMetricComparison('semi-major-axis', 'tau-ceti-e')!;

export const SemiMajorAxisTauCetiE: Story = {
  args: {
    entry: semiMajorAxisEntry,
    comparison: semiMajorAxisComparison,
  },
};
