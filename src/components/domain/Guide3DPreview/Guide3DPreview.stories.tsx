import type { Meta, StoryObj } from '@storybook/react-vite';
import { Guide3DPreview } from './Guide3DPreview';

const meta: Meta<typeof Guide3DPreview> = {
  title: 'Domain/Guide3DPreview',
  component: Guide3DPreview,
};

export default meta;
type Story = StoryObj<typeof Guide3DPreview>;

export const StarPreviewG2V: Story = {
  args: {
    kind: 'star',
    spectralClass: 'G2V',
    spectralLetter: 'G',
    luminosityClass: 'V',
    radiusRsun: 1.0,
    tempK: 5778,
    chromaticityHex: '#fff4ea',
    isDetail: true,
  },
};

export const StarPreviewOType: Story = {
  args: {
    kind: 'star',
    spectralClass: 'O',
    spectralLetter: 'O',
    luminosityClass: 'V',
    radiusRsun: 10.0,
    tempK: 33000,
    chromaticityHex: '#9bb0ff',
    isDetail: true,
  },
};

export const PlanetPreviewGasGiant: Story = {
  args: {
    kind: 'planet',
    composition: 'Gas Giant',
    radiusRearth: 11.2,
    textureTheme: 'amber-cloud-bands',
    isDetail: true,
  },
};

export const MetricComparisonPreview: Story = {
  args: {
    kind: 'metric',
    metricId: 'semi-major-axis',
    unit: 'AU',
    baselineName: 'Earth',
    baselineValue: '1.0 AU',
    comparisonTarget: 'tau-ceti-e',
    targetName: 'Tau Ceti e',
    targetValue: '0.55 AU',
    isDetail: true,
  },
};
