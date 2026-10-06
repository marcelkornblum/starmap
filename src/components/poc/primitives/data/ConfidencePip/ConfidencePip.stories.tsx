import type { Meta, StoryObj } from '@storybook/react';
import { ConfidencePip } from './ConfidencePip';
import { Cluster } from '../../../../interface/layout/Cluster/Cluster';
import { Stack } from '../../../../interface/layout/Stack/Stack';
import styles from './ConfidencePip.stories.module.css';

const meta = {
  title: 'POC/Primitives/Data/ConfidencePip',
  component: ConfidencePip,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    confidence: {
      control: { type: 'select' },
      options: ['confirmed', 'candidate', 'theoretical', 'projected', 'unverified', 'high', 'medium', 'low'],
      description: 'Observational confidence level',
    },
    size: {
      control: { type: 'inline-radio' },
      options: ['sm', 'md', 'lg'],
      description: 'Pip dot size',
    },
    tooltipPosition: {
      control: { type: 'select' },
      options: ['top', 'bottom', 'left', 'right'],
      description: 'Tooltip placement relative to pip',
    },
    defaultOpen: {
      control: 'boolean',
      description: 'Whether tooltip is open initially',
    },
  },
  args: {
    confidence: 'confirmed',
    size: 'md',
    tooltipPosition: 'top',
    defaultOpen: false,
  },
} satisfies Meta<typeof ConfidencePip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    confidence: 'confirmed',
  },
};

export const OpenTooltip: Story = {
  args: {
    confidence: 'confirmed',
    defaultOpen: true,
    details: '99.94% Gaia DR3 astrometric lock',
  },
};

export const AllLevels: Story = {
  render: () => (
    <Stack gap="default">
      <Cluster gap="loose" align="center">
        <span>Confirmed:</span>
        <ConfidencePip confidence="confirmed" defaultOpen />
      </Cluster>
      <Cluster gap="loose" align="center">
        <span>Candidate:</span>
        <ConfidencePip confidence="candidate" defaultOpen />
      </Cluster>
      <Cluster gap="loose" align="center">
        <span>Theoretical:</span>
        <ConfidencePip confidence="theoretical" defaultOpen />
      </Cluster>
      <Cluster gap="loose" align="center">
        <span>Unverified:</span>
        <ConfidencePip confidence="unverified" defaultOpen />
      </Cluster>
    </Stack>
  ),
};

export const InTypographicRow: Story = {
  render: () => (
    <Stack gap="dense">
      <Cluster gap="dense" align="center">
        <span>Kepler-452b (Cygnus arm Earth analogue)</span>
        <ConfidencePip confidence="confirmed" />
      </Cluster>
      <Cluster gap="dense" align="center">
        <span>Proxima Centauri d (Sub-Earth transit candidate)</span>
        <ConfidencePip confidence="candidate" />
      </Cluster>
      <Cluster gap="dense" align="center">
        <span>Gliese 581 g (Habitable zone theoretical candidate)</span>
        <ConfidencePip confidence="theoretical" />
      </Cluster>
      <Cluster gap="dense" align="center">
        <span>KIC 8462852 (Anomalous unverified flux dips)</span>
        <ConfidencePip confidence="unverified" />
      </Cluster>
    </Stack>
  ),
};

export const EdgeAvoidance: Story = {
  parameters: {
    layout: 'fullscreen',
  },
  render: () => (
    <div className={styles.edgeAvoidanceContainer}>
      <div className={styles.topLeft}>
        <Cluster gap="dense" align="center">
          <span>Top-Left Boundary</span>
          <ConfidencePip confidence="confirmed" defaultOpen tooltipPosition="top" />
        </Cluster>
      </div>

      <div className={styles.topRight}>
        <Cluster gap="dense" align="center">
          <span>Top-Right Boundary</span>
          <ConfidencePip confidence="candidate" defaultOpen tooltipPosition="top" />
        </Cluster>
      </div>

      <div className={styles.bottomLeft}>
        <Cluster gap="dense" align="center">
          <span>Bottom-Left Boundary</span>
          <ConfidencePip confidence="theoretical" defaultOpen tooltipPosition="bottom" />
        </Cluster>
      </div>

      <div className={styles.bottomRight}>
        <Cluster gap="dense" align="center">
          <span>Bottom-Right Boundary</span>
          <ConfidencePip confidence="confirmed" defaultOpen tooltipPosition="bottom" />
        </Cluster>
      </div>

      <div className={styles.center}>
        <Cluster gap="dense" align="center">
          <span>Viewport Center</span>
          <ConfidencePip confidence="confirmed" defaultOpen tooltipPosition="top" details="ICRS Frame Locked" />
        </Cluster>
      </div>
    </div>
  ),
};
